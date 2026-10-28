# viewer Async React 移行計画

**Goal:** viewer のデータ取得を「useEffect + loading/error state」から「キャッシュした Promise + `use()` + Suspense / ErrorBoundary」へ移す。フィルタ変更や続きの読み込みで起きる Spinner のちらつきを、transition（`useDeferredValue` / `useTransition`）で解消する。そのうえで、表示の切り替わりを `<ViewTransition>` でつなぐ。

**背景:** Async React。ちらつきやポップインは性能ではなく coordination の問題で、Event → Update → Render → Commit の間の非同期区間を Transition・Suspense・`useOptimistic`・`ViewTransition` で埋める、という整理。

**Tech Stack:** React 19.3、wouter 3.13、vitest 5 browser mode + MSW、oxlint（`react/exhaustive-deps: error`）。

## Global Constraints

- 型チェックは `npm run typecheck:all`、lint は `npm run lint:all`（`--deny-warnings`）。
- viewer の単一テストは `npm run test:ci -w @shisetsu-viewer/viewer -- <path>`。`renderWithProviders()` は async。
- データ層の根拠は vitest（MSW）に置く。E2E は API 契約を見ないので、緑でも根拠にしない。
- UI は一般的な作法の最小構成にする。補足表示や独自挙動は足さず、頼まれていない配置・ラベルは動かさない。ViewTransition は依頼を受けて入れるが、演出は既定のクロスフェードに留める。
- コメントはルートの CLAUDE.md（Why not だけ）に従う。
- 1 PR = 1 フェーズ。各 PR で既存のページテストの What（表示される内容）を保つ。

---

## 現状の分類

useEffect は 22 か所ある。置き換えるのは ① と ② で、③ は useEffect の本来の用途なので残す。

| 種類             | 箇所                                                                                                      | 方針                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| ① データ取得     | `hooks/useApiQuery.ts`、`hooks/usePaginatedQuery.ts`、`contexts/Auth.tsx`                                 | Promise キャッシュ + `use()` + Suspense |
| ② 外部ストア購読 | `hooks/useIsMobile.ts`、`contexts/ColorMode.tsx`（`prefers-color-scheme`）                                | `useSyncExternalStore`                  |
| ③ DOM 副作用     | `Drawer`、`HeaderMenuButton`、`SettingsMenu`、`MultiSelect`、`Snackbar`、`ColorMode` の `data-theme` 反映 | 現状維持                                |

① が抱えている問題:

- `cancelled` フラグ、`fetcherRef`、`exhaustive-deps` の disable で競合と依存配列を手作業で管理している。
- フィルタを変えるたびに `loading` が true に戻り、表を消して Spinner を出す。
- 「`/auth/me` より先に api を叩かない」という順序制御を、各フックの中の `authLoading` で書いている。
- `error` を state で受け取り、`throw new Error(error.message)` で ErrorBoundary に投げ直している。

## 設計

### Promise キャッシュ（`api/cache.ts`）

- key → `{ promise, expiresAt }` の Map をモジュールに置く。TTL はすべての key で 60 秒。`use()` に渡す Promise は render をまたいで同一である必要があり、render 中に `fetch()` すると StrictMode の二重 render や再 render のたびに再サスペンドするため。
- 失敗した Promise も TTL まで残す。消すと、マウント前にサスペンドしたコンポーネント（Promise を自分で作る検索結果など）が再試行のたびに取り直し、失敗し続ける取得が止まらない。検索ページは条件を変えれば key が変わるので取り直せる。
- 保存する Promise には空の `.catch()` を付ける。先読みしただけで誰も `use()` しないまま reject されると `unhandledrejection` が起き、ルートの ErrorBoundary が全画面エラーに切り替わるため。
- TTL の判定は key が変わったとき（マウント時・フィルタ変更時）だけ行う。同じ key の再 render（`useIsMobile` の変化など）で Promise を差し替えると、再サスペンドしてちらつく。実装は `useCachedPromise(key, fetcher)` の中で `useMemo(() => cached(key, fetcher), [key])` とする。
- 同じ key は画面をまたいで共有する（例: `scrape-runs` は Detail と Reservation の両方で使う）。D1 rows read の節約にもなる。
- テスト用に `resetCache()` を export し、setup の `beforeEach` で呼ぶ。

### Auth（`contexts/Auth.tsx`）

- `AuthContext` に入れるのは値ではなく `Promise<Me>` にする。`useAuth()` は `use(use(AuthContext))`。
- `isLoading` は廃止する。読み込み中は、最寄りの Suspense の fallback が表示を担う。
- アプリ全体を `/auth/me` の解決まで止めないよう、Promise は上位で作って配り、`use()` するのは必要な末端だけにする。Header は即座に描画し、ログインボタンだけを自前の Suspense で包む（fallback は今の「読み込み中...」のボタン）。
- 「`/auth/me` より先に api を叩かない」制約は、`useCachedPromise` の先頭で `useAuth()` を呼ぶことで構造的に守る。`use()` がサスペンドすれば後続の fetch は作られない。罠の説明はこの 1 か所にだけ書く。
- `login` / `logout` は状態に依存しないので、context から外して普通の関数として export する。

