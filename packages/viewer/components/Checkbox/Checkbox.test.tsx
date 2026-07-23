import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Checkbox } from "./Checkbox";

describe("Checkbox Component", () => {
  it("ラベルを表示する", async () => {
    await renderWithProviders(<Checkbox label="利用可能" value="available" />);

    await expect.element(screen.getByText("利用可能")).toBeInTheDocument();
  });

  it("未チェック状態を表示する", async () => {
    await renderWithProviders(<Checkbox label="利用可能" value="available" checked={false} />);

    const checkbox = screen.getByRole("checkbox");
    await expect.element(checkbox).not.toBeChecked();
  });

  it("チェック状態を表示する", async () => {
    await renderWithProviders(<Checkbox label="利用可能" value="available" checked={true} />);

    const checkbox = screen.getByRole("checkbox");
    await expect.element(checkbox).toBeChecked();
  });

  it("デフォルトでは未チェック状態", async () => {
    await renderWithProviders(<Checkbox label="利用可能" value="available" />);

    const checkbox = screen.getByRole("checkbox");
    await expect.element(checkbox).not.toBeChecked();
  });

  it("クリック時にonChangeが呼ばれる", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <Checkbox label="利用可能" value="available" onChange={handleChange} />
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("チェックボックスに正しいvalue属性を持つ", async () => {
    await renderWithProviders(<Checkbox label="利用可能" value="available" />);

    const checkbox = screen.getByRole("checkbox");
    await expect.element(checkbox).toHaveAttribute("value", "available");
  });

  it("onChangeを渡さない場合にデフォルトのonChangeが使われる", async () => {
    const { user } = await renderWithProviders(<Checkbox label="テスト" value="test" />);

    const checkbox = screen.getByRole("checkbox");
    // Should not throw when clicking without onChange handler
    await user.click(checkbox);

    await expect.element(checkbox).toBeInTheDocument();
  });

  it("sizeプロパティを指定してレンダリングする", async () => {
    await renderWithProviders(<Checkbox label="テスト" value="test" size="small" />);

    await expect.element(screen.getByText("テスト")).toBeInTheDocument();
  });
});
