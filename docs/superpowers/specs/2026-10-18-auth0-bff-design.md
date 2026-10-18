# Auth0 を上流とする viewer の BFF 化

作成日：2026-10-18

## 背景

viewer は `@auth0/auth0-spa-js` によるブラウザ完結の認証を使っている（`packages/viewer/contexts/Auth0.tsx`）。
Auth0 の接続は Google のみで、カスタムドメイン `auth.shisetsudb.com` を経由する。
この構成には、利用者から見て三つの不満がある。

- **すぐログアウトされる**：refresh token はメモリにしか置かれず、リロードで消える。その後は `useRefreshTokensFallback` による iframe の silent auth に頼るため、Auth0 のセッション Cookie が切れた時点でログアウトする
- **ログイン画面までの手数が多い**：Universal Login の画面、Google の画面、`/waiting` を経て元のページに戻る
- **読み込み時のちらつき**：SDK の動的 import と `checkSession` が終わるまで `isLoading` が続き、ヘッダーが一瞬未ログインの表示になる

PR #1674 は、Google を直接の上流とする自前 IdP と BFF によってこれを解決しようとした。
しかしその設計は D1 に email を含む `users` テーブルを持つ。
個人情報は自前で持たず Auth0 に隔離しておく方針と両立しないため、本書はその設計を置き換える。

本書の方針は、IdP として Auth0 を使い続け、viewer Worker を BFF にすることである。
BFF の骨格（同一オリジンの `/auth/*` と `/api/*`、転送のホワイトリスト、`__Host-` Cookie）は #1674 から引き継ぐ。
上流の OAuth クライアントとセッションの保存方法が異なる。

## 個人情報の置き場所

**D1 にはユーザーに関する行を一切置かない。**
ロールとトライアルは、現在と同じく Auth0 の Actions がアクセストークンのカスタムクレーム（`https://app.shisetsudb.com/token/claims`）として付与する。
セッションは暗号化した Cookie に入れ、サーバ側に保存しない。

この結果、こちらが保持するのは利用者のブラウザにある Cookie だけになる。
Cookie の中身は Auth0 が発行したトークンであり、email や氏名は含まない。

ステートレスにしたことには副次的な利点がある。
セッション参照のために D1 を引かないので、無料枠で最も厳しい制約である D1 の rows read を増やさない。

代わりに、サーバ側でセッションを即時に失効させる手段を失う。
失効は Auth0 側で refresh token を revoke することで行う（後述）。
既に発行されたアクセストークンは寿命が切れるまで有効だが、このアプリでは予約状況の閲覧権限しか伴わないため許容する。

## 全体構成

```
ブラウザ ──同一オリジン──> viewer Worker (BFF)
   │  __Host-session（AES-GCM で暗号化。HttpOnly, Secure, SameSite=Lax, Path=/）
   │
   ├─ /auth/login     → auth.shisetsudb.com/authorize へ 302（connection=google-oauth2）
   ├─ /auth/callback  → code 交換 → __Host-session 発行 → 元のパスへ 302
   ├─ /auth/logout    → refresh token を revoke → Cookie 失効 → Auth0 の /v2/logout へ 302
   ├─ /auth/me        → { authenticated, anonymous, trial }
   └─ /api/*          → 必要なら refresh → Service Binding で api へ
                        Authorization: Bearer <Auth0 のアクセストークン>
   その他             → 静的アセット（Worker を経由しない）

api Worker:        変更なし
mcp-server Worker: 変更なし
D1:                変更なし
```

`assets.run_worker_first` に `["/auth/*", "/api/*"]` を指定し、この二つのパスだけ Worker を先に走らせる。

api が受け取るのは、今と同じ Auth0 のアクセストークンである。
送り元がブラウザから viewer Worker に変わるだけなので、api の検証コード（`packages/api/src/auth/auth0.ts`）は変更しない。
#1674 が必要としていた issuer の併存、署名鍵の管理、mcp-server の認可サーバ自前化は、いずれも不要になる。

## Auth0 側の構成

viewer 用に **Regular Web Application** を新規に作る。
現在の SPA 用 Application は public client であり、client secret を使えないためである。

| 項目 | 値 |
|---|---|
| Allowed Callback URLs | `https://app.shisetsudb.com/auth/callback`、`http://localhost:3000/auth/callback`、`https://*-shisetsu-viewer.trfv-dev.workers.dev/auth/callback` |
| Allowed Logout URLs | `https://app.shisetsudb.com/`、`http://localhost:3000/`、`https://*-shisetsu-viewer.trfv-dev.workers.dev/` |
| Connections | `google-oauth2` のみ |
| Grant Types | Authorization Code、Refresh Token |
| Refresh Token Rotation | 無効 |
| Refresh Token Expiration | Idle 30 日、Maximum 365 日 |

