import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { DataTable, type Columns } from "./DataTable";

vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

type TestRow = { id: string; name: string; age: string; secret: string; label: string };

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
];

const rows: TestRow[] = [
  { id: "1", name: "東京", age: "100", secret: "秘密1", label: "" },
  { id: "2", name: "川崎", age: "200", secret: "秘密2", label: "" },
];

describe("DataTable Component", () => {
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
    // Visible columns: name, age, label (3 columns, secret is hidden)
    const skeletons = document.querySelectorAll(".MuiSkeleton-root");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("hasNextPage=falseの場合はスケルトンを表示しない", () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} hasNextPage={false} />);

    const skeletons = document.querySelectorAll(".MuiSkeleton-root");
    expect(skeletons.length).toBe(0);
  });

  it("行がない場合はヘッダーのみ表示する", () => {
    renderWithProviders(<DataTable columns={columns} rows={[]} />);

    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("年齢")).toBeInTheDocument();
    expect(screen.getByText("ラベル")).toBeInTheDocument();
  });
});
