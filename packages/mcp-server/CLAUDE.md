# MCP Server Package

施設・予約データを AI 向けツールとして公開する MCP サーバー。Deps: `@modelcontextprotocol/sdk`, `zod`, `@cloudflare/workers-oauth-provider`。Commands: see `package.json` scripts (`typecheck`, `test`, `deploy`, `preview:wrangler`, `start` = local stdio, `cli`).

## Entry Points と認証モード

| Entry       | 用途                                  | クライアント認証                                                                        | データ経路                                       | Write tools |
| ----------- | ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------- |
| `worker.ts` | Cloudflare Workers デプロイ           | MCP OAuth（Auth0 + Dynamic Client Registration、トークンは KV `OAUTH_KV` に暗号化保存） | D1 直バインド `env.DB`                           | 無効        |
| `index.ts`  | local stdio（dev/debug）              | なし                                                                                    | `packages/api` へ HTTP + `X-Admin-Key`           | 有効        |
| `cli.ts`    | shell から JSON 取得（AI agent 向け） | Auth0 Authorization Code + PKCE（`~/.config/shisetsu/tokens.json`、自動リフレッシュ）   | `packages/api` へ HTTP + Bearer 転送             | —           |

- **データ境界は `DataSource` インターフェース**（`dataSource.ts`）。`createD1DataSource(db)` は `@shisetsu-viewer/api/db/queries` の純関数へ D1 binding で委譲する薄いラッパ、`createHttpDataSource(endpoint, auth)` は同じ形を REST で満たす。ツール実装はどちらかを知らない。
- **罠**: `DataSource` と role はリクエストごとに生成して `createServer({ dataSource, allowReservations })` へ注入する。モジュールスコープに置くと、Workers の isolate が `await` を跨いで並行リクエストの値に差し替えるため、ユーザー間で認証状態が混線する（stdio では 1 プロセス 1 ユーザーなので顕在化しない）。
- worker は `resolveRole(upstreamAccessToken, env)` を per-request に呼び、`role === "user"` のときだけ reservations 系ツールを露出する（`allowReservations`）。**trial ユーザーは anonymous 扱い**で、現行 viewer の UI ゲートと同義。
- Tools: 常時 = `listInstitutions` / `getInstitutionDetail`、`allowReservations` 時のみ = `getInstitutionReservations` / `searchReservations`、`write` 注入時のみ = `upsertReservations` / `upsertInstitutions`。Resource: `municipalities`（shared registry）。Prompts: `guide` / `searchAvailableRooms`。
- `getInstitutionReservations` の取得上限は `RESERVATIONS_HARD_CAP`（1000）。D1 側は 100 件ずつカーソルで回して詰める。
- CLI 例: `npm run cli -w @shisetsu-viewer/mcp-server -- search --start-date 2026-03-15 --end-date 2026-03-31 --evening`（`login` / `logout` / `--help` あり）。

## Environment

- **Workers**: wrangler secrets `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `AUTH0_AUDIENCE`（Auth0 Regular Web App の値）+ KV binding `OAUTH_KV` + D1 binding `DB`（`shisetsu-db`、api と同一 DB）。Workers Builds 未接続のため `npm run deploy -w @shisetsu-viewer/mcp-server` で手動デプロイする。
- **local stdio**: `.env` の `API_ENDPOINT` と `ADMIN_API_KEY`（`env.ts` がどちらも必須として throw する）。
- **cli**: `API_ENDPOINT` + Auth0 PKCE で取得したユーザートークン。