Post Login の Actions は、`client_id` で絞り込んでいなければ全ての Application で動く。
その場合、ロールとトライアルのクレームは新しい Application にもそのまま付く（未検証事項に挙げる）。

プレビューデプロイ（`<ブランチ名 or 版 ID>-shisetsu-viewer.trfv-dev.workers.dev`）も、同じ Application に URL を足してログインできるようにしている。
redirect_uri はリクエストのオリジンから組み立てるので、Worker 側の変更は要らない。
ワイルドカードの前後を固定し、同じサブドメインにある api と mcp-server の Worker を対象から外している。
認可コードが漏れても、PKCE の verifier と client secret が無ければ交換できない。
別の Application に分ける方法は採らない。Secret は Worker 単位で版ごとに変えられないため、host を見て client を切り替えるコードが要るからである。

### refresh token rotation を無効にする理由

ページは複数の `/api/*` を並行に呼ぶ。
アクセストークンが切れた直後には、それぞれのリクエストが同じ refresh token で refresh を試みる。
rotation が有効だと、2 本目のリクエストが使った refresh token は「使用済み」と判定され、reuse 検知によってトークンの系列ごと失効する。
つまり、ログアウトを減らすための変更が、逆にログアウトを引き起こす。

rotation は、refresh token をブラウザに置く public client が漏洩に備えるための仕組みである。
BFF は client secret を持つ confidential client であり、refresh token はブラウザの JavaScript から読めない暗号化 Cookie の中にある。
そのため rotation を無効にしても、守るべきものは失わない。

### ログインの持続時間

refresh token の Idle を 30 日、Maximum を 365 日とする。
30 日以内に一度でも使えば、最長 1 年はログインが続く。
`__Host-session` の `Max-Age` も 365 日に揃える。

Auth0 のセッション Cookie（`auth.shisetsudb.com` 側）の寿命は、この持続時間に関与しなくなる。
関与するのは再ログインの速さだけである（Auth0 のセッションが生きていれば、Google の画面を経ずに戻ってくる）。

## 認証フロー

### ログイン

1. SPA が `/auth/login?redirect=<パス>` へ遷移する
2. BFF が `state` と PKCE の `code_verifier` を生成し、戻り先パスと合わせて `__Host-oauth` Cookie（暗号化、TTL 10 分）に格納する
3. BFF が `https://auth.shisetsudb.com/authorize` へ 302 で送る

`/authorize` に付けるパラメータは以下のとおりである。

| パラメータ | 値 |
|---|---|
| `response_type` | `code` |
| `scope` | `openid offline_access` |
| `audience` | `https://api.shisetsudb.com/` |
| `connection` | `google-oauth2` |
| `code_challenge_method` | `S256` |

`connection` を指定すると、Auth0 は Universal Login の画面を出さずに Google へ転送する。
利用者から見ると、ログインボタンを押した直後に Google の画面が出る。

confidential client でも PKCE を付けるのは、認可コードの横取りに対する防御を client secret だけに頼らないためである。

### コールバック

1. Auth0 が `/auth/callback?code&state` を呼ぶ
2. BFF が `__Host-oauth` の `state` とクエリの `state` を照合する。不一致なら `/?auth_error=state` へ 302
3. `https://auth.shisetsudb.com/oauth/token` で code を交換する。client secret は Worker Secret から与える
4. 応答のアクセストークン、refresh token、`expires_in` から `__Host-session` を作る
5. `__Host-oauth` を失効させ、戻り先パスへ 302 で返す

ID トークンは受け取るが使わない。
ロールとトライアルはアクセストークンのクレームから読む。
BFF はトークンエンドポイントから TLS で直接受け取ったトークンだけを読むので、署名を検証せずにクレームを取り出してよい（mcp-server の `extractJwtSub` と同じ判断）。
アクセストークンの署名は、従来どおり api が検証する。

### セッションの中身

```ts
type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // アクセストークンの失効時刻（UNIX 秒）
};
```

これを JSON にして AES-GCM で暗号化し、base64url にして Cookie に入れる。
鍵は Worker Secret `SESSION_KEYS` に配列で置き、先頭で暗号化し、全鍵で復号を試みる。
鍵を交換するときは、新しい鍵を先頭に足してデプロイし、旧鍵は 365 日後に落とす。

Cookie の上限は約 4KB である。
Auth0 のアクセストークン（RS256 の JWT）は 1KB 前後なので、base64url と GCM のオーバーヘッドを含めても 2KB 程度に収まる。
ID トークンを入れないのは、このサイズのためでもある。

### API 呼び出し

