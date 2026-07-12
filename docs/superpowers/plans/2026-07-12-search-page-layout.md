# SearchPageLayout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Institution/Reservation の同型な描画シェルと定型ロジックを薄く抽出し、重複を解消する。

**Architecture:** presentational な `SearchPageLayout` に描画シェル（SearchForm + Spinner/NoData/DataTable + error Snackbar）を集約し、`utils/search.ts` に純粋ヘルパ `toggleArrayParam`/`buildFilterChips` を追加する。head 配線とページ固有ロジックは各ページに残す薄い抽出。

**Tech Stack:** React 19, wouter 3, TypeScript 7, Vitest 4（browser mode / Chromium）, CSS Modules。

## Global Constraints

- Node >= 24、ES Modules。
- 型チェックは `npm run typecheck:all`（各パッケージ `node ../../node_modules/typescript7/bin/tsc`）。素の `tsc` を叩かない。
- lint は `npm run lint:all`（`--max-warnings=0`）。
- コミットは `PATH="$PWD/node_modules/.bin:$PATH" git commit ...`（`--no-verify` 禁止）。各コミット末尾に `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_016R4pG7Saaw4Wr1xXSEGwZ5`。
- Prettier: printWidth 100, tabWidth 2, double quotes, trailing commas es5。
- viewer の CSS Modules クラス参照はブラケット記法 `styles["pageBox"]`。
- viewer テストは vitest browser mode。単一ファイル実行は `npm run test:ci -w @shisetsu-viewer/viewer -- <path>`。
- 純粋リファクタであり、既存の `pages/Institution.test.tsx`/`pages/Reservation.test.tsx` は無変更で緑を保つこと（回帰検知の主網）。

---

### Task 1: 純粋ヘルパ `toggleArrayParam` / `buildFilterChips`

**Files:**
- Modify: `packages/viewer/utils/search.ts`（末尾に追加）
- Test: `packages/viewer/utils/search.test.ts`（末尾に describe 追加）

**Interfaces:**
- Produces:
  - `toggleArrayParam<T extends string>(current: T[], value: string, checked: boolean): T[]`
  - `buildFilterChips<T extends string>(map: Record<T, string>, selected: T[], onChange: (next: T[]) => void): { label: string; onDelete: () => void }[]`

- [ ] **Step 1: 失敗するテストを書く**

`packages/viewer/utils/search.test.ts` の import に `buildFilterChips, toggleArrayParam` を追加し、ファイル末尾に追記する:

```ts
describe("toggleArrayParam", () => {
  test("checked のとき value を追加する", () => {
    expect(toggleArrayParam<AvailableInstrument>(["s"], "w", true)).toEqual(["s", "w"]);
  });

  test("unchecked のとき value を除去する", () => {
    expect(toggleArrayParam<AvailableInstrument>(["s", "w"], "w", false)).toEqual(["s"]);
  });

  test("unchecked で存在しない value なら変化しない", () => {
    expect(toggleArrayParam<AvailableInstrument>(["s"], "w", false)).toEqual(["s"]);
  });

  test("元の配列を破壊しない", () => {
    const current: AvailableInstrument[] = ["s"];
    toggleArrayParam(current, "w", true);
    expect(current).toEqual(["s"]);
  });
});

describe("buildFilterChips", () => {
  test("選択済みの値だけを chip 化する", () => {
    const chips = buildFilterChips(AVAILABLE_INSTRUMENT_MAP, ["s", "b"], () => {});
    expect(chips.map((c) => c.label)).toEqual(["弦楽器", "金管楽器"]);
  });

  test("選択が空なら空配列", () => {
    expect(buildFilterChips(AVAILABLE_INSTRUMENT_MAP, [], () => {})).toEqual([]);
  });

  test("onDelete は対象値を除いた配列で onChange を呼ぶ", () => {
    let received: string[] | undefined;
    const chips = buildFilterChips(AVAILABLE_INSTRUMENT_MAP, ["s", "b"], (next) => {
      received = next;
    });
    chips[0]!.onDelete();
    expect(received).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- utils/search.test.ts`
