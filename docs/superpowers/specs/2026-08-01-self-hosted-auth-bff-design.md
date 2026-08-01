# 自前 IdP と BFF 化による Auth0 依存の解消

作成日：2026-08-01

## 背景

shisetsu-viewer は Cloudflare Workers、D1、KV の上で完結しているが、認証だけが Auth0 という外部 SaaS に依存している。
依存箇所は四つある。

- **viewer**：Authorization Code + PKCE でログインし、`getTokenSilently` で 1 時間ごとにアクセストークンを更新する（`packages/viewer/contexts/Auth0.tsx`）
- **api**：RS256 の JWT を JWKS で検証してロールを解決し、`/v1/reservations/*` を `user` ロールに限定する（`packages/api/src/auth/auth0.ts`）
- **mcp-server**：MCP クライアント向けの OAuth 認可を Auth0 へリダイレクトで委譲する（`packages/mcp-server/worker.ts`）
- **scraper**：Hasura 書き込み用の M2M client_credentials（`packages/scraper/tools/m2mAuth.ts`）

このうち scraper の M2M は Hasura 専用であり、PR 3-5 の Hasura 撤去で消える。

Auth0 が提供する機能のうち実際に使っているのは、本人確認とカスタムクレーム一つだけである。
ロールモデルは `anonymous` と `user` の 2 値で、`trial` フラグは `anonymous` に畳まれる（`packages/api/src/auth/auth0.ts:42`）。
組織、ロール階層、MFA は使っていない。

本設計の目的は二つある。

- Cloudflare 上に依存を閉じること
- 認証情報をバックエンドへ寄せること（BFF 化）。ブラウザの JavaScript がトークンを一切保持しない状態にする

## スコープ

Auth0 依存の解消を四つのサブプロジェクトに分割する。
本書が対象とするのは 2 のみである。

| # | サブプロジェクト | 内容 | 残る Auth0 依存 |
|---|---|---|---|
| 1 | Hasura 撤去（PR 3-5） | scraper の dual-write を止める | 3 箇所 |
| 2 | 自前 IdP と BFF 化 | 本書の対象 | 1 箇所（mcp-server） |
| 3 | mcp-server の認可サーバ自前化 | OAuth 2.1 の認可サーバを Worker に置く | 0 箇所 |
| 4 | Auth0 撤去 | テナント削除、環境変数と検証コードの整理 | 完了 |

2 と 3 が共有するのは D1 の `users` テーブルと JWT 検証コードだけであり、フローは独立している。
2 を単独で出荷しても、ロール付与が Auth0 Actions（リポジトリ外の設定）から D1 の 1 カラムに降りるという利得が確定する。

Auth0 テナントを削除できるのは 3 の完了後である。
本書のスコープを終えた時点では、viewer は自前認証、mcp-server は Auth0 という中間状態が続く。

## 全体構成

viewer Worker を BFF とし、ブラウザからの認証と API 呼び出しをすべて同一オリジンに集約する。

```
ブラウザ ──同一オリジン──> viewer Worker (BFF)
   │  __Host-session (HttpOnly, Secure, SameSite=Lax, Path=/)
   │
   ├─ /auth/login     → Google へ 302
   ├─ /auth/callback  → code 交換 → users upsert → session 発行 → SPA へ 302
   ├─ /auth/logout    → session 削除 → Cookie 失効
   ├─ /auth/me        → { authenticated, role, email }
   └─ /api/*          → session 解決 → Service Binding で api へ
                        Authorization: Bearer <60 秒 JWT を都度発行>
   その他             → 静的アセット（Worker を経由しない）

api Worker: 変更は issuer マップの追加のみ。公開 API としては現状維持
D1:         users と sessions は viewer Worker が直接読み書きする
```

api を viewer Worker に同居させないのは、`2026-07-11-repository-rebuild-design.md` でデプロイ独立性を理由に退けた判断を踏襲するためである。
BFF はプロキシとセッション管理だけを担い、データアクセスは api に残す。

`assets.run_worker_first` に `["/auth/*", "/api/*"]` を指定して、この二つのパスだけ Worker を先に走らせる。
静的アセットへのリクエストは Worker を経由せず、Cloudflare の課金対象にもならない。