1. SPA が `/api/<エンドポイント>` を fetch する（同一オリジンなので Cookie は自動で載る）
2. BFF が転送先パスをホワイトリストと照合する。一致しなければ 404
3. `__Host-session` を復号する。無い、または復号できなければ、Authorization を付けずに転送する
4. `expiresAt` まで 60 秒を切っていれば refresh する（後述）
5. Service Binding で api を呼び、`Authorization: Bearer <アクセストークン>` を付ける
6. refresh した場合は、応答に新しい `__Host-session` の `Set-Cookie` を付ける

並行するリクエストがそれぞれ refresh しても、rotation を無効にしているので全て成功する。
応答ごとに Cookie が上書きされるが、どれも有効なトークンなので、最後に書かれたものが残っても問題ない。

### refresh の失敗

- **`invalid_grant`**（revoke 済み、期限切れ）：`__Host-session` を失効させ、Authorization を付けずに転送する。利用者は未ログインの状態に戻る
- **それ以外**（Auth0 の障害、通信断）：Cookie を残したまま 503 を返す

二つを分けるのは、Auth0 の一時的な障害で利用者をログアウトさせないためである。
分類の基準は mcp-server の `refreshAuth0Token` と同じにする。

### /auth/me

`__Host-session` を復号し、アクセストークンのクレームから `{ authenticated, anonymous, trial }` を返す。
期限切れなら API 呼び出しと同じ手順で refresh する。

`anonymous` と `trial` の意味は、現在の `contexts/Auth0.tsx` と同じである。
`anonymous` はクレームの `role === "anonymous"`、`trial` はクレームの `trial === true` を表す。

### ログアウト

1. `https://auth.shisetsudb.com/oauth/revoke` で refresh token を revoke する
2. `__Host-session` を `Max-Age=0` で上書きする
3. `https://auth.shisetsudb.com/v2/logout?client_id=...&returnTo=<トップ>` へ 302 で送る

Auth0 のセッションも消すのは、消さないと次のログインが同じ Google アカウントで即座に完了し、アカウントを切り替えられないためである。

## viewer の変更

フロント側の変更は #1674 とほぼ同じである。

| 対象 | 変更 |
|---|---|
| `worker/`（新規） | BFF 本体。`index.ts`、`auth0.ts`、`session.ts`、`cookies.ts`、`proxy.ts` |
| `contexts/Auth0.tsx` → `contexts/Auth.tsx` | `/auth/me` を叩くだけの実装に置き換える。Context は `{ isLoading, authenticated, userInfo: { anonymous, trial }, login, logout }` |
| `pages/Waiting.tsx`、`constants/routes.ts` | `waiting` ルートを削除する |
| `api/client.ts` | ベース URL を `/api` にし、token 引数を削除する |
| `hooks/useApiQuery.ts`、`hooks/usePaginatedQuery.ts`、`pages/Detail.tsx` | fetcher へ token を渡す経路を削除する |
| `components/SettingsMenu/SettingsMenu.tsx` | ログイン済みの判定を `token` から `authenticated` に変える |
| `constants/env.ts`、`env.d.ts` | `VITE_AUTH0_*` と `VITE_API_ENDPOINT` の 4 本を削除する |
| `package.json` | `@auth0/auth0-spa-js` を削除し、`@cloudflare/vite-plugin` と `@cloudflare/vitest-pool-workers` を追加する |
| `wrangler.jsonc` | `main`、`assets.binding`、`assets.run_worker_first`、Service Binding、Rate Limiting binding、`vars`（`AUTH0_DOMAIN`、`AUTH0_CLIENT_ID`、`AUTH0_AUDIENCE`）を追加する |

#1674 との違いは、トライアルの意味を変えないことである。
`Detail` の `anonymous || trial` による予約タブの制御は、そのまま残す。

Worker Secret は `AUTH0_CLIENT_SECRET` と `SESSION_KEYS` の 2 本である。

### #1674 から移植するもの

- `worker/cookies.ts`、`worker/proxy.ts`、`worker/index.ts` のルーティングと戻り先の検証
- フロント側の `contexts/Auth.tsx` と、それに伴うコンポーネント、テストの差し替え
- `vitest.worker.config.ts` と CI の worker テストのステップ

`worker/google.ts`、`worker/jwt.ts`、`worker/crypto.ts`（セッショントークンのハッシュ）、`0003_auth.sql`、api の issuer マップは移植しない。

## セキュリティ上の判断

**転送パスのホワイトリスト**：BFF が api へ転送するのは読み取りの 5 経路（`/v1/institutions`、`/v1/institutions/:id`、`/v1/institutions/:id/reservations`、`/v1/reservations/search`、`/v1/scrape-runs`）に限る。
Cookie 認証にした以上、`/v1/admin/*` への PUT を Cookie で叩ける状態を作るわけにはいかない。
`SameSite=Lax` は第二の防壁である。

