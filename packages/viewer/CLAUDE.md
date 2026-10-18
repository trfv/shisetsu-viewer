# Viewer Package

React 19 SPA + BFF（`worker/`）。ソースはパッケージ直下（`src/` なし）。テストは `TZ=Asia/Tokyo`。

- Router は wouter、スタイルは CSS Modules + `theme.css`。MUI・React Router は使わない。
- ブラウザはトークンを持たない。BFF が Cookie のセッションから Auth0 のアクセストークンを付けて api へ転送する。BFF はユーザー情報を D1 に書かない（個人情報は Auth0 に隔離する方針）。
- BFF が転送するのは `worker/proxy.ts` に列挙した経路だけ。api に読み取り経路を足したらここにも足す。

## Testing の罠

- vitest 5 browser mode。`getByText` / `toHaveTextContent` は完全一致がデフォルト（部分一致は `{ exact: false }` / `toMatchTextContent`）。queryBy* / findBy* は無い。
- setupFiles の `vi.mock` はテストファイル側の import には効かない。mock を操作するテストはファイル先頭でも `vi.mock` する。
- `renderWithProviders()` は async。
- BFF のテスト（`npm run test:worker`、Cloudflare pool）では `vi.mock` が効かない。Auth0 への通信は `createWorker({ fetch })` で差し替える。
- MSW の worker が要る: `npx msw init public -w @shisetsu-viewer/viewer`
