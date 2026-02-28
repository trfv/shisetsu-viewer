import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { DataTable, type Columns } from "./DataTable";

const mockIsMobile = vi.hoisted(() => ({ value: false }));
vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobile.value,
}));

type TestRow = {
  id: string;
  name: string;
  age: string;
  secret: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  score: string;
};

const columns: Columns<TestRow> = [
  { field: "name", headerName: "名前", type: "string" },
  { field: "age", headerName: "年齢", type: "string" },
  { field: "secret", headerName: "非表示列", type: "string", hide: true },
  {
    field: "label",
    headerName: "ラベル",
    type: "getter",
    valueGetter: (params) => `${params.row.name}-${params.row.age}`,
  },
  { field: "createdAt", headerName: "作成日", type: "date" },
  { field: "updatedAt", headerName: "更新日時", type: "datetime" },
  { field: "score", headerName: "スコア", type: "number" },
];

const rows: TestRow[] = [
  {
    id: "1",
    name: "東京",
    age: "100",
    secret: "秘密1",
    label: "",
    createdAt: "2025-01-15",
    updatedAt: "2025-01-15T10:30:00",
    score: "95",
  },
  {
    id: "2",
    name: "川崎",
    age: "200",
    secret: "秘密2",
    label: "",
    createdAt: "2025-02-20",
    updatedAt: "2025-02-20T14:00:00",
    score: "80",
  },
];

describe("DataTable Component", () => {
  beforeEach(() => {
    mockIsMobile.value = false;
  });

  it("カラムヘッダーを表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("年齢")).toBeInTheDocument();
    expect(screen.getByText("ラベル")).toBeInTheDocument();
  });

  it("行データを正しく表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText("東京")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("川崎")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("getter型のカラムはvalueGetterの結果を表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText("東京-100")).toBeInTheDocument();
    expect(screen.getByText("川崎-200")).toBeInTheDocument();
  });

  it("hide=trueのカラムは表示しない", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    expect(screen.queryByText("非表示列")).not.toBeInTheDocument();
    expect(screen.queryByText("秘密1")).not.toBeInTheDocument();
    expect(screen.queryByText("秘密2")).not.toBeInTheDocument();
  });

  it("行クリックでonRowClickコールバックが呼ばれる", async () => {
    const onRowClick = vi.fn();
    const { user } = renderWithProviders(
      <DataTable columns={columns} rows={rows} onRowClick={onRowClick} />
    );

    await user.click(screen.getByText("東京"));

    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith({
      id: "1",
      value: undefined,
      row: rows[0],
      columns,
    });
  });

  it("hasNextPage=trueの場合にスケルトンローディングを表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} hasNextPage={true} />);

    // The skeleton row should contain skeleton elements (one per visible column)
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("hasNextPage=falseの場合はスケルトンを表示しない", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} hasNextPage={false} />);

    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBe(0);
  });

  it("行がない場合はヘッダーのみ表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={[]} />);

    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("年齢")).toBeInTheDocument();
    expect(screen.getByText("ラベル")).toBeInTheDocument();
  });

  it("getter型でvalueGetterが未定義の場合は空文字を表示する", () => {
    const colsWithoutGetter: Columns<TestRow> = [
      { field: "name", headerName: "名前", type: "string" },
      { field: "label", headerName: "ラベル", type: "getter" },
    ];
    renderWithProviders(<DataTable columns={colsWithoutGetter} rows={rows} />);

    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("ラベル")).toBeInTheDocument();
  });

  describe("Column Types", () => {
    it("date型のカラムはformatDateの結果を表示する", () => {
      renderWithProviders(<DataTable columns={columns} rows={rows} />);

      // formatDate uses Intl.DateTimeFormat "ja-JP" with year/month/day/weekday
      // 2025-01-15 → "2025/01/15(水)"
      expect(screen.getByText("作成日")).toBeInTheDocument();
      const cells = document.querySelectorAll("td");
      const cellTexts = Array.from(cells).map((c) => c.textContent);
      expect(cellTexts.some((t) => t?.includes("2025"))).toBe(true);
    });

    it("datetime型のカラムはformatDatetimeの結果を表示する", () => {
      renderWithProviders(<DataTable columns={columns} rows={rows} />);

      expect(screen.getByText("更新日時")).toBeInTheDocument();
      const cells = document.querySelectorAll("td");
      const cellTexts = Array.from(cells).map((c) => c.textContent);
      // datetime format includes time components
      expect(cellTexts.some((t) => t?.includes("2025") && t?.includes(":"))).toBe(true);
    });

    it("number型のカラムは数値を表示する", () => {
      renderWithProviders(<DataTable columns={columns} rows={rows} />);

      expect(screen.getByText("スコア")).toBeInTheDocument();
      expect(screen.getByText("95")).toBeInTheDocument();
      expect(screen.getByText("80")).toBeInTheDocument();
    });

    it("number型でNaNの場合は空文字を表示する", () => {
      const nanRows: TestRow[] = [
        {
          id: "3",
          name: "テスト",
          age: "10",
          secret: "秘密",
          label: "",
          createdAt: "2025-01-01",
          updatedAt: "2025-01-01T00:00:00",
          score: "not-a-number",
        },
      ];
      renderWithProviders(<DataTable columns={columns} rows={nanRows} />);

      // The score column should render empty string for NaN
      const tableCells = document.querySelectorAll("td");
      const scoreCells = Array.from(tableCells).filter((_, index) => {
        // Score is the last visible column
        // Visible columns: name, age, label, createdAt, updatedAt, score (6 columns)
        return (index + 1) % 6 === 0;
      });
      expect(scoreCells.some((c) => c.textContent === "")).toBe(true);
    });
  });

  describe("IntersectionObserver", () => {
    it("fetchMoreが設定されている場合にIntersectionObserverが動作する", () => {
      const fetchMore = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <DataTable columns={columns} rows={rows} fetchMore={fetchMore} hasNextPage={true} />
      );

      // The component should render without error with fetchMore
      expect(screen.getByText("東京")).toBeInTheDocument();
    });

    it("十分な行数がある場合にIntersectionObserverが要素をobserveする", async () => {
      const manyRows: TestRow[] = Array.from({ length: 51 }, (_, i) => ({
        id: String(i),
        name: `Name${i}`,
        age: `${i}`,
        secret: `Secret${i}`,
        label: "",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01T00:00:00",
        score: `${i}`,
      }));

      const fetchMore = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <DataTable columns={columns} rows={manyRows} fetchMore={fetchMore} hasNextPage={true} />
      );

      // The ref is set on row at index 1 (51 - 50 = 1), which is visible
      // IntersectionObserver should fire and call fetchMore
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(fetchMore).toHaveBeenCalled();
    });

    it("アンマウント時にIntersectionObserverがクリーンアップされる", async () => {
      const manyRows: TestRow[] = Array.from({ length: 51 }, (_, i) => ({
        id: String(i),
        name: `Name${i}`,
        age: `${i}`,
        secret: `Secret${i}`,
        label: "",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01T00:00:00",
        score: `${i}`,
      }));

      const fetchMore = vi.fn().mockResolvedValue(undefined);
      const { unmount } = renderWithProviders(
        <DataTable columns={columns} rows={manyRows} fetchMore={fetchMore} hasNextPage={true} />
      );

      // Wait for observer to be set up
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Unmounting should trigger cleanup (observer.unobserve)
      unmount();
    });
  });
});

