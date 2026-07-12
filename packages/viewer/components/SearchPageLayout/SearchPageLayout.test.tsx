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
};

describe("SearchPageLayout", () => {
  test("loading 中は Spinner を表示する", () => {
    renderWithProviders(<SearchPageLayout {...baseProps} loading={true} empty={false} rows={[]} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("empty のときデータなしメッセージを表示する", () => {
    renderWithProviders(<SearchPageLayout {...baseProps} loading={false} empty={true} rows={[]} />);
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