Expected: FAIL（`toggleArrayParam`/`buildFilterChips` が未定義）

- [ ] **Step 3: 実装を追加**

`packages/viewer/utils/search.ts` の末尾に追加:

```ts
export const toggleArrayParam = <T extends string>(
  current: T[],
  value: string,
  checked: boolean
): T[] => (checked ? current.concat(value as T) : current.filter((v) => v !== value));

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

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- utils/search.test.ts`
Expected: PASS

- [ ] **Step 5: 型チェック**

Run: `npm run typecheck:all`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/viewer/utils/search.ts packages/viewer/utils/search.test.ts && git commit ...
```
メッセージ: `feat(viewer): PR4-3c toggleArrayParam / buildFilterChips ヘルパ追加`

---

### Task 2: `SearchPageLayout` コンポーネント（DataTable の型 export 含む）

**Files:**
- Modify: `packages/viewer/components/DataTable/DataTable.tsx`（`Row`/`RowParams` を export）
- Modify: `packages/viewer/components/DataTable/index.ts`（`Row`/`RowParams` を re-export）
- Create: `packages/viewer/components/SearchPageLayout/SearchPageLayout.tsx`
- Create: `packages/viewer/components/SearchPageLayout/SearchPageLayout.module.css`
- Create: `packages/viewer/components/SearchPageLayout/index.ts`
- Test: `packages/viewer/components/SearchPageLayout/SearchPageLayout.test.tsx`

**Interfaces:**
- Consumes: `DataTable`, `Columns<T>`, `Row`, `RowParams<T>`（DataTable）, `SearchForm`, `Snackbar`, `Spinner`。
- Produces: `SearchPageLayout<T extends Row>(props: Props<T>)`。Props は spec の表のとおり（`chips`, `controls`, `loading`, `fetchingMore`, `empty`, `columns`, `rows`, `onRowClick?`, `fetchMore?`, `hasNextPage?`, `error?`）。

- [ ] **Step 1: DataTable の型を export**

`packages/viewer/components/DataTable/DataTable.tsx` の 8 行目と 10 行目を修正:

```ts
export type Row = { id: string } & { [key: string]: unknown };

