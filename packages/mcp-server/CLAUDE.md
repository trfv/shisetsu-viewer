# MCP Server Package

Hasura のデータを AI 向けツールとして公開する MCP サーバー。Deps: `@modelcontextprotocol/sdk`, `zod`, `@cloudflare/workers-oauth-provider`。Commands: see `package.json` scripts (`typecheck`, `deploy`, `preview:wrangler`, `start` = local stdio, `cli`).

## Entry Points と認証モード

| Entry       | 用途                                  | クライアント認証                                                                        | Hasura への認証                                  | Write tools |
| ----------- | ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------- |
| `worker.ts` | Cloudflare Workers デプロイ           | MCP OAuth（Auth0 + Dynamic Client Registration、トークンは KV `OAUTH_KV` に暗号化保存） | ユーザーの Auth0 トークンを転送（per-user 権限） | 無効        |
| `index.ts`  | local stdio（dev/debug）              | なし                                                                                    | Auth0 M2M                                        | 有効        |
| `cli.ts`    | shell から JSON 取得（AI agent 向け） | Auth0 Authorization Code + PKCE（`~/.config/shisetsu/tokens.json`、自動リフレッシュ）   | 同トークン転送                                   | —           |

- **罠**: GraphQL クライアントは `createGraphQLClient(endpoint, token)` でリクエストごとに生成し、`createServer({ client })` 経由でツールへ渡す。トークンをモジュールスコープに置くと、Workers の isolate が `await` を跨いで並行リクエストの値に差し替えるため、ユーザー間でトークンが混線する（stdio では 1 プロセス 1 ユーザーなので顕在化しない）。
- Tools: read = `listInstitutions` / `getInstitutionDetail` / `getInstitutionReservations` / `searchReservations`、write = `upsertReservations` / `upsertInstitutions`。Resource: `municipalities`（shared registry）。
- CLI 例: `npm run cli -w @shisetsu-viewer/mcp-server -- search --start-date 2026-03-15 --end-date 2026-03-31 --evening`（`login` / `logout` / `--help` あり）。

## Environment

local stdio は `.env`（`GRAPHQL_ENDPOINT`, `AUTH0_*` は M2M app の値）。Workers は wrangler secrets（同名だが Auth0 は Regular Web App の値）+ KV binding `OAUTH_KV`。
