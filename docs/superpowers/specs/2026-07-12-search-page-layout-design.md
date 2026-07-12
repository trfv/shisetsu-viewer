# 検索ページ共通化（SearchPageLayout）設計

- 日付: 2026-07-12
- 対象: `packages/viewer`
- 位置づけ: 再構築計画 PR4-3c。`docs/superpowers/specs/2026-07-11-repository-rebuild-design.md` の viewer 系リファクタの一部。

## 背景と目的

`pages/Institution.tsx` と `pages/Reservation.tsx` は検索ページとして同型である。
両者は `useQueryParams` + `usePaginatedQuery` + `SearchForm` + `DataTable` を同じ骨格で組み立てており、描画シェルと定型ロジックが重複している。

裏取りで特定した重複は以下のとおり。

- CSS モジュール `Institution.module.css` と `Reservation.module.css` はバイト単位で完全一致。
- チェックボックス群のトグルハンドラが計 5 箇所（Institution 2 + Reservation 3）で同一パターン。
- map ベースの絞り込み chip 生成が 5 ブロックでほぼ同一。
- 描画シェル（`main > searchBox > SearchForm` と結果 Box の Spinner / NoData / DataTable 分岐、末尾の error Snackbar）が構造同一。

一方で、head 配線（クエリパラメータ構成、`toXxxSearchParams`/`toXxxQueryVariables`/セレクタ）と、Reservation 固有の日付連動ハンドラ・除外自治体・`minDate`/`maxDate`・COLUMNS・行形状は真に異なる。

目的は、**同型の描画シェルと定型ロジックだけを薄く抽出し、差分の深い head 配線とページ固有ロジックは各ページに残す**ことで、重複を減らしつつ leaky abstraction を避けることである。

抽象度は「薄い抽出」を採用する。設定駆動の単一コンポーネント（`<SearchPage config>`）は、日付連動・除外自治体・行形状の差分がすべて設定側の分岐に流れ込み間接化・leaky になるため採らない。

## 方針: 薄い抽出

### ユニット 1: `components/SearchPageLayout/`

検索ページの描画シェルを担う presentational component。ロジックを持たず、props を受けて描画するだけ。
これにより 2 ページから独立して単体テストできる。

```
components/SearchPageLayout/
├── SearchPageLayout.tsx
├── SearchPageLayout.module.css   # 両 page.module.css と同一内容を移設
├── SearchPageLayout.test.tsx
└── index.ts
```

Props（`<T extends Row>` ジェネリック）:

| prop | 型 | 用途 |
|------|-----|------|
| `chips` | `ChipItem[]` | `SearchForm` へ渡す |
| `controls` | `ReactNode` | Select / CheckboxGroup 群（各ページ固有） |
| `loading` | `boolean` | Spinner 表示判定に使用 |
| `fetchingMore` | `boolean` | Spinner 表示判定に使用（内部で `loading && !fetchingMore`） |
| `empty` | `boolean` | 「データなし」表示。各ページが `!municipality \|\| !rows?.length` を計算して渡す |
| `columns` | `Columns<T>` | `DataTable` へ委譲 |
| `rows` | `T[]` | `DataTable` へ委譲 |
| `onRowClick` | `(params: RowParams<T>) => void` | `DataTable` へ委譲 |
| `fetchMore` | `() => Promise<void>` | `DataTable` へ委譲 |
| `hasNextPage` | `boolean` | `DataTable` へ委譲 |
| `error` | `Error \| undefined` | 末尾 Snackbar 表示 |

描画構造（現行 2 ページと同一）:

```tsx
<main className={styles["pageBox"]}>
  <div className={styles["searchBox"]}>
    <div className={styles["searchBoxForm"]}>
      <SearchForm chips={chips}>{controls}</SearchForm>
    </div>
  </div>
  <div className={styles["resultBox"]}>
    {loading && !fetchingMore ? (
      <div className={styles["resultBoxNoData"]}><Spinner /></div>
    ) : empty ? (
      <div className={styles["resultBoxNoData"]}>表示するデータが存在しません</div>
    ) : (
      <DataTable columns={columns} rows={rows} onRowClick={onRowClick}
        fetchMore={fetchMore} hasNextPage={hasNextPage} />
    )}
  </div>
  {error && <Snackbar open={true} message={error.message} />}
</main>
```

