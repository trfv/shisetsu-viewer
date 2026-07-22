import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Snackbar } from "./Snackbar";

describe("Snackbar Component", () => {
  it("open=trueの場合にメッセージを表示する", async () => {
    await renderWithProviders(<Snackbar open={true} message="保存しました" />);

    await expect.element(screen.getByText("保存しました")).toBeInTheDocument();
  });

  it("open=falseの場合にメッセージを表示しない", async () => {
    await renderWithProviders(<Snackbar open={false} message="非表示メッセージ" />);

    await expect.element(screen.getByText("非表示メッセージ")).not.toBeInTheDocument();
  });

  it("onCloseコールバックを受け取る", async () => {
    const onClose = vi.fn();
    await renderWithProviders(<Snackbar open={true} message="テスト" onClose={onClose} />);

    await expect.element(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("autoHideDurationプロパティを受け取る", async () => {
    await renderWithProviders(
      <Snackbar open={true} message="自動非表示" autoHideDuration={3000} />
    );

    await expect.element(screen.getByText("自動非表示")).toBeInTheDocument();
  });
});