### BFF 化が解消する問題

同一オリジン化によって、トークンをブラウザに渡す設計で必要だった対処がまとめて不要になる。

- **cross-site Cookie**：viewer のプレビューは `*.trfv-dev.workers.dev` で動くため、`d1-api.shisetsudb.com` とは cross-site になる。トークンを直接ブラウザに渡す設計では `SameSite=None` と CORS の credentials 許可が必要だった。同一オリジンなら `__Host-` prefix と `SameSite=Lax` で足りる
- **トークンの露出**：アクセストークンもリフレッシュトークンもブラウザに渡らない。XSS でトークンを持ち出す経路が構造的に存在しない
- **ビルド変数**：`VITE_API_ENDPOINT` が相対パス `/api` に置き換わり、`VITE_AUTH0_*` の 3 本と合わせて計 4 本が消える。`packages/viewer/constants/env.ts` は空になるため削除する
- **トークン更新のタイマー**：`requestInterval` による 1 時間ごとの更新が不要になる。寿命管理は Cookie とサーバ側に移る

## 認証フロー

### ログイン

1. SPA が `/auth/login?redirect=<パス>` へ遷移する
2. BFF が `state` と PKCE の `code_verifier` を生成し、戻り先パスと合わせて `__Host-oauth` Cookie（HttpOnly、TTL 10 分）に格納する
3. BFF が `https://accounts.google.com/o/oauth2/v2/auth` へ 302 で送る。scope は `openid email`、`code_challenge_method` は S256

### コールバック

1. Google が `/auth/callback?code&state` を呼ぶ
2. BFF が `__Host-oauth` Cookie の `state` とクエリの `state` を照合する。不一致なら 400
3. `https://oauth2.googleapis.com/token` で code を交換する。client_secret は Worker Secret から与える
4. 返却された `id_token` を Google の JWKS（`https://www.googleapis.com/oauth2/v3/certs`）で検証し、`sub`、`email`、`email_verified` を取り出す
5. `users` を後述の順序で解決する
6. ランダム 32 バイトのセッショントークンを生成し、その SHA-256 を `sessions` に保存する
7. そのユーザーの期限切れセッション行を削除する
8. `__Host-session` Cookie を設定し、戻り先パスへ 302 で返す

掃除をログイン時に限るのは、`/api/*` の経路に D1 の書き込みを持ち込まないためである。
リクエストごとに DELETE を撃つと、読み取りしかしないはずの経路が書き込みコストを持つ。

### API 呼び出し

1. SPA が `/api/<エンドポイント>` を fetch する（`credentials` の指定は不要。同一オリジンのため Cookie は自動で載る）
2. BFF が転送先パスをホワイトリストと照合する。一致しなければ 404
3. `__Host-session` から `sessions` と `users` を 1 回の JOIN で引き、ロールを得る
4. ロールを載せた寿命 60 秒の JWT を ES256 で署名する
5. Service Binding で api を呼び、`Authorization: Bearer <JWT>` を付与する
6. 応答の `Cache-Control` が `public` を含む場合に限り、`caches.default` へ格納する

この経路では D1 に書き込まない。
期限切れセッション行の掃除はコールバックの中で行う（後述）。

セッションが無い、または期限切れの場合は、JWT を付けずに api を呼ぶ。
公開エンドポイントはそのまま応答し、`/v1/reservations/*` は api が 401 を返す。

### ログアウト

`sessions` の行を削除し、`__Host-session` を `Max-Age=0` で上書きする。

## トークンと Cookie

| 名前 | 種別 | 寿命 | 保存場所 |
|---|---|---|---|
| `__Host-oauth` | state と code_verifier | 10 分 | Cookie のみ |
| `__Host-session` | 不透明ランダム 32 バイト | 30 日 | Cookie。D1 には SHA-256 のみ保存する |
| api 向け JWT | ES256 署名 JWT | 60 秒 | 保存しない。リクエストごとに生成する |

Cookie の属性は三つとも `HttpOnly; Secure; SameSite=Lax; Path=/` である。