`empty` を boolean prop として外出しするのが要点。
「自治体未選択」判定はページ固有なので layout に持たせず、ページが計算した結果だけを渡す。
これで layout は純粋な表示器になり、`municipality` などの概念を知らずに済む。

付随変更:

- `pages/Institution.module.css` と `pages/Reservation.module.css` を削除し、内容を `SearchPageLayout.module.css` に移設する（両者は完全一致で、この 5 クラス `pageBox`/`searchBox`/`searchBoxForm`/`resultBox`/`resultBoxNoData` しか使っていない）。
- `components/DataTable/DataTable.tsx` の `RowParams<T>` と `Row` を export する（現状いずれも未 export）。`RowParams<T>` は layout の `onRowClick` 型に、`Row` は layout のジェネリック制約 `<T extends Row>` に必要。

### ユニット 2: `utils/search.ts` の純粋ヘルパ 2 つ

```ts
// チェックボックス群のトグル（現在 5 箇所で重複）
export const toggleArrayParam = <T extends string>(
  current: T[],
  value: string,
  checked: boolean
): T[] => (checked ? current.concat(value as T) : current.filter((v) => v !== value));

// map ベースの絞り込み chip 生成（現在 5 ブロックで重複）
export const buildFilterChips = <T extends string>(
  map: Record<T, string>,
  selected: T[],
  onChange: (next: T[]) => void
): { label: string; onDelete: () => void }[] =>
  (Object.entries(map) as [T, string][])
    .filter(([v]) => selected.includes(v))
    .map(([v, label]) => ({
      label,
      onDelete: () => onChange(selected.filter((s) => s !== v)),
    }));
```

いずれも純粋関数。`utils/search.test.ts`（既存）にユニットテストを追加する。

各ページのトグルハンドラは `toggleArrayParam` を使って書き換える。例:

```ts
const handleInstitutionSizesChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;
    setQueryParams({ i: toggleArrayParam(institutionSizes, value, checked) });
  },
  [setQueryParams, institutionSizes]
);
```

各ページの楽器・サイズ・絞り込み chip ブロックは `buildFilterChips` を使って書き換える。例:

```ts
const chips = [
  ...municipalityChip, // 地区 chip はページに残す（下記）
  ...buildFilterChips(AVAILABLE_INSTRUMENT_MAP, availableInstruments, (next) =>
    setQueryParams({ a: next })
  ),
  ...buildFilterChips(INSTITUTION_SIZE_MAP, institutionSizes, (next) =>
    setQueryParams({ i: next })
  ),
];
```

### 各ページに残すもの（意図的に畳まない）

- head 配線（`useLocation`/`useSearch`/`useQueryParams`/`useMemo(searchParams)`/`usePaginatedQuery`）。param 構成が `m/a/i` と `m/df/dt/f/a/i` で異なる。
- 地区 Select の一行ハンドラと、地区 chip（単一条件で差分あり、一行のため YAGNI）。
- Reservation 固有の日付連動ハンドラ・除外自治体・`minDate`/`maxDate`。差分が深い。
- `COLUMNS` と `onRowClick` の行形状（`row.id` と `row.institution?.id`）。

## テスト

純粋リファクタであり挙動は不変。回帰検知の主網は既存の `pages/Institution.test.tsx` と `pages/Reservation.test.tsx`（内容無変更）。
加えて:

- `SearchPageLayout.test.tsx`: loading / empty / data の 3 状態の描画分岐と、`error` 指定時の Snackbar 表示を検証する。
- `utils/search.test.ts`: `toggleArrayParam`（追加・除去・型）と `buildFilterChips`（選択済みのみ・onDelete が対象値を除いた配列で onChange を呼ぶ）を検証する。

## 完了基準

- `npm run typecheck:all` が緑。
- viewer vitest 全緑（既存 + 新規）。
- `npm run lint:all`（`--max-warnings=0`）が緑。
- `Institution.tsx`/`Reservation.tsx` の重複したトグルハンドラ・chip ブロック・描画シェルが解消されている。
- `pages/Institution.module.css`/`pages/Reservation.module.css` が削除され、`SearchPageLayout.module.css` に一本化されている。

## 非目標

- head 配線の共通化（`useSearchPage` フック）。今回は採らない。
- 設定駆動の単一 `<SearchPage>` コンポーネント。leaky になるため採らない。
- COLUMNS 定義や `toXxxSearchParams`/`toXxxQueryVariables` の統合。
- 地区 Select ハンドラ・地区 chip の抽出。
