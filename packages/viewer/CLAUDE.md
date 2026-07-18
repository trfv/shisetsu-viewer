# Viewer Package

React 19 SPA for browsing facility reservation data. Deployed to Cloudflare Workers (`wrangler.jsonc`, SPA mode). Key deps: wouter 3 (router), @auth0/auth0-spa-js (dynamic import), date-fns 4. Build: Vite 8 + SWC. Source files live at package root (no `src/`). Commands: see `package.json` scripts (`start`, `test:*`, `coverage`, `deploy`, `preview`; tests run with `TZ=Asia/Tokyo`).

## Non-obvious Constraints

- **GraphQL は codegen なし・全部手書き**。自作 fetch client `api/graphqlClient.ts` + 手書きの query 文字列と型 `api/queries.ts`。データ取得は `useGraphQLQuery<T>()` と `usePaginatedQuery<TData, TNode>()`（Relay 形式カーソルページネーション、`fetchMore()`）。どちらも Auth0 token を自動注入する。
- Router は wouter。React Router との対応: `Navigate` → `Redirect`、`useNavigate()` → `useLocation()[1]`、location 読取は `useLocation()[0]` + `useSearch()`。ページは App.tsx 内で `React.lazy()` インライン定義（router ファイルなし）。
- Styling は CSS Modules + `theme.css` の CSS custom properties。dark mode は `<html data-theme="...">`（`contexts/ColorMode.tsx`、localStorage 永続化）。MUI は不使用。
- Auth: `contexts/Auth0.tsx` が Auth0Client をラップ。認証必須ルート（Reservation）は `components/utils/AuthGuard` で保護。
- Enum・自治体データは `@shisetsu-viewer/shared` から（`constants/enums.ts` 経由で再輸出）。

## Testing

- Vitest 4 browser mode（Chromium via Playwright provider）。`test/browser-setup.ts` が Auth0Client mock・MSW 2 worker・polyfill を初期化。
- `renderWithProviders()`（`test/utils/test-utils.tsx`）が MockAuth0Provider + wouter memoryLocation でラップし、`user`（vitest/browser userEvent）を返す。Testing Library ユーティリティも再輸出。
- MSW worker の生成が必要: `npx msw init public -w @shisetsu-viewer/viewer`
- E2E: Playwright（`e2e/`、chromium/firefox/webkit）。dev server は `webServer` 設定で自動起動。
- Coverage thresholds: branches/functions 60%, lines/statements 70%。

## Environment

`.env.sample` → `.env`（`VITE_GRAPHQL_ENDPOINT`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`）。
