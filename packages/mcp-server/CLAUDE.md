# MCP Server Package

施設・予約データを AI 向けツールとして公開する MCP サーバー。`npm start` は local stdio モードで起動する。

## Entry Points と認証モード

| Entry                  | 用途                                  | クライアント認証                                                                      | データ経路                             | Write tools |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------- | ----------- |
| `src/worker/worker.ts` | Cloudflare Workers デプロイ           | MCP OAuth（CIMD のみ、同意画面 → Auth0、トークンは KV `OAUTH_KV` に暗号化保存）       | D1 直バインド `env.DB`                 | 無効        |
| `src/stdio.ts`         | local stdio（dev/debug）              | なし                                                                                  | `packages/api` へ HTTP + `X-Admin-Key` | 有効        |
| `src/cli/cli.ts`       | shell から JSON 取得（AI agent 向け） | Auth0 Authorization Code + PKCE（`~/.config/shisetsu/tokens.json`、自動リフレッシュ） | `packages/api` へ HTTP + Bearer 転送   | —           |

- **構成**: `src/data/`（DataSource とその D1 / REST 実装）→ `src/queries/`（入力スキーマと `execute*`。MCP に依存しない）→ `src/server/`（MCP への登録）。CLI は `queries` を直接呼び、同じ zod スキーマで引数を検証する。`src/worker/` は Workers 専用（OAuth、同意画面、preflight）。
- **データ境界は `DataSource` インターフェース**（`src/data/dataSource.ts`）。`createD1DataSource(db)` は `@shisetsu-viewer/api/db/queries` の純関数へ D1 binding で委譲する薄いラッパ、`createHttpDataSource(endpoint, auth)` は同じ形を REST で満たす。ツール実装はどちらかを知らない。
- **罠**: `DataSource` と role はリクエストごとに生成して `createServer({ dataSource, allowReservations })` へ注入する。モジュールスコープに置くと、Workers の isolate が `await` を跨いで並行リクエストの値に差し替えるため、ユーザー間で認証状態が混線する（stdio では 1 プロセス 1 ユーザーなので顕在化しない）。
- worker の認可は `@cloudflare/workers-oauth-provider` の consent / upstream ヘルパーに乗る（`GET /authorize` で同意画面、`POST /authorize` で承認後に初めて Auth0 へ PKCE 付きで送る、`/callback` は `finishUpstream` で cookie と state を突き合わせる）。上流 IdP へ転送するプロキシなので、同意画面を省くと confused deputy になる。DCR は開けない。
- worker は `resolveRole(upstreamAccessToken, env)` を per-request に呼び、`role === "user"` のときだけ reservations 系ツールを露出する（`allowReservations`）。**trial ユーザーは anonymous 扱い**で、現行 viewer の UI ゲートと同義。
- Tools: 常時 = `listInstitutions` / `getInstitutionDetail`、`allowReservations` 時のみ = `getInstitutionReservations` / `searchReservations`、`write` 注入時のみ = `upsertReservations` / `upsertInstitutions`。Resource: `municipalities`（shared registry）。Prompts: `guide` / `searchAvailableRooms`。
- `getInstitutionReservations` の取得上限は `RESERVATIONS_HARD_CAP`（1000）。D1 側は 100 件ずつカーソルで回して詰める。
- CLI 例: `npm run cli -w @shisetsu-viewer/mcp-server -- search --start-date 2026-03-15 --end-date 2026-03-31 --evening`（`login` / `logout` / `--help` あり）。

## Environment

- **Workers**: wrangler secrets `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `AUTH0_AUDIENCE`（Auth0 Regular Web App の値）+ KV binding `OAUTH_KV` + D1 binding `DB`（`shisetsu-db`、api と同一 DB）。デプロイは Workers Builds（master のみ、監視パスは `package-lock.json`・`packages/shared/**`・`packages/api/**`・このパッケージ）。CIMD の取得に `compatibility_flags` の `global_fetch_strictly_public` が要る。
- **local stdio**: `.env` の `API_ENDPOINT` と `ADMIN_API_KEY`（`src/env.ts` がどちらも必須として throw する）。
- **cli**: `API_ENDPOINT` + Auth0 PKCE で取得したユーザートークン。
