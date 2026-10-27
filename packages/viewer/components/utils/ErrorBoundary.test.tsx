import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { ErrorBoundary } from "./ErrorBoundary";

const ThrowingChild = () => {
  throw new Error("Test error");
};

const GoodChild = () => <div>正常な子コンポーネント</div>;

describe("ErrorBoundary Component", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("エラーがない場合に子コンポーネントを正常にレンダリングする", async () => {
    await renderWithProviders(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    await expect.element(screen.getByText("正常な子コンポーネント")).toBeInTheDocument();
  });

  it("子コンポーネントがエラーをスローした場合にエラーSnackbarを表示する", async () => {
    await renderWithProviders(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    await expect
      .element(
        screen.getByText(
          "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
        )
      )
      .toBeInTheDocument();
  });

  it("resetKey が変わるとエラー状態を解除する", async () => {
    let shouldThrow = true;
    const MaybeThrowing = () => {
      if (shouldThrow) throw new Error("Test error");
      return <div>復帰した</div>;
    };

    const { rerender } = await renderWithProviders(
      <ErrorBoundary resetKey="a">
        <MaybeThrowing />
      </ErrorBoundary>
    );
    await expect
      .element(screen.getByText("予期せぬエラーが発生しました。", { exact: false }))
      .toBeInTheDocument();

    shouldThrow = false;
    await rerender(
      <ErrorBoundary resetKey="b">
        <MaybeThrowing />
      </ErrorBoundary>
    );

    await expect.element(screen.getByText("復帰した")).toBeInTheDocument();
  });

  it("unhandledrejectionイベントでエラー表示する", async () => {
    await renderWithProviders(
      <ErrorBoundary>
        <div>正常</div>
      </ErrorBoundary>
    );

    await expect.element(screen.getByText("正常")).toBeInTheDocument();

    const rejectedPromise = Promise.reject(new Error("test rejection"));
    rejectedPromise.catch(() => {});

    window.dispatchEvent(
      new PromiseRejectionEvent("unhandledrejection", {
        promise: rejectedPromise,
        reason: new Error("test rejection"),
      })
    );

    await expect
      .element(
        screen.getByText(
          "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
        )
      )
      .toBeInTheDocument();
  });
});
