# MCP Server Package

施設・予約データを AI 向けツールとして公開する MCP サーバー。`npm start` は local stdio モードで起動する。

## Entry Points と認証モード

| Entry                  | 用途                                  | クライアント認証                                                                      | データ経路                                                | Write tools |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `src/worker/worker.ts` | Cloudflare Workers デプロイ           | MCP OAuth（CIMD のみ、同意画面 → Auth0、トークンは KV `OAUTH_KV` に暗号化保存）       | `packages/api` へ Service Binding `env.API` + Bearer 転送 | 無効        |
| `src/stdio.ts`         | local stdio（dev/debug）              | なし                                                                                  | `packages/api` へ HTTP + `X-Admin-Key`                    | 有効        |
| `src/cli/cli.ts`       | shell から JSON 取得（AI agent 向け） | Auth0 Authorization Code + PKCE（`~/.config/shisetsu/tokens.json`、自動リフレッシュ） | `packages/api` へ HTTP + Bearer 転送                      | —           |

- **構成**: `src/data/`（DataSource とその REST 実装）→ `src/queries/`（入力スキーマと `execute*`。MCP に依存しない）→ `src/server/`（MCP への登録）。CLI は `queries` を直接呼び、同じ zod スキーマで引数を検証する。`src/worker/` は Workers 専用（OAuth、同意画面、preflight）。
- **MCP SDK は v2（`@modelcontextprotocol/server`）**。HTTP は `createMcpHandler`、stdio は `serveStdio` に `createServer` を factory として渡す。どちらも MCP 2026-07-28（`initialize` なし、リクエストごとに `_meta`）と 2025 系（`initialize` あり）の両方に同じ factory で応える。2025 系は `legacy: "stateless"`（リクエストごとの使い捨てインスタンス）なので、サーバーからクライアントへの要求（elicitation など）は使えない。worker は `/mcp` のリクエストごとに `{"mcpEra":"modern"|"legacy","userAgent":…}` をログに出す。Workers のログで legacy が来なくなったのを確かめたら、`createMcpHandler` と `serveStdio` を `legacy: "reject"` にして 2025 系を捨てる。
- 読み取り 4 ツールは `outputSchema` を持ち、`structuredContent` と同じ中身のテキスト JSON を返す。`/mcp` は preflight で Origin を検証する（自オリジンと claude.ai / claude.com のみ。Origin の無い要求は通す）。
- **データ境界は `DataSource` インターフェース**（`src/data/dataSource.ts`）。実装は `createHttpDataSource(endpoint, auth, fetchFn?)` の 1 つで、api の REST で満たす。worker は `fetchFn` に Service Binding の fetch を渡し、利用者の `CF-Connecting-IP` も転送する（api の RATE_LIMITER は検証済みの利用者を sub で、それ以外を IP で数える）。
- **罠**: `DataSource` と role はリクエストごとに生成して `createServer({ dataSource, allowReservations })` へ注入する。モジュールスコープに置くと、Workers の isolate が `await` を跨いで並行リクエストの値に差し替えるため、ユーザー間で認証状態が混線する（stdio では 1 プロセス 1 ユーザーなので顕在化しない）。
- worker の認可は `@cloudflare/workers-oauth-provider` の consent / upstream ヘルパーに乗る（`GET /authorize` で同意画面、`POST /authorize` で承認後に初めて Auth0 へ PKCE 付きで送る、`/callback` は `finishUpstream` で cookie と state を突き合わせる）。上流 IdP へ転送するプロキシなので、同意画面を省くと confused deputy になる。DCR は開けない。
- worker は `resolveRole(upstreamAccessToken, env)` を per-request に呼び、`role === "user"` のときだけ reservations 系ツールを露出する（`allowReservations`）。**trial ユーザーは anonymous 扱い**で、現行 viewer の UI ゲートと同義。
- Tools: 常時 = `list_institutions` / `get_institution_detail`、`allowReservations` 時のみ = `get_institution_reservations` / `search_reservations`、`write` 注入時のみ = `upsert_reservations` / `upsert_institutions`。Resource: `municipalities`（shared registry）。Prompts: `guide` / `search_available_rooms`。
- DataSource の `getInstitutionReservations` の取得上限は `RESERVATIONS_HARD_CAP`（1000）。api を 100 件ずつカーソルで回して詰める。
- CLI 例: `npm run cli -w @shisetsu-viewer/mcp-server -- search --start-date 2026-03-15 --end-date 2026-03-31 --evening`（`login` / `logout` / `--help` あり）。

## Environment

- **Workers**: vars `AUTH0_DOMAIN` / `AUTH0_AUDIENCE`（`wrangler.jsonc`）+ wrangler secrets `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET`（Auth0 Regular Web App の値）+ KV binding `OAUTH_KV` + Service Binding `API`（`shisetsu-api`）。デプロイは Workers Builds（master のみ、監視パスは `package-lock.json`・`packages/shared/**`・`packages/api/**`・このパッケージ）。CIMD の取得に `compatibility_flags` の `global_fetch_strictly_public` が要る。
- **local stdio**: `.env` の `API_ENDPOINT` と `ADMIN_API_KEY`（`src/env.ts` がどちらも必須として throw する）。
- **cli**: `API_ENDPOINT` + Auth0 PKCE で取得したユーザートークン。
