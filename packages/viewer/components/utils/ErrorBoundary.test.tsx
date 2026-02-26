import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { ErrorBoundary } from "./ErrorBoundary";

const ThrowingChild = () => {
  throw new Error("Test error");
};

const GoodChild = () => <div>正常な子コンポーネント</div>;

describe("ErrorBoundary Component", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("エラーがない場合に子コンポーネントを正常にレンダリングする", () => {
    renderWithProviders(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("正常な子コンポーネント")).toBeInTheDocument();
  });

  it("子コンポーネントがエラーをスローした場合にエラーSnackbarを表示する", () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(
      screen.getByText(
        "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
      )
    ).toBeInTheDocument();
  });
});