### 単発取得（Detail）

- `DetailContent` で `use(useCachedPromise(...))` を呼ぶ。fallback には、今の `loading` 表示（タイトルの Skeleton と `InstitutionTab loading`）をそのまま流用する。
- `ReservationTab` は自前の Suspense（fallback は Spinner）で包み、施設情報タブの表示を予約データの取得で止めない。
- 予約データと `scrape-runs` は、**両方の Promise を作ってから** `use()` する。片方を `use()` してからもう片方を作るとウォーターフォールになる。
- `scrape-runs` は補助情報で、今は失敗しても無視している。挙動を保つため、`.catch(() => ({ items: [] }))` を付けてからキャッシュする。

### ページング（Institution / Reservation / Detail の予約タブ）

```tsx
const [pages, setPages] = useState(() => [firstPagePromise]);
const resolved = pages.map((p) => use(p));
const [isPending, startTransition] = useTransition();
const fetchMore = () => {
  const cursor = resolved.at(-1)?.pageInfo.endCursor;
  if (isPending || !cursor) return;
  const next = fetchPage(cursor);
  startTransition(() => setPages((ps) => [...ps, next]));
};
```

- 次のページの Promise は更新関数の外で作る。React は更新関数を再実行することがあり、中で取得すると呼ばれるたびに別の Promise になって解決しない。
- `use()` はループの中や条件分岐の中で呼べる。oxlint の `rules-of-hooks` も通ることを確かめた（`useState` を同じ形で書くとエラーになる）。
- `fetchingMore` は `isPending` で置き換える。transition の中で追加したページがサスペンドしても、既存の行は残る。
- 結果リストは `key={queryKey}` で包む。条件が変わったら `pages` を初期化する。
- 続きのページはキャッシュしない。1 ページ目だけを `cached()` に通す。

### フィルタ変更（検索 2 ページ）

- wouter の `useLocation` / `useSearch` は内部で `useSyncExternalStore` を使う（`node_modules/wouter/src/use-browser-location.js` などで確認）。外部ストアの更新は `startTransition` で包んでも同期更新になるので、`setLocation` を transition にしても古い表は残らず、fallback に落ちる。
- 代わりに、URL から作った条件に `useDeferredValue` をかける。古い表を表示したまま、裏で新しい条件の描画を準備できる。
- deferred にするのは `JSON.stringify(queryParams)` の文字列にする。`useQueryParams` の `values` は毎 render 新しいオブジェクトを返すので、オブジェクトのままだと常に「更新中」と判定される。
- 更新中（`queryKey !== deferredQueryKey`）は、結果の領域を薄くし（`opacity` を下げる）、`aria-busy="true"` を付ける。文言やスピナーは足さない。
- 初回表示とページの直接読み込みは、今と同じく Spinner の fallback を出す。

### エラー

- `components/utils/ErrorBoundary.tsx` に `resetKey` を足し、key が変わったらエラー状態を解除する。検索ページでは結果の領域だけを包み、`resetKey={queryKey}` にする。フィルタを変えれば復帰でき、フォームは使えるまま残る。
- 検索ページのエラー表示は、今の `SearchPageLayout` と同じ Snackbar とメッセージにする。
- `unhandledrejection` の listener は、移行後に要否を見直す。fetch の失敗が render 経由で届くようになるので不要になる見込みだが、外すのは PR2 で動作を確かめてからにする。

### ViewTransition

React 19.3 では `ViewTransition` が安定版として export されている（`node_modules/react/cjs/react.production.js` と `@types/react` で確認）。`@types/react` の説明によると、起動するのは非同期の更新だけで、具体的には `startTransition`、`useDeferredValue`、Actions、Suspense の fallback から中身への切り替わりである。同期更新ではアニメーションせず、即座に commit される。PR1・PR2 で作る構造がそのまま起点になる。

| 場面                            | 起点                                           | 演出                                                      |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| 初回表示・Detail の読み込み完了 | Suspense が fallback から中身へ切り替わる      | Spinner / Skeleton から中身へのクロスフェード             |
| フィルタ変更                    | `useDeferredValue`                             | 結果領域全体のクロスフェード                              |
| 続きのページ追加                | `startTransition`                              | なし。`default="none"` で止める（画面外に足すだけなので） |
| ページ遷移・タブ切り替え        | wouter の `setLocation` と `setTab` は同期更新 | なし（起動しない）                                        |