セッショントークンを JWT にしないのは、サーバ側で失効させるためである。
JWT は署名が有効な限り取り消せず、失効リストを持つなら結局 D1 を引くことになる。

api 向け JWT のクレームは、移行期間中も Auth0 と同じ名前空間を使う。

```json
{
  "iss": "https://app.shisetsudb.com/",
  "aud": "shisetsu-api",
  "sub": "<users.id>",
  "https://app.shisetsudb.com/token/claims": { "role": "user" }
}
```

### 署名鍵

秘密鍵は viewer Worker の Secret `AUTH_SIGNING_KEYS` に JWK の配列として置き、先頭を署名に使う。
api 側は公開鍵だけを `wrangler.jsonc` の `vars` に `SELF_JWKS_JSON` として持ち、`createLocalJWKSet` で検証する。

api に JWKS を fetch させないのは、リクエスト時のネットワーク依存を作らないためである。
`createLocalJWKSet` を使う経路はテスト用の `TEST_JWKS_JSON` ですでに存在する（`packages/api/src/worker.ts:112`）。

鍵のローテーションは、api の `SELF_JWKS_JSON` に新しい公開鍵を追加してデプロイし、そのあとで viewer の `AUTH_SIGNING_KEYS` の先頭に新しい秘密鍵を追加する順序で行う。
既発行の JWT は寿命 60 秒なので、旧鍵は次のデプロイで落とせる。

## データモデル

`packages/api/migrations/0003_auth.sql` を追加する。

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  google_sub    TEXT UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'anonymous'
                CHECK (role IN ('anonymous', 'user')),
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

`google_sub` を NULL 許容にしているのは、既存ユーザーの移行のためである。

この 2 テーブルへのクエリは `packages/api/src/db/authQueries.ts` に置き、viewer Worker から import する。
mcp-server が `@shisetsu-viewer/api/auth/auth0` を import している前例に倣う。
マイグレーションの適用は引き続き api パッケージの `migrate:remote` が担う。

### ユーザー解決の順序

初回ログイン時、次の順で行を決める。

1. `google_sub` が一致する行があればそれを使う
2. なければ `email` が一致し `google_sub IS NULL` の行を探し、見つかれば `google_sub` を書き込んで確定する
3. どちらもなければ `role = 'anonymous'` で新規作成する

2 があることで、Auth0 から取り出した既存ユーザーの email を `role='user', google_sub=NULL` で先に投入しておけば、本人が Google でログインした時点で自動的に紐づく。
移行のための手作業が発生しない。

ただしこの email 突合は、Google の ID トークンが `email_verified: true` の場合に限る。
未検証の email を認めると、他人の email を名乗るアカウントで昇格済みの行を奪える。

### ロール付与の運用

新規登録は `anonymous` とする。
これは予約データが見えない状態であり、現行の `trial` と同じ扱いである。

`user` への昇格は `wrangler d1 execute` による手動 UPDATE で行う。
対象が数名である現時点では、管理 UI は使われないコードになるため作らない。

### セッション参照のコスト

BFF は `/api/*` のリクエストごとに `sessions` と `users` を引くため、リクエストあたり 2 行前後の読み取りが増える。
D1 無料枠の制約は rows read だが、予約検索が 1 回で数千行を読むのに対してこれは誤差の範囲に収まる。
KV へ逃がして eventual consistency による失効遅延を抱えるより、D1 で素直に引くほうが得である。

## api の変更

`resolveRole` を、issuer から検証設定を引くマップ駆動に変える。

