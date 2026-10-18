# MCP Server Package

入口は 3 つ。Workers（`src/worker/`、MCP OAuth、read-only）、local stdio（`src/stdio.ts`、`ADMIN_API_KEY` で write 可）、CLI（`src/cli/`、Auth0 PKCE）。どれも `packages/api` の REST を読む。

## 罠

- `DataSource` と role はリクエストごとに作って `createServer()` へ注入する。モジュールスコープに置くと、Workers の isolate が `await` を跨いで並行リクエストの値に差し替え、ユーザー間で認証状態が混線する（stdio は 1 プロセス 1 ユーザーなので顕在化しない）。
- 同意画面を省かない。DCR を開けない。上流 IdP（Auth0）へ転送するプロキシなので confused deputy になる。
- trial ユーザーは anonymous 扱い（reservations 系ツールを出さない）。viewer の UI ゲートと揃えている。
- CIMD の取得に `compatibility_flags` の `global_fetch_strictly_public` が要る。
- 2025 系（`initialize` あり）の経路は `legacy: "stateless"` で残している。Workers ログの `mcpEra` で legacy が来なくなったのを確かめてから `legacy: "reject"` にする。
