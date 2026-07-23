import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Checkbox } from "../Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";

describe("CheckboxGroup Component", () => {
  const defaultProps = {
    label: "施設種別",
    values: [] as string[],
    onChange: vi.fn(),
  };

  it("ラベルを表示する", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps}>
        <Checkbox label="体育館" value="gym" />
      </CheckboxGroup>
    );

    await expect.element(screen.getByText("施設種別")).toBeInTheDocument();
  });

  it("子要素のチェックボックスをレンダリングする", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
        <Checkbox label="プール" value="pool" />
      </CheckboxGroup>
    );

    await expect.element(screen.getByText("体育館")).toBeInTheDocument();
    await expect.element(screen.getByText("テニスコート")).toBeInTheDocument();
    await expect.element(screen.getByText("プール")).toBeInTheDocument();
  });

  it("valuesに含まれるチェックボックスがチェック状態になる", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym", "pool"]}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
        <Checkbox label="プール" value="pool" />
      </CheckboxGroup>
    );

    const checkboxes = screen.getByRole("checkbox").all();
    // gym should be checked
    await expect.element(checkboxes[0]!).toBeChecked();
    // tennis should not be checked
    await expect.element(checkboxes[1]!).not.toBeChecked();
    // pool should be checked
    await expect.element(checkboxes[2]!).toBeChecked();
  });

  it("valuesが空の場合すべて未チェック状態", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={[]}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
      </CheckboxGroup>
    );

    const checkboxes = screen.getByRole("checkbox").all();
    for (const checkbox of checkboxes) {
      await expect.element(checkbox).not.toBeChecked();
    }
  });

  it("チェックボックスをクリックするとonChangeが呼ばれる", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <CheckboxGroup {...defaultProps} onChange={handleChange}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
      </CheckboxGroup>
    );

    const checkbox = screen.getByRole("checkbox").all()[0]!;
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("チェックボックスのvalue属性が正しく設定される", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym"]}>
        <Checkbox label="体育館" value="gym" />
      </CheckboxGroup>
    );

    const checkbox = screen.getByRole("checkbox");
    await expect.element(checkbox).toHaveAttribute("value", "gym");
  });

  it("ネストされた要素内のチェックボックスを再帰的に処理する", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym", "pool"]}>
        <div>
          <Checkbox label="体育館" value="gym" />
          <Checkbox label="プール" value="pool" />
        </div>
      </CheckboxGroup>
    );

    const checkboxes = screen.getByRole("checkbox").all();
    await expect.element(checkboxes[0]!).toBeChecked();
    await expect.element(checkboxes[1]!).toBeChecked();
  });

  it("Checkbox以外の子要素はnullを返す", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={[]}>
        <Checkbox label="体育館" value="gym" />
        {null}
        {false}
      </CheckboxGroup>
    );

    const checkboxes = screen.getByRole("checkbox").all();
    expect(checkboxes).toHaveLength(1);
  });

  it("子要素なしのCheckbox以外の要素はnullを返す", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym"]}>
        <Checkbox label="体育館" value="gym" />
        <hr />
      </CheckboxGroup>
    );

    // The <hr /> element is not a Checkbox and has no children,
    // so mapChildren returns null for it
    const checkboxes = screen.getByRole("checkbox").all();
    expect(checkboxes).toHaveLength(1);
    await expect.element(checkboxes[0]!).toBeChecked();
  });

  it("value属性のないCheckboxはchecked=falseになる", async () => {
    await renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym"]}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="不明" value="" />
      </CheckboxGroup>
    );

    const checkboxes = screen.getByRole("checkbox").all();
    await expect.element(checkboxes[0]!).toBeChecked();
    // Checkbox with empty string value should not be checked
    await expect.element(checkboxes[1]!).not.toBeChecked();
  });
});