- 境界は `SearchPageLayout` の結果領域と、Detail のタイトル・各タブの Suspense に置く。`name` は付けず、既定の `auto` に任せる。
- 行単位の演出（条件変更で残る行は位置を移し、増減する行はフェードする）は、行ごとに `<ViewTransition key={row.id}>` で包めば作れる。ただし 1 ページ 50 件（api の `DEFAULT_LIMIT`）で、無限スクロール後は数百行になる。各行がスナップショットの対象になるので、まず計測する。条件は、数百行・モバイルのスロットリング下で、DevTools Performance に 50ms を超えるフレームが出ないこと。超えたら行単位は入れず、領域のクロスフェードだけにする。
- `prefers-reduced-motion: reduce` のときは、`::view-transition-group(*)` などのアニメーションを `theme.css` で止める。ブラウザは自動では止めない。
- View Transition API に未対応のブラウザでは、React がアニメーションなしで更新する。代替の実装は書かない。
- 遷移中は `::view-transition` の疑似要素が画面を覆い、クリックが下の要素に届かない。vitest browser mode と Playwright は実際の Chromium で動くので、操作が取りこぼされてテストが不安定になりうる。テストの setup では、疑似要素のアニメーションを `animation: none` にする CSS を差し込む。

## PR 分割

### PR1: キャッシュ・Auth・Detail

- [ ] `api/cache.ts`（`cached` / `resetCache`）と `hooks/useCachedPromise.ts`、それぞれのテスト
- [ ] `contexts/Auth.tsx` を Promise を配る形にし、`login` / `logout` を関数で export する
- [ ] `AuthGuard` から `isLoading` 分岐を消す
- [ ] `SettingsMenu` のログインボタンを Suspense で包む
- [ ] `ErrorBoundary` に `resetKey` を足す
- [ ] `pages/Detail.tsx` を `use()` に移す（予約タブのページングは PR2 で）
- [ ] `test/utils/test-utils.tsx` の `MockAuthProvider` を Promise を配る形に変え、`isLoading` を消す。setup に `resetCache()` を入れる
- [ ] `App.test.tsx`、`test/integration/authFlow.test.tsx`、`AuthGuard.test.tsx`、`SettingsMenu.test.tsx`、`Detail.test.tsx` を追従させる

### PR2: ページングと検索 2 ページ

- [ ] ページングを上記の形で実装する（`hooks/usePromisePages.ts` などの名前で切り出すかは、3 か所の重複を見て決める）
- [ ] `pages/Institution.tsx`、`pages/Reservation.tsx` に `useDeferredValue` を入れ、更新中は結果の領域を薄くして `aria-busy` を付ける
- [ ] `SearchPageLayout` の props から `loading` / `fetchingMore` / `error` を外し、Suspense と ErrorBoundary を内側に持たせる
- [ ] Detail の予約タブもページングに移す
- [ ] `useApiQuery` / `usePaginatedQuery` とテストを削除する
- [ ] `unhandledrejection` listener の要否を判断する
- [ ] 手元でフィルタ連打・戻る/進む・無限スクロールを実際に操作して確かめる（`/run`）

### PR3: 外部ストア購読

- [ ] `useIsMobile` を `useSyncExternalStore(subscribe, () => matchMedia(query).matches)` に移す
- [ ] `ColorMode` の `prefersDark` を同様に移す。`data-theme` の反映は useEffect のまま残す

### PR4: ViewTransition（PR2 のあと）

- [ ] テストの setup（vitest と Playwright）に、view transition のアニメーションを止める CSS を入れる。先に入れておき、以降の変更でテストが不安定にならないようにする
- [ ] `theme.css` に `prefers-reduced-motion` 用の指定を入れる
- [ ] `SearchPageLayout` の結果領域と Detail の Suspense 境界を `<ViewTransition>` で包む。続きのページ追加は `default="none"` にする
- [ ] 行単位の演出を試作し、上記の条件で計測する。採否と計測値を PR 本文に書く
- [ ] 手元で、フィルタの連打・戻る/進む・無限スクロール・reduced motion を実際に操作して確かめる（`/run`）

## 対象外

- `useOptimistic`、action props、`useActionState`: viewer には書き込み操作がない。
- ページ遷移のアニメーション: wouter の遷移は同期更新なので ViewTransition が起動しない。transition で遷移させるにはルーター側に手を入れる必要があり、今回の範囲を超える。
- データ取得ライブラリ（TanStack Query など）の導入: 必要なのは key → Promise のキャッシュと TTL だけで、自前で数十行に収まる。依存を増やさない。

## 決定事項

- キャッシュ TTL は、すべての key で一律 60 秒にする。key の種類ごとに変えるのは、必要が出てからにする。
- 更新中は結果の領域を薄くする。古い表がそのまま残るだけだと、条件を変えたのに反応がないように見えるため。
- テストの `MockAuthProvider` には、解決済みの素の Promise を渡す。`use()` は 1 回サスペンドするが、`render` が `act()` の中で解決を流すことと、`expect.element` のリトライで吸収できる見込み。PR1 の最初のテストで確かめ、不安定なら `status: "fulfilled"` と `value` を付けた thenable に切り替える。この切り替えは `test/utils/test-utils.tsx` の中だけで行い、本番コードには入れない。