**戻り先の検証**：`/auth/login?redirect=` は、ブラウザと同じ URL パーサで自オリジンに対して解決し、結果が自オリジンに落ちるものだけを許す。

**Cookie 属性**：`__Host-` prefix によって `Secure`、`Path=/`、`Domain` 属性なしを強制し、サブドメインからの上書きを塞ぐ。

**Cookie の暗号化**：`__Host-session` は改ざん防止だけでなく秘匿も要る（refresh token を含むため）。
署名だけの Cookie では足りないので、AES-GCM で暗号化する。

**レート制限**：`/auth/login` と `/auth/callback` に Rate Limiting binding を適用する。
`/auth/me` は含めない。共有 IP の環境で、ログイン済みの利用者が締め出されるためである。

## ちらつきの残り方

BFF 化の後も、SPA は起動時に `/auth/me` を 1 回呼ぶ。
SDK の読み込みと iframe の往復は無くなるので、ちらつきの時間は短くなるが、ゼロにはならない。

ゼロにするには、HTML の配信時に Worker がログイン状態を埋め込む必要がある。
それには全てのページ遷移で Worker を走らせることになり、Workers の無料枠のリクエスト数を消費する。
本書の範囲では行わず、BFF 化の後に体感を確かめてから判断する。

## Free tier への影響

| 資源 | 変化 |
|---|---|
| D1 rows read | 増えない（セッションを D1 に置かないため） |
| Workers のリクエスト | `/api/*` は viewer と api の 2 本になる。`/auth/me` がページ読み込みごとに 1 本増える |
| Auth0 | Regular Web Application が 1 つ増える。MAU の数え方は変わらない |

Service Binding 経由の呼び出しが Free プランのリクエスト上限に計上されるかは、#1674 の時点から未検証のままである。

## テスト方針

- **BFF**：`@cloudflare/vitest-pool-workers` で走らせる。Auth0 の `/oauth/token` と `/oauth/revoke` は fetch mock で差し替え、ローカル鍵で署名したアクセストークンを返す
- **セッション**：暗号化と復号の往復、鍵の配列による復号、改ざんした Cookie が未ログインとして扱われることを検証する
- **refresh**：期限の 60 秒前で refresh が走ること、`invalid_grant` で Cookie が消えること、それ以外の失敗で 503 になり Cookie が残ることを検証する
- **転送ホワイトリスト**：許可外のパスが 404 になり、`/v1/admin/*` が転送されないことを検証する
- **viewer のコンポーネント**：既存の browser mode テストを維持し、`MockAuthProvider` への差し替えだけを行う

## 移行手順

1. `@cloudflare/vite-plugin` と `@cloudflare/vitest-pool-workers` を、master の wrangler と同じ日に公開された組で選ぶ。合わなければ wrangler の更新を先行する PR で行う
2. Auth0 で Regular Web Application を作る（前述の設定）
3. viewer に Secrets を投入する（`AUTH0_CLIENT_SECRET`、`SESSION_KEYS`）
4. PR をマージする。Workers Builds が viewer をデプロイする
5. 本人の Google アカウントでログインし、予約検索、リロード後のログイン維持、ログアウトを確認する
6. 1 週間の安定運用を確かめた後、SPA 用 Application を無効化する

api と mcp-server は変わらないので、デプロイの順序に制約は無い。
切り替えの時点で、既存の利用者は一度だけ再ログインが必要になる（旧方式のトークンはブラウザのメモリにしか無く、引き継げないため）。

### ロールバック

viewer を直前の版に戻す。
SPA 用 Application は手順 6 まで有効なまま残すので、旧 viewer はそのまま動く。

## 未検証事項

実装時に確認する。

- Actions が `client_id` で Application を絞り込んでいないか
- Actions がアクセストークンに `role` と `trial` の両方を載せているか。現在の viewer は ID トークンから読み、api はアクセストークンの `trial` を参照しているため、両方に載っている可能性が高いが、実物で確かめる
- 現在の SPA 用 Application を、mcp-server の CLI（`packages/mcp-server/src/cli/auth/login.ts`）が共有していないか。CLI は client secret を使うので別の Application のはずだが、無効化の前に確認する
- `http://localhost:3000` で `__Host-` prefix 付きの `Secure` Cookie が設定できるか
- Service Binding 経由の呼び出しが Free プランのリクエスト上限に計上されるか

## 対象外

- HTML へのログイン状態の埋め込み（前述）
- api の CORS 設定の整理。BFF 化の後は viewer からの cross-origin 呼び出しが無くなるが、他の呼び出し元の有無を確かめてから別途扱う
