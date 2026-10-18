# Cloudflare の設定をリポジトリで管理する

作成日：2026-10-19

## 背景

3 つの Worker（viewer、api、mcp-server）の実行時の設定は、各パッケージの `wrangler.jsonc` にある。
バインディング、vars、D1 と KV の ID、レート制限がそこに書かれ、`wrangler deploy` のたびに反映される。
この部分はすでにリポジトリで管理できている。

一方で、次の設定は Cloudflare の管理画面にしか無い。

- **Workers Builds のトリガー**：ビルドとデプロイのコマンド、対象ブランチ、監視パス、ビルド変数
- **カスタムドメイン**：api（`d1-api.shisetsudb.com`）だけが `wrangler.jsonc` の `routes` にあり、viewer（`app.shisetsudb.com`）と mcp-server（`mcp.shisetsudb.com`）は管理画面で付けている
- **Secret の有無**：どの Worker にどの名前の Secret が要るかは、コードの型定義（viewer の `worker/secrets.d.ts` など）にしか書かれておらず、本番に入っているかは確かめられない

#1751 の作業中に、この部分で二つの問題が起きた。
一つは、旧 SPA のビルド変数 `VITE_*` が、コードから消えたあともトリガーに残っていたことである。
もう一つは、管理画面での削除を保存し損ねても、API で読み直すまで気付けなかったことである。
どちらも、設定がリポジトリの外にあり、差分として見えないことから起きている。

本書は、Auth0 の Action と同じ考え方（#1756）で、この部分をリポジトリに寄せる計画である。
Auth0 と同じく、テナント全体を IaC にすることは目指さない。
本番とのずれが実際に起きた部分、またはずれると障害になる部分に絞る。

## 現状の棚卸し

2026-10-19 に Cloudflare の API で読み取った結果である。
本書の仕組みは `shisetsu-` で始まる 3 つの Worker だけを対象にし、それ以外には触れない。

| Worker | トリガー | 監視パス | ビルド変数 | Secret |
|---|---|---|---|---|
| shisetsu-viewer | master（`deploy`）、master 以外（`deploy:versions`） | `*` | `NODE_VERSION`、`HUSKY` | `AUTH0_CLIENT_ID`、`AUTH0_CLIENT_SECRET`、`SESSION_KEYS` |
| shisetsu-api | master（`deploy:ci`） | `package-lock.json`、`packages/api/**`、`packages/shared/**` | `NODE_VERSION` | `ADMIN_API_KEY` |
| shisetsu-mcp-server | master（`deploy`） | 上に加えて `packages/mcp-server/**` | `NODE_VERSION` | `AUTH0_AUDIENCE`、`AUTH0_CLIENT_ID`、`AUTH0_CLIENT_SECRET`、`AUTH0_DOMAIN`、`GRAPHQL_ENDPOINT` |

棚卸しで、次の三点が見つかった。

- **`HUSKY` が残っている**：pre-commit は lefthook に移っており、どこからも読まれない。
- **mcp-server の `GRAPHQL_ENDPOINT` が残っている**：Hasura の撤去後、コードから参照が無くなっている。
- **mcp-server の `AUTH0_DOMAIN` と `AUDIENCE` が Secret になっている**：viewer と api はこの二つを `wrangler.jsonc` の vars に置いている。秘密ではない値を Secret にすると、値を読み出せないので確かめられない。特に `AUTH0_DOMAIN` は、api の `resolveRole` が issuer の検証に使う。値がカスタムドメインの `auth.shisetsudb.com` でなければ、全員が anonymous に倒れる（`packages/api/wrangler.jsonc` のコメントが警告している組み合わせである）。現在は MCP 経由で予約データが読めているので正しい値が入っていると考えられるが、本書の時点では確かめていない。

## 方針

設定を三つに分け、それぞれ置き場所と反映の仕方を変える。

| 種類 | 置き場所 | 反映 |
|---|---|---|
| 実行時の設定（カスタムドメインを含む） | 各パッケージの `wrangler.jsonc` | 今までどおり `wrangler deploy` |
| Workers Builds のトリガー | リポジトリ内の宣言ファイル | GitHub Actions から API で適用する |
| Secret | 名前だけを宣言する（値はリポジトリに置かない） | 適用はしない。本番に揃っているかを検査するだけ |

### カスタムドメインは wrangler.jsonc に移す

viewer と mcp-server にも、api と同じ形で `routes` を足す。

```jsonc
"routes": [{ "pattern": "app.shisetsudb.com", "custom_domain": true }],
```

ドメインはすでに付いているので、`wrangler deploy` はそれを確かめるだけで、付け替えは起きない見込みである。
この見込みは、preview ではなく本番のデプロイでしか確かめられない。
そのため、一つずつ（先に mcp-server、次に viewer）マージし、マージのたびにドメインで応答が返ることを確かめる。

### mcp-server の Auth0 の値を vars に移す

`AUTH0_DOMAIN` と `AUTH0_AUDIENCE` を `packages/mcp-server/wrangler.jsonc` の vars に書き、Secret から消す。
vars と Secret に同じ名前があると、Secret のほうが優先されるかどうかが紛らわしい。
そこで、vars を足した版をデプロイしたあとに Secret を消す、という順番にする。
`GRAPHQL_ENDPOINT` は同じ機会に消す。

### Workers Builds のトリガーは宣言ファイルで管理する

`infra/cloudflare/builds.json` に、3 つの Worker のトリガーを宣言する。