```ts
const ISSUERS = {
  [`https://${env.AUTH0_DOMAIN}/`]: { jwks: auth0Jwks, audience: env.AUTH0_AUDIENCE },
  [SELF_ISSUER]:                    { jwks: selfJwks,  audience: "shisetsu-api" },
};
```

署名検証の前に読むのは `iss` だけとし、それ以外のクレームは検証後にしか参照しない。

Auth0 の issuer を残すのは、mcp-server の stdio 経由の書き込みがサブプロジェクト 3 まで Auth0 トークンを使い続けるためである。

デプロイ順序は、api を先に出して自前 issuer を受け付ける状態にしてから viewer を出す。
依存が一方向なので、途中で止めても壊れない。

## viewer の変更

| 対象 | 変更 |
|---|---|
| `worker/index.ts`（新規） | BFF 本体。`/auth/*` と `/api/*` を処理する |
| `contexts/Auth0.tsx` → `contexts/Auth.tsx` | `/auth/me` を叩くだけの実装に置き換える。Context を `{ isLoading, userInfo: { anonymous: boolean }, login, logout }` とし、`token` と `userInfo.trial` を削除する |
| `api/client.ts` | ベース URL を `/api` の相対パスにする。token 引数を削除する |
| `hooks/useApiQuery.ts`、`hooks/usePaginatedQuery.ts` | fetcher へ token を渡す経路を削除する |
| `constants/env.ts` | 全定数が不要になるため削除する |
| `index.tsx` | `Auth0Provider` の props（domain、clientId、authorizationParams）が不要になる |
| `Header`、`HeaderMenuButton`、`SettingsMenu`、`Waiting`、`Detail` | `useAuth0` を `useAuth` に差し替え、`login()` と `logout()` の引数を削除する |
| `components/utils/AuthGuard.tsx` | 変更しない |
| `package.json` | `@auth0/auth0-spa-js` を削除する |
| `test/browser-setup.ts` | Auth0Client の mock を撤去し、MSW で `/auth/me` を mock する |
| `test/utils/test-utils.tsx` | `MockAuth0Provider` を `MockAuthProvider` に改める |
| `wrangler.jsonc` | `main`、`assets.binding`、`assets.run_worker_first`、D1 binding、Service Binding、Rate Limiting binding を追加する |

`token` が Context から消えるため、`useApiQuery` と `usePaginatedQuery` の fetcher シグネチャは変わる。
呼び出し側のページは fetcher を渡すだけなので、影響はフックの内部に閉じる。

## ビルドと開発環境

`@cloudflare/vite-plugin` を導入し、Vite dev server の中で workerd を走らせる。
これにより `npm start` のまま BFF と SPA の両方が動き、本番と同じランタイムで認証フローを検証できる。

導入にあたって確認済みの事実と、必要な変更は以下のとおりである。

- `@cloudflare/vite-plugin@1.50.0` の peerDependencies は `vite: ^6.1.0 || ^7.0.0 || ^8.0.0` であり、現行の Vite 8.1.5 と両立する
- 同じく peerDependencies が `wrangler: ^4.118.0` を要求する。現在 viewer、api、mcp-server の 3 パッケージとも 4.112.0 なので、一括更新が要る
- `packages/viewer/vitest.config.ts` は `vite.config.ts` を継承していない独立した定義である。プラグインを `vite.config.ts` に足しても、既存の browser mode テストには影響しない
- プラグインがビルド出力を client と worker に分けるため、`wrangler.jsonc` の `assets.directory` と `package.json` の `deploy:versions --assets=./dist` を新しい出力先へ合わせる

`vite.config.ts` の `build.rollupOptions.output`（manualChunks、chunkFileNames、assetFileNames）は client ビルド側に残す。
Vite 8 の bundler は Rolldown であり `rollupOptions` は互換キー名なので、キー名は変えない。

wrangler の更新は認証移行とは独立した変更であるため、先行する別 PR で行う。
`.npmrc` の `min-release-age=3` により、公開直後のバージョンは取得できない。

## セキュリティ上の判断

**転送パスのホワイトリスト**：BFF が api へ転送するのは読み取り 5 経路（`/v1/institutions`、`/v1/institutions/:id`、`/v1/institutions/:id/reservations`、`/v1/reservations/search`、`/v1/scrape-runs`）に限る。
それ以外は 404 を返す。
Cookie 認証にした時点で `/v1/admin/*` への PUT を Cookie で叩ける状態を作ってはならず、`SameSite=Lax` は第二の防壁にすぎない。

**戻り先の検証**：`/auth/login?redirect=` はパスのみを受け付け、`/` で始まり `//` で始まらないことを確認する。
絶対 URL は受け付けない。

**Cookie 属性**：`__Host-` prefix は `Secure` かつ `Path=/` かつ `Domain` 属性なしを要求する。
これにより、サブドメインから Cookie を上書きされる経路を塞ぐ。

**レート制限**：`/auth/login` と `/auth/callback` に Rate Limiting binding を適用する。
api 側の RATE_LIMITER は viewer Worker からは使えないため、viewer 用の binding を別に定義する。

**Google の redirect_uri**：Google はワイルドカードの redirect URI を受け付けない。
登録するのは `https://app.shisetsudb.com/auth/callback` と `http://localhost:3000/auth/callback` の 2 件とする。
プレビューデプロイ（`*.trfv-dev.workers.dev`）ではログインできないが、E2E は認証を要求しない範囲で回っているため支障はない。

## エラー処理

- Google 側のエラー、`state` 不一致、`email_verified` が false：`/?auth_error=<code>` へ 302 で戻し、SPA がトップで文言を表示する
- `/auth/me` が 401：未ログインとして続行する。現行の `catch { return false }` と同じ挙動になる
- api が 401 または 403：SPA は現行どおり `AuthGuard` でトップへ戻す
- BFF から api への Service Binding 呼び出しが失敗：502 を返し、`console.error` でログに残す

## テスト方針

- **BFF**：`@cloudflare/vitest-pool-workers` を使う。viewer の既存 `vitest.config.ts` は browser mode 専用なので、BFF 用に `vitest.worker.config.ts` と `test:worker` script を別に立てる。D1 マイグレーションを適用し、Google のトークンエンドポイントと JWKS は fetch mock で差し替えて、ローカル鍵で署名した ID トークンを与える
- **ユーザー解決**：3 分岐（`google_sub` 一致、email 突合、新規作成）と、`email_verified: false` で email 突合が働かないことを検証する
- **転送ホワイトリスト**：許可外パスが 404 になることと、`/v1/admin/*` が転送されないことを検証する
- **api の issuer マップ**：Auth0 の鍵で署名した JWT と自前の鍵で署名した JWT の両方が通ることを検証する
- **viewer のコンポーネント**：既存の browser mode テストを維持し、`MockAuthProvider` の差し替えのみ行う

## 移行手順

1. wrangler を全パッケージで 4.118 以上に更新する（先行 PR）
2. `0003_auth.sql` を本番 D1 に適用する
3. Auth0 から既存ユーザーの email を取り出し、`role='user', google_sub=NULL` で `users` に投入する
4. api に `SELF_JWKS_JSON` を設定し、issuer マップを入れてデプロイする。この時点では誰も自前 JWT を送らないため無風である
5. viewer を BFF 込みでデプロイする
6. 本人の Google アカウントでログインし、予約検索が通ることを確認する
7. 1 週間の安定運用を確認したのち、Auth0 の viewer 用アプリケーションを無効化する

### ロールバック

手順 5 で問題が出た場合、viewer を直前のバージョンへ戻す。
api の issuer マップは Auth0 を残したままなので、旧 viewer はそのまま動く。
D1 の `users` と `sessions` は旧 viewer から参照されないため、残しておいてよい。

## 未検証事項

実装時に確認する。

- Free プランで Service Binding 経由の呼び出しが 1 日 10 万リクエストの上限に計上されるか。ドキュメントの記述は Workers Standard についてのものであり、Free プランの扱いは明示されていない
- `http://localhost:3000` で `__Host-` prefix 付きの `Secure` Cookie が設定できるか。localhost を secure context として扱うブラウザでは通るはずだが、実機で確認する
- `app.shisetsudb.com` のカスタムドメイン設定が `wrangler.jsonc` に無く、ダッシュボード側で設定されている。BFF 化にあたって `routes` へ移すかどうかを決める
- `@cloudflare/vite-plugin` 導入後、`vite.config.ts` の `manualChunks` と `chunkFileNames` が client ビルドで従来どおり効くか

## 対象外

- mcp-server の認可サーバ自前化（サブプロジェクト 3）
- Auth0 テナントの削除（サブプロジェクト 4）
- Google 以外のログイン手段
- ロール昇格の管理 UI
- api を Service Binding 専用にして公開ルートを閉じること。mcp-server の自前化が終わってから検討する
