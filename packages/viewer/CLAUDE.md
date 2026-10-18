# Viewer Package

React 19 SPA + BFF。Cloudflare Workers にデプロイ（`wrangler.jsonc`）。SPA は静的アセットで、`/auth/*` と `/api/*` だけ Worker（`worker/`）が処理する。Source files live at package root (no `src/`). Tests run with `TZ=Asia/Tokyo`.

## Non-obvious Constraints

- **データ層は `packages/api` の型付き REST**（Hasura GraphQL から移行済み・PR3-3）。自作 fetch client `api/client.ts`（`apiGet<T>(url, params)`）+ 型付きエンドポイント `api/endpoints.ts`。DTO 型は `@shisetsu-viewer/shared` の `apiTypes.ts`（`InstitutionSummary` / `InstitutionDetail` / `ReservationDto` / `ReservationSearchHit` / `Page<T>` 等）。データ取得は `useApiQuery<T>(fetcher, key)` と `usePaginatedQuery<TItem>(fetchPage, key)`（keyset カーソル `cursor`・`fetchMore()`）。ベース URL は同一オリジンの `/api`。ブラウザはトークンを持たず、BFF が Cookie のセッションから Auth0 のアクセストークンを付けて api へ転送する。
- Router は wouter。React Router との対応: `Navigate` → `Redirect`、`useNavigate()` → `useLocation()[1]`、location 読取は `useLocation()[0]` + `useSearch()`。ページは App.tsx 内で `React.lazy()` インライン定義（router ファイルなし）。
- Styling は CSS Modules + `theme.css` の CSS custom properties。dark mode は `<html data-theme="...">`（`contexts/ColorMode.tsx`、localStorage 永続化）。MUI は不使用。
- Auth: IdP は Auth0（Google 接続のみ）。`contexts/Auth.tsx` は `/auth/me` を叩くだけ。認証必須ルート（Reservation）は `components/utils/AuthGuard` で保護。設計は `docs/superpowers/specs/2026-10-18-auth0-bff-design.md`。
- **BFF はユーザー情報を D1 に書かない**（個人情報は Auth0 に隔離する方針）。セッションは AES-GCM で暗号化した `__Host-session` Cookie に入る（`worker/session.ts`）。
- BFF が api へ転送するのは `worker/proxy.ts` の読み取り 5 経路だけ。api に読み取り経路を足したらここにも足す。
- Enum・自治体データは `@shisetsu-viewer/shared` から（`constants/enums.ts` 経由で再輸出）。

## Testing

- Vitest 5 browser mode（Chromium via Playwright provider）+ vitest-browser-react。`test/browser-setup.ts` が MSW 2 worker と polyfill を初期化。`test/mocks/handlers.ts` が `/auth/me` の既定応答（ログイン済み user）を持つ。
- **BFF**: `@cloudflare/vitest-plugin`（`vitest.worker.config.ts`、`npm run test:worker`）。browser mode 側からは除外している。Auth0 への通信は `createWorker({ fetch })` で差し替える（この pool では `vi.mock` が効かない）。
- **setupFiles の `vi.mock` はテストファイル側の import には効かない**（vitest 5）。mock を直接操作するテストは、そのファイルの先頭でも `vi.mock` する。
- `renderWithProviders()`（`test/utils/test-utils.tsx`）は **async**。MockAuthProvider + wouter memoryLocation でラップし（認証状態は `authConfig` で差し替える）、`user`（vitest/browser userEvent）+ RenderResult（locator セレクタ）を返す。`screen` は `page`（locator。遅延評価・自動リトライ）の再輸出。
- assertion は `await expect.element(locator).toBeInTheDocument()` 形式。queryBy*/findBy*/getAllBy* は存在しない（不在確認は getBy + not、複数要素は `.all()`）。vitest 5 では `getByText` と `toHaveTextContent` は完全一致がデフォルト。部分一致や正規表現は `{ exact: false }` / `toMatchTextContent` を使う。DOM 直接アクセスは `.element()` を挟む。
- MSW worker の生成が必要: `npx msw init public -w @shisetsu-viewer/viewer`

## Environment

`VITE_*` のビルド変数は無い。Worker の Secret（`AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `SESSION_KEYS`）は本番では `wrangler versions secret put`、ローカルでは `.dev.vars.example` → `.dev.vars`。