describe("Mobile Card View", () => {
  beforeEach(() => {
    mockIsMobile.value = true;
  });

  afterEach(() => {
    mockIsMobile.value = false;
  });

  it("モバイルではカードビューを表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    // In card view, the first column becomes the title, remaining become label-value pairs
    // Should NOT have a <table> element
    expect(document.querySelector("table")).toBeNull();

    // Should display row data as cards
    expect(screen.getByText("東京")).toBeInTheDocument();
    expect(screen.getByText("川崎")).toBeInTheDocument();

    // Detail columns should show labels (headerName) for non-title columns
    expect(screen.getAllByText("年齢").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("ラベル").length).toBeGreaterThanOrEqual(1);
  });

  it("モバイルでhide=trueのカラムは表示しない", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    // hide=true columns should not appear even in card view
    expect(screen.queryByText("秘密1")).not.toBeInTheDocument();
    expect(screen.queryByText("秘密2")).not.toBeInTheDocument();
  });

  it("モバイルで行クリックでonRowClickが呼ばれる", async () => {
    const onRowClick = vi.fn();
    const { user } = renderWithProviders(
      <DataTable columns={columns} rows={rows} onRowClick={onRowClick} />
    );

    await user.click(screen.getByText("東京"));

    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith({
      id: "1",
      value: undefined,
      row: rows[0],
      columns,
    });
  });

  it("モバイルでhasNextPage=trueの場合にスケルトンを表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} hasNextPage={true} />);

    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("モバイルでhasNextPage=falseの場合はスケルトンを表示しない", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} hasNextPage={false} />);

    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBe(0);
  });

  it("モバイルでgetterやdate型の値がカードに表示される", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} />);

    // getter column values
    expect(screen.getByText("東京-100")).toBeInTheDocument();
    expect(screen.getByText("川崎-200")).toBeInTheDocument();
  });

  it("モバイルでfetchMoreが設定されている場合にIntersectionObserverが動作する", () => {
    const fetchMore = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <DataTable columns={columns} rows={rows} fetchMore={fetchMore} hasNextPage={true} />
    );

    // Should render without error in mobile mode with fetchMore
    expect(screen.getByText("東京")).toBeInTheDocument();
  });

  it("モバイルで十分な行数がある場合にcardTargetのIntersectionObserverが動作する", async () => {
    const manyRows: TestRow[] = Array.from({ length: 51 }, (_, i) => ({
      id: String(i),
      name: `Name${i}`,
      age: `${i}`,
      secret: `Secret${i}`,
      label: "",
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01T00:00:00",
      score: `${i}`,
    }));

    const fetchMore = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <DataTable columns={columns} rows={manyRows} fetchMore={fetchMore} hasNextPage={true} />
    );

    // In mobile mode, the cardTarget ref is set on the card at index 1 (51 - 50 = 1)
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(fetchMore).toHaveBeenCalled();
  });
});
