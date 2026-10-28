import { use } from "react";
import { describe, expect, test, vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import type { Columns, Row } from "../DataTable";
import { SearchPageLayout, SearchResults } from "./SearchPageLayout";

type Foo = Row & { name: string };

const columns: Columns<Foo> = [{ field: "name", headerName: "名前", type: "string" }];
const rows: Foo[] = [{ id: "1", name: "施設A" }];

const layoutProps = {
  chips: [],
  controls: <div>controls</div>,
  pending: false,
  resetKey: "k",
};

const Suspending = ({ promise }: { promise: Promise<never> }) => use(promise);

const Throwing = (): never => {
  throw new Error("失敗しました");
};

describe("SearchPageLayout", () => {
  test("結果の取得中は Spinner を表示する", async () => {
    await renderWithProviders(
      <SearchPageLayout {...layoutProps}>
        <Suspending promise={new Promise<never>(() => {})} />
      </SearchPageLayout>
    );
    await expect.element(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("結果の取得に失敗すると Snackbar にメッセージを表示する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    await renderWithProviders(
      <SearchPageLayout {...layoutProps}>
        <Throwing />
      </SearchPageLayout>
    );
    await expect.element(screen.getByText("失敗しました")).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "絞り込み" })).toBeInTheDocument();
  });

  test("pending のとき結果の領域を aria-busy にする", async () => {
    await renderWithProviders(
      <SearchPageLayout {...layoutProps} pending={true}>
        <SearchResults columns={columns} rows={rows} />
      </SearchPageLayout>
    );
    await expect.element(screen.getByText("施設A")).toBeInTheDocument();
    expect(screen.getByText("施設A").element().closest("[aria-busy]")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});

describe("SearchResults", () => {
  test("行がないときデータなしメッセージを表示する", async () => {
    await renderWithProviders(<SearchResults columns={columns} rows={[]} />);
    await expect.element(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
  });

  test("行があるとき DataTable の行を表示する", async () => {
    await renderWithProviders(<SearchResults columns={columns} rows={rows} />);
    await expect.element(screen.getByText("施設A")).toBeInTheDocument();
  });

  test("行クリックで onRowClick が呼ばれる", async () => {
    const onRowClick = vi.fn();
    const { user } = await renderWithProviders(
      <SearchResults columns={columns} onRowClick={onRowClick} rows={rows} />
    );
    await user.click(screen.getByText("施設A"));
    expect(onRowClick).toHaveBeenCalledOnce();
  });
});
