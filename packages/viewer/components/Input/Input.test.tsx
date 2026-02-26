import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Input } from "./Input";

describe("Input Component", () => {
  it("ラベルを表示する", () => {
    renderWithProviders(<Input label="名前" />);

    expect(screen.getByText("名前")).toBeInTheDocument();
  });

  it("値を表示する", () => {
    renderWithProviders(<Input label="名前" value="テスト値" readOnly />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("テスト値");
  });

  it("loading=trueのときSkeletonを表示する", () => {
    const { container } = renderWithProviders(<Input label="名前" loading={true} />);

    // Skeleton is rendered, no textbox should be present
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    // MUI Skeleton renders a span with the MuiSkeleton class
    const skeleton = container.querySelector(".MuiSkeleton-root");
    expect(skeleton).toBeInTheDocument();
  });

  it("loading=falseのときInputを表示する", () => {
    renderWithProviders(<Input label="名前" loading={false} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("readOnly属性を処理する", () => {
    renderWithProviders(<Input label="名前" readOnly value="読み取り専用" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("readonly");
  });

  it("multiline属性を処理する", () => {
    renderWithProviders(<Input label="説明" multiline rows={3} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("値が未指定の場合は空文字を表示する", () => {
    renderWithProviders(<Input label="名前" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
  });
});
