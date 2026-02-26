import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Snackbar } from "./SnackBar";

describe("Snackbar Component", () => {
  it("open=trueの場合にメッセージを表示する", () => {
    renderWithProviders(<Snackbar open={true} message="保存しました" />);

    expect(screen.getByText("保存しました")).toBeInTheDocument();
  });

  it("open=falseの場合にメッセージを表示しない", () => {
    renderWithProviders(<Snackbar open={false} message="非表示メッセージ" />);

    expect(screen.queryByText("非表示メッセージ")).not.toBeInTheDocument();
  });

  it("onCloseコールバックを受け取る", () => {
    const onClose = vi.fn();
    renderWithProviders(<Snackbar open={true} message="テスト" onClose={onClose} />);

    expect(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("autoHideDurationプロパティを受け取る", () => {
    renderWithProviders(<Snackbar open={true} message="自動非表示" autoHideDuration={3000} />);

    expect(screen.getByText("自動非表示")).toBeInTheDocument();
  });
});