```jsonc
{
  "shisetsu-api": [
    {
      "trigger_name": "デフォルト ブランチをデプロイする",
      "branch_includes": ["master"],
      "branch_excludes": [],
      "path_includes": ["package-lock.json", "packages/api/**", "packages/shared/**"],
      "path_excludes": [],
      "build_command": "npm test -w @shisetsu-viewer/api",
      "deploy_command": "npm run deploy:ci -w @shisetsu-viewer/api",
      "root_directory": "/",
      "build_caching_enabled": true,
      "vars": { "NODE_VERSION": "24" }
    }
  ]
}
```

ビルド変数は値も宣言する。
今のビルド変数（`NODE_VERSION`）は秘密ではないためである。
秘密のビルド変数が必要になったら、Secret と同じく名前だけを宣言する形に分ける。

宣言の単位はトリガー名とする。
トリガーの UUID は作り直すと変わるので、宣言には書かない。
適用するときに、Worker 名とトリガー名から UUID を引く。

スクリプト（`infra/cloudflare/builds.ts`）には二つのモードを持たせる。

- **`--check`**：宣言と本番を比べ、差分を表示する。書き込みはしない。差分があれば失敗する
- **適用**：差分のあるトリガーを `PATCH` し、宣言に無いビルド変数を消す。宣言に無いトリガーは消さずに警告だけ出す（消すとデプロイが止まるので、人が判断する）

Auth0 の `auth0Deploy.ts` と同じく、`fetch` を差し替えてテストする。

### Secret は名前の有無だけを検査する

各パッケージで、必要な Secret の名前を一か所に宣言する。
viewer はすでに `worker/secrets.d.ts` に型として持っているので、これを名前の一覧に置き換えて、型はそこから作る。
api と mcp-server にも同じ一覧を作る。

検査は、宣言した名前が本番の Worker の Secret に全部あるか、宣言に無い名前が本番に無いか、の二つである。
Cloudflare の API は Secret の値を返さないので、この検査で値が漏れることは無い。
#1751 で `SESSION_KEYS` を入れ忘れていたら、マージの前にこの検査で気付けた。

## GitHub Actions

`.github/workflows/cloudflare.yml` を足す。

| 契機 | 内容 | トークン |
|---|---|---|
| pull request（`infra/cloudflare/**` や Secret の宣言が変わったとき） | `--check` を実行し、差分を PR に表示する | 読み取り用 |
| master への push（同じパス） | 適用する | 書き込み用 |

定期実行はしない。
管理画面で直接変えたずれは次にリポジトリ側を変えるまで見えなくなるが、管理画面では設定を変えない、という運用で補う。
リポジトリ側を変えたときには pull request の `--check` が差分を表示するので、その時点でずれに気付ける。

Cloudflare の API トークンは二本に分ける。

- **読み取り用**：Account の Workers Builds Configuration（Read）と Workers Scripts（Read）。pull request からも使う
- **書き込み用**：Workers Builds Configuration（Edit）。GitHub の Environment `cloudflare` に置き、master からしか使えないようにする

書き込み用を分けるのは、このトークンの影響が大きいからである。
トリガーのデプロイコマンドを書き換えられると、任意のコードを本番にデプロイできる。
つまり、書き込み用のトークンは本番へのデプロイ権限と同じ重みを持つ。
pull request からは、フォークを含めて誰でもワークフローを動かせる可能性があるので、書き込み用には触れさせない。

## 置き場所

Auth0 の `auth0Deploy.ts` は今 `packages/shared` にある。
Cloudflare の分まで shared に置くと、shared が「パッケージ間の共有型」という役割から外れていく。
そこで、新しいワークスペース `packages/infra` を作り、Cloudflare の宣言とスクリプトをそこに置く。
`auth0Deploy.ts` も同じ機会にそこへ移す。
Action の原本（`auth0PostLogin.cjs`）は、`readClaims` との往復を検証するテストがあるので shared に残す。

## 段階

1. **掃除**：トリガーから `HUSKY` を消す。mcp-server の Auth0 の値を vars に移し、`GRAPHQL_ENDPOINT` を消す
2. **カスタムドメイン**：mcp-server、viewer の順に `routes` を足す
3. **`packages/infra` と `--check`**：宣言ファイルと、pull request での検査。この時点では書き込まない
4. **適用**：書き込み用トークンと master への push での適用

段階 3 までは、本番を書き換える仕組みを足さない。
pull request の検査で宣言と本番が一致することを確かめてから、段階 4 に進む。

## Free tier への影響

Cloudflare の API の呼び出しだけで、Worker の実行や D1 は使わない。
GitHub Actions が動くのは、該当パスが変わったときだけである。

## 対象外

- **DNS レコード、Cloudflare Tunnel（国内 proxy）**：変える頻度が低く、今回の問題とも関係しない。Tunnel は自宅の Mac 側の設定と対になっているので、リポジトリだけでは完結しない
- **D1 と KV の作成**：ID はすでに `wrangler.jsonc` にある。作り直す予定が無い
- **Terraform**：Cloudflare の provider は Workers 全般を扱えるが、state の置き場所が必要になり、`wrangler.jsonc` と管理対象が重なる。Workers Builds のトリガーを扱えるかも確かめていない。宣言ファイルと短いスクリプトで足りる範囲なので採らない
- **同じアカウントの無関係な Worker**

## 未検証事項

- viewer と mcp-server に `routes` を足したとき、既存のカスタムドメインがそのまま使われるか（段階 2 で一つずつ確かめる）
- mcp-server の Secret `AUTH0_DOMAIN` に入っている値（vars に移すときに、`auth.shisetsudb.com` で動くことを確かめる）
- Workers Builds の API で、トリガーの `PATCH` がビルド変数を含めて一度にできるか、別の呼び出しが要るか（API の定義上は別のエンドポイント）
