import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Input } from "./Input";

describe("Input Component", () => {
  it("ラベルを表示する", async () => {
    await renderWithProviders(<Input label="名前" />);

    await expect.element(screen.getByText("名前")).toBeInTheDocument();
  });

  it("値を表示する", async () => {
    await renderWithProviders(<Input label="名前" value="テスト値" readOnly />);

    const input = screen.getByRole("textbox");
    await expect.element(input).toHaveValue("テスト値");
  });

  it("loading=trueのときSkeletonを表示する", async () => {
    const { container } = await renderWithProviders(<Input label="名前" loading={true} />);

    // Skeleton is rendered, no textbox should be present
    await expect.element(screen.getByRole("textbox")).not.toBeInTheDocument();
    const skeleton = container.querySelector<HTMLElement>('[data-testid="skeleton"]');
    await expect.element(skeleton).toBeInTheDocument();
  });

  it("loading=falseのときInputを表示する", async () => {
    await renderWithProviders(<Input label="名前" loading={false} />);

    await expect.element(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("readOnly属性を処理する", async () => {
    await renderWithProviders(<Input label="名前" readOnly value="読み取り専用" />);

    const input = screen.getByRole("textbox");
    await expect.element(input).toHaveAttribute("readonly");
  });

  it("multiline属性を処理する", async () => {
    await renderWithProviders(<Input label="説明" multiline rows={3} />);

    const textarea = screen.getByRole("textbox");
    await expect.element(textarea).toBeInTheDocument();
    expect(textarea.element().tagName.toLowerCase()).toBe("textarea");
  });

  it("値が未指定の場合は空文字を表示する", async () => {
    await renderWithProviders(<Input label="名前" />);

    const input = screen.getByRole("textbox");
    await expect.element(input).toHaveValue("");
  });
});
