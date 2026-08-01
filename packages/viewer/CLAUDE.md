# Viewer Package

React 19 SPA + BFF。Cloudflare Workers にデプロイ（`wrangler.jsonc`）。SPA は静的アセット、`/auth/*` と `/api/*` だけ Worker（`worker/`）が処理する。Key deps: wouter 3 (router), date-fns 4, jose。Build: Vite 8 + Oxc (@vitejs/plugin-react v6) + @cloudflare/vite-plugin。Source files live at package root (no `src/`)。Commands: see `package.json` scripts (`start`, `test:*`, `coverage`, `deploy`, `preview`; tests run with `TZ=Asia/Tokyo`)。

## Non-obvious Constraints

- **ブラウザはトークンを一切持たない**。認証は BFF が HttpOnly Cookie（`__Host-session`）で保持し、api へは寿命 60 秒の自前 JWT に付け替えて Service Binding で転送する。したがって `apiGet` は Authorization を付けず、`fetcher`/`fetchPage` も token を受け取らない。
- **データ層は `packages/api` の型付き REST**。自作 fetch client `api/client.ts`（`apiGet<T>(url, params)`）+ 型付きエンドポイント `api/endpoints.ts`（すべて同一オリジンの `/api/v1/...`）。DTO 型は `@shisetsu-viewer/shared` の `apiTypes.ts`。データ取得は `useApiQuery<T>(fetcher, key)` と `usePaginatedQuery<TItem>(fetchPage, key)`（keyset カーソル `cursor`・`fetchMore()`）。
- **`worker/` は別 tsconfig**（`worker/tsconfig.json`）。Workers の `Request`/`Response`/`caches` が SPA 側の DOM 型と衝突するため、ルートの tsconfig からは除外している。`typecheck` は `tsc && wrangler types && tsc -p worker`。
- Worker の `Env` は wrangler 生成の `Cloudflare.Env` に一本化。Secret は生成対象外なので `worker/secrets.d.ts` で補う。
- Router は wouter。React Router との対応: `Navigate` → `Redirect`、`useNavigate()` → `useLocation()[1]`、location 読取は `useLocation()[0]` + `useSearch()`。ページは App.tsx 内で `React.lazy()` インライン定義（router ファイルなし）。
- Styling は CSS Modules + `theme.css` の CSS custom properties。dark mode は `<html data-theme="...">`（`contexts/ColorMode.tsx`、localStorage 永続化）。MUI は不使用。
- Auth: `contexts/Auth.tsx` が `/auth/me` を叩いて `{ isLoading, authenticated, userInfo: { anonymous, trial } }` を配る。認証必須ルート（Reservation）は `components/utils/AuthGuard` で保護。`trial` は「トライアル期間中」を意味し、期限切れは `anonymous: true, trial: false` になる。
- Enum・自治体データは `@shisetsu-viewer/shared` から（`constants/enums.ts` 経由で再輸出）。
- **ローカルで `/api/*` を通すには api Worker も起動しておく**（`npm start -w @shisetsu-viewer/api`）。未起動だと service binding が `503 Worker "shisetsu-api" not found` を返す。`/auth/*` と静的配信は viewer 単体で動く。

## Testing

- **フロント**: Vitest 4 browser mode（Chromium via Playwright provider）+ vitest-browser-react。`test/browser-setup.ts` が MSW 2 worker と polyfill を初期化。`test/mocks/handlers.ts` が `/auth/me` の既定応答（ログイン済み user）を持つ。
- **BFF**: `@cloudflare/vitest-pool-workers`（`vitest.worker.config.ts`、`npm run test:worker`）。`worker/**/*.test.ts` が対象で、browser mode 側からは除外している。**wrangler.jsonc の service binding `API` はローカルに実体が無く、config でスタブを与えないと workerd 自体が起動しない**。
- `renderWithProviders()`（`test/utils/test-utils.tsx`）は **async**。MockAuthProvider + wouter memoryLocation でラップし、`user`（vitest/browser userEvent）+ RenderResult（locator セレクタ）を返す。認証状態は `authConfig` で差し替える。`screen` は `page`（locator。遅延評価・自動リトライ）の再輸出。
- assertion は `await expect.element(locator).toBeInTheDocument()` 形式。queryBy*/findBy*/getAllBy* は存在しない（不在確認は getBy + not、複数要素は `.all()`）。**Playwright locator の `getByText` は部分一致がデフォルト**なので、衝突し得る短い文字列には `{ exact: true }` を付ける。DOM 直接アクセスは `.element()` を挟む。
- MSW worker の生成が必要: `npx msw init public -w @shisetsu-viewer/viewer`
- E2E: Playwright（`e2e/`、chromium/firefox/webkit）。dev server は `webServer` 設定で自動起動。
- Coverage thresholds: branches/functions 60%, lines/statements 70%。

## Environment

`VITE_*` のビルド変数は無い。API は同一オリジンの `/api`、認証は Worker の Secret（`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SIGNING_KEYS`）で完結する。binding は `wrangler.jsonc`（`DB` / `API` / `ASSETS` / `AUTH_RATE_LIMITER`）で、オリジンの設定値は持たない。

**`redirect_uri` はリクエストのオリジンから導出する**（`worker/index.ts` の `callbackUri`）。本番・ブランチ preview・localhost のどこで動いても自動で正しくなる。代わりに **Google 側には使うオリジンごとに callback を登録する**必要がある（ワイルドカード不可）。

- 本番: `https://app.shisetsudb.com/auth/callback`
- ブランチ preview: `https://<branch>-shisetsu-viewer.<subdomain>.workers.dev/auth/callback`（ブランチ別名は安定）
- ローカル: `http://localhost:3000/auth/callback`

**ローカルでログインフローを通すには `.dev.vars` が要る**（`.dev.vars.example` をコピー）。Secret は Cloudflare 側に入れてもローカルには来ない。

**`.dev.vars` が供給するのは Secret だけで、binding は別**。`DB` は既定でローカルの疑似 D1、`API` はローカル起動の api を指す。本番リソースへ繋ぐには binding に `"remote": true`（remote bindings）が要るが、`API` を remote にすると本番の署名鍵をローカルに置く必要が生じる。**認証フローの検証はブランチ preview で行うほうが安全**。使い分けと注意点は `.dev.vars.example` の末尾に整理してある（ローカル開発の手順自体は未整備。宿題）。