export type RowParams<T> = {
```

`packages/viewer/components/DataTable/index.ts` を修正:

```ts
export { DataTable } from "./DataTable";
export type { Columns, Row, RowParams } from "./DataTable";
```

- [ ] **Step 2: CSS を移設**

`packages/viewer/pages/Institution.module.css` の内容を `packages/viewer/components/SearchPageLayout/SearchPageLayout.module.css` にコピーする（Institution/Reservation の module.css は完全一致のため、どちらをコピーしても同一）。

```bash
cp packages/viewer/pages/Institution.module.css packages/viewer/components/SearchPageLayout/SearchPageLayout.module.css
```

- [ ] **Step 3: 失敗するテストを書く**

`packages/viewer/components/SearchPageLayout/SearchPageLayout.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import type { Columns, Row } from "../DataTable";
import { SearchPageLayout } from "./SearchPageLayout";

type Foo = Row & { name: string };

const columns: Columns<Foo> = [{ field: "name", headerName: "名前", type: "string" }];
const rows: Foo[] = [{ id: "1", name: "施設A" }];

const baseProps = {
  chips: [],
  controls: <div>controls</div>,
  fetchingMore: false,
  columns,
  rows,
  hasNextPage: false,
} as const;

describe("SearchPageLayout", () => {
  test("loading 中は Spinner を表示する", () => {
    renderWithProviders(
      <SearchPageLayout {...baseProps} loading={true} empty={false} rows={[]} />
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("empty のときデータなしメッセージを表示する", () => {
    renderWithProviders(
      <SearchPageLayout {...baseProps} loading={false} empty={true} rows={[]} />
    );
    expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
  });

  test("データがあるとき DataTable の行を表示する", () => {
    renderWithProviders(<SearchPageLayout {...baseProps} loading={false} empty={false} />);
    expect(screen.getByText("施設A")).toBeInTheDocument();
  });

  test("error があるとき Snackbar にメッセージを表示する", () => {
    renderWithProviders(
      <SearchPageLayout
        {...baseProps}
        loading={false}
        empty={false}
        error={new Error("失敗しました")}
      />
    );
    expect(screen.getByText("失敗しました")).toBeInTheDocument();
  });

  test("行クリックで onRowClick が呼ばれる", async () => {
    const onRowClick = vi.fn();
    const { user } = renderWithProviders(
      <SearchPageLayout {...baseProps} loading={false} empty={false} onRowClick={onRowClick} />
    );
    await user.click(screen.getByText("施設A"));
    expect(onRowClick).toHaveBeenCalledOnce();
  });
});
```

注: `progressbar` ロールと `Snackbar` のメッセージ表示は、既存 `components/Spinner`/`components/Snackbar` の実装に合わせる。ロール名が異なる場合は該当コンポーネントのテスト（`Spinner.test.tsx`/`Snackbar.test.tsx`）を参照して合わせること。

- [ ] **Step 4: テストが失敗することを確認**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- components/SearchPageLayout`
Expected: FAIL（`SearchPageLayout` が未実装）

- [ ] **Step 5: コンポーネントを実装**

`packages/viewer/components/SearchPageLayout/SearchPageLayout.tsx`:

```tsx
import { type ReactNode } from "react";
import { DataTable, type Columns, type Row, type RowParams } from "../DataTable";
import { SearchForm } from "../SearchForm";
import { Snackbar } from "../Snackbar";
import { Spinner } from "../Spinner";
import styles from "./SearchPageLayout.module.css";

type ChipItem = {
  label: string;
  onDelete?: () => void;
};

type Props<T extends Row> = {
  chips: ChipItem[];
  controls: ReactNode;
  loading: boolean;
  fetchingMore: boolean;
  empty: boolean;
  columns: Columns<T>;
  rows: T[];
  onRowClick?: (params: RowParams<T>) => void;
  fetchMore?: () => Promise<void>;
  hasNextPage?: boolean;
  error?: Error | undefined;
};

export const SearchPageLayout = <T extends Row>({
  chips,
  controls,
  loading,
  fetchingMore,
  empty,
  columns,
  rows,
  onRowClick,
  fetchMore,
  hasNextPage,
  error,
}: Props<T>) => {
  return (
    <main className={styles["pageBox"]}>
      <div className={styles["searchBox"]}>
        <div className={styles["searchBoxForm"]}>
          <SearchForm chips={chips}>{controls}</SearchForm>
        </div>
      </div>
      <div className={styles["resultBox"]}>
        {loading && !fetchingMore ? (
          <div className={styles["resultBoxNoData"]}>
            <Spinner />
          </div>
        ) : empty ? (
          <div className={styles["resultBoxNoData"]}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            columns={columns}
            fetchMore={fetchMore}
            hasNextPage={hasNextPage}
            onRowClick={onRowClick}
            rows={rows}
          />
        )}
      </div>
      {error && <Snackbar open={true} message={error.message} />}
    </main>
  );
};
```

`packages/viewer/components/SearchPageLayout/index.ts`:

```ts
export { SearchPageLayout } from "./SearchPageLayout";
```

- [ ] **Step 6: テストが通ることを確認**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- components/SearchPageLayout`
Expected: PASS

- [ ] **Step 7: 型チェック**

Run: `npm run typecheck:all`
Expected: エラーなし

- [ ] **Step 8: コミット**

メッセージ: `feat(viewer): PR4-3c SearchPageLayout 追加 + DataTable の Row/RowParams を export`

---

### Task 3: Institution.tsx をリファクタ

**Files:**
- Modify: `packages/viewer/pages/Institution.tsx`
- Delete: `packages/viewer/pages/Institution.module.css`
- 既存テスト（無変更）: `packages/viewer/pages/Institution.test.tsx`

**Interfaces:**
- Consumes: `SearchPageLayout`（Task 2）, `toggleArrayParam`/`buildFilterChips`（Task 1）。

- [ ] **Step 1: 既存テストが緑であることを確認（ベースライン）**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- pages/Institution.test.tsx`
Expected: PASS（リファクタ前の緑）

- [ ] **Step 2: import を差し替える**

`packages/viewer/pages/Institution.tsx` の import を修正:
- 削除: `DataTable`（`type Columns` は COLUMNS 定義に残すため保持）, `SearchForm`, `Snackbar`, `Spinner`, `ROUTES` は残す, `import styles from "./Institution.module.css"`。
- 追加: `import { SearchPageLayout } from "../components/SearchPageLayout";`, `import { ... toggleArrayParam } from "../utils/search"`（`buildFilterChips` は `../utils/search`）。

`Columns` 型は COLUMNS 定義に必要なので `import { type Columns } from "../components/DataTable";` は残す。`DataTable` の値 import は削除。

- [ ] **Step 3: トグルハンドラを `toggleArrayParam` で書き換える**

```tsx
const handleAvailableInstrumentsChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;
    setQueryParams({ a: toggleArrayParam(availableInstruments, value, checked) });
  },
  [setQueryParams, availableInstruments]
);

const handleInstitutionSizesChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;
    setQueryParams({ i: toggleArrayParam(institutionSizes, value, checked) });
  },
  [setQueryParams, institutionSizes]
);
```

- [ ] **Step 4: chips を `buildFilterChips` で書き換える**

```tsx
const chips = [
  ...(municipality === "all"
    ? []
    : [
        {
          label: `${MunicipalityOptions.find((o) => o.value === municipality)?.label}`,
          onDelete: () => setQueryParams({ m: null }),
        },
      ]),
  ...buildFilterChips(AVAILABLE_INSTRUMENT_MAP, availableInstruments, (next) =>
    setQueryParams({ a: next })
  ),
  ...buildFilterChips(INSTITUTION_SIZE_MAP, institutionSizes, (next) =>
    setQueryParams({ i: next })
  ),
];
```

- [ ] **Step 5: return を `SearchPageLayout` に置き換える**

```tsx
return (
  <SearchPageLayout
    chips={chips}
    columns={COLUMNS}
    controls={
      <>
        <Select
          label="地区"
          onChange={handleMunicipalityChange}
          selectOptions={MunicipalityOptions}
          size="small"
          value={municipality}
        />
        <CheckboxGroup
          label="利用可能楽器"
          onChange={handleAvailableInstrumentsChange}
          values={availableInstruments}
        >
          {Object.entries(AVAILABLE_INSTRUMENT_MAP).map(([value, label]) => (
            <Checkbox key={value} label={label} value={value} />
          ))}
        </CheckboxGroup>
        <CheckboxGroup
          label="施設サイズ"
          onChange={handleInstitutionSizesChange}
          values={institutionSizes}
        >
          {Object.entries(INSTITUTION_SIZE_MAP).map(([value, label]) => (
            <Checkbox key={value} label={label} value={value} />
          ))}
        </CheckboxGroup>
      </>
    }
    empty={!municipality || !institutions?.length}
    error={error}
    fetchMore={fetchMore}
    fetchingMore={fetchingMore}
    hasNextPage={hasMore}
    loading={loading}
    onRowClick={(params) => {
      const institutionId = extractSinglePkFromRelayId(params.row.id);
      if (institutionId) {
        setLocation(ROUTES.detail.replace(":id", institutionId as string));
      }
    }}
    rows={institutions ?? []}
  />
);
```

注: 現行は `rows={institutions}`（`institutions` は非空判定済み分岐内）だが、layout では常に渡すため `institutions ?? []` とする。`empty` 分岐で空時は DataTable に到達しない。

- [ ] **Step 6: 未使用 import と CSS を削除**

`import styles from "./Institution.module.css";` を削除。`SearchForm`/`Snackbar`/`Spinner` の import を削除。`packages/viewer/pages/Institution.module.css` を削除。

```bash
git rm packages/viewer/pages/Institution.module.css
```

- [ ] **Step 7: 既存テストが緑のままか確認**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- pages/Institution.test.tsx`
Expected: PASS（挙動不変）

- [ ] **Step 8: 型チェックと lint**

Run: `npm run typecheck:all && npm run lint:all`
Expected: エラー・警告なし

- [ ] **Step 9: コミット**

メッセージ: `refactor(viewer): PR4-3c Institution を SearchPageLayout / ヘルパで再構成`

---

### Task 4: Reservation.tsx をリファクタ

**Files:**
- Modify: `packages/viewer/pages/Reservation.tsx`
- Delete: `packages/viewer/pages/Reservation.module.css`
- 既存テスト（無変更）: `packages/viewer/pages/Reservation.test.tsx`

**Interfaces:**
- Consumes: `SearchPageLayout`（Task 2）, `toggleArrayParam`/`buildFilterChips`（Task 1）。

- [ ] **Step 1: 既存テストが緑であることを確認（ベースライン）**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- pages/Reservation.test.tsx`
Expected: PASS

- [ ] **Step 2: import を差し替える**

Task 3 と同様に `DataTable` 値 import・`SearchForm`/`Snackbar`/`Spinner`・`styles` を削除し、`SearchPageLayout` と `toggleArrayParam`/`buildFilterChips` を追加する。`type Columns` は COLUMNS 定義に残す。`DateRangePicker`/`Select`/`Checkbox`/`CheckboxGroup` は controls で使うため残す。

- [ ] **Step 3: トグルハンドラ 3 つを `toggleArrayParam` で書き換える**

```tsx
const handleFilterChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;
    setQueryParams({ f: toggleArrayParam(filter, value, checked) });
  },
  [setQueryParams, filter]
);

const handleAvailableInstrumentsChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;
    setQueryParams({ a: toggleArrayParam(availableInstruments, value, checked) });
  },
  [setQueryParams, availableInstruments]
);

const handleInstitutionSizesChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;
    setQueryParams({ i: toggleArrayParam(institutionSizes, value, checked) });
  },
  [setQueryParams, institutionSizes]
);
```

`handleMunicipalityChange`/`handleStartDateChange`/`handleEndDateChange` は変更しない（日付連動は残す）。

- [ ] **Step 4: chips を `buildFilterChips` で書き換える**

地区 chip と日付 chip（`{ label: ... }` の onDelete なし固定 chip）は残し、絞り込み・楽器・サイズを `buildFilterChips` にする:

```tsx
const chips = [
  ...(municipality === "all"
    ? []
    : [
        {
          label: `${MunicipalityOptions.find((o) => o.value === municipality)?.label}`,
          onDelete: () => setQueryParams({ m: null }),
        },
      ]),
  { label: `${formatDate(startDate)} 〜 ${formatDate(endDate)}` },
  ...buildFilterChips(RESERVATION_SEARCH_FILTER_MAP, filter, (next) => setQueryParams({ f: next })),
  ...buildFilterChips(AVAILABLE_INSTRUMENT_MAP, availableInstruments, (next) =>
    setQueryParams({ a: next })
  ),
  ...buildFilterChips(INSTITUTION_SIZE_MAP, institutionSizes, (next) =>
    setQueryParams({ i: next })
  ),
];
```

注: 日付 chip は onDelete を持たない固定 chip。`buildFilterChips` は map ベース chip 専用なので日付 chip は対象外（そのまま残す）。

- [ ] **Step 5: return を `SearchPageLayout` に置き換える**

controls に `Select`（除外自治体フィルタ付き）/`DateRangePicker`/絞り込み `CheckboxGroup`/楽器 `CheckboxGroup`/サイズ `CheckboxGroup` を現行のまま入れる:

```tsx
return (
  <SearchPageLayout
    chips={chips}
    columns={COLUMNS}
    controls={
      <>
        <Select
          label="地区"
          onChange={handleMunicipalityChange}
          selectOptions={MunicipalityOptions.filter(
            (m) => !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(m.value as SupportedMunicipality)
          )}
          size="small"
          value={municipality}
        />
        <DateRangePicker
          endDateProps={{ value: endDate, onChange: handleEndDateChange, minDate, maxDate }}
          label="期間指定"
          startDateProps={{ value: startDate, onChange: handleStartDateChange, minDate, maxDate }}
        />
        <CheckboxGroup label="絞り込み" onChange={handleFilterChange} values={filter}>
          {Object.entries(RESERVATION_SEARCH_FILTER_MAP).map(([value, label]) => (
            <Checkbox key={value} label={label} value={value} />
          ))}
        </CheckboxGroup>
        <CheckboxGroup
          label="利用可能楽器"
          onChange={handleAvailableInstrumentsChange}
          values={availableInstruments}
        >
          {Object.entries(AVAILABLE_INSTRUMENT_MAP).map(([value, label]) => (
            <Checkbox key={value} label={label} value={value} />
          ))}
        </CheckboxGroup>
        <CheckboxGroup
          label="施設サイズ"
          onChange={handleInstitutionSizesChange}
          values={institutionSizes}
        >
          {Object.entries(INSTITUTION_SIZE_MAP).map(([value, label]) => (
            <Checkbox key={value} label={label} value={value} />
          ))}
        </CheckboxGroup>
      </>
    }
    empty={!municipality || !reservations?.length}
    error={error}
    fetchMore={fetchMore}
    fetchingMore={fetchingMore}
    hasNextPage={hasMore}
    loading={loading}
    onRowClick={(params) => {
      const institutionId =
        params.row.institution?.id && extractSinglePkFromRelayId(params.row.institution.id);
      if (institutionId) {
        setLocation(ROUTES.detail.replace(":id", institutionId as string));
      }
    }}
    rows={reservations ?? []}
  />
);
```

- [ ] **Step 6: 未使用 import と CSS を削除**

`import styles from "./Reservation.module.css";`・`SearchForm`/`Snackbar`/`Spinner` を削除。`packages/viewer/pages/Reservation.module.css` を削除。

```bash
git rm packages/viewer/pages/Reservation.module.css
```

- [ ] **Step 7: 既存テストが緑のままか確認**

Run: `npm run test:ci -w @shisetsu-viewer/viewer -- pages/Reservation.test.tsx`
Expected: PASS

- [ ] **Step 8: viewer 全テスト + 型 + lint**

Run: `npm run test:ci -w @shisetsu-viewer/viewer && npm run typecheck:all && npm run lint:all`
Expected: すべて緑

- [ ] **Step 9: コミット**

メッセージ: `refactor(viewer): PR4-3c Reservation を SearchPageLayout / ヘルパで再構成`

---

## 完了後

- `npm run knip`（未使用 export/ファイル検出）を実行し、CSS 削除や import 変更で孤児が出ていないか確認する。
- PR を作成（base: master）。

## Self-Review 結果

- **Spec coverage:** ユニット1（SearchPageLayout）=Task 2、ユニット2（ヘルパ）=Task 1、Institution リファクタ=Task 3、Reservation リファクタ=Task 4、CSS 削除・一本化=Task 2/3/4、DataTable 型 export=Task 2。全カバー。
- **Placeholder scan:** コード提示済み。Step 3 のテストで progressbar/Snackbar ロール名は既存コンポーネント実装に合わせる旨を明示。
- **Type consistency:** `toggleArrayParam`/`buildFilterChips`/`SearchPageLayout`/`Row`/`RowParams` の名称は全タスクで一致。
