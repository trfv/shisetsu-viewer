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

  it("ラベルを表示する", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps}>
        <Checkbox label="体育館" value="gym" />
      </CheckboxGroup>
    );

    expect(screen.getByText("施設種別")).toBeInTheDocument();
  });

  it("子要素のチェックボックスをレンダリングする", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
        <Checkbox label="プール" value="pool" />
      </CheckboxGroup>
    );

    expect(screen.getByText("体育館")).toBeInTheDocument();
    expect(screen.getByText("テニスコート")).toBeInTheDocument();
    expect(screen.getByText("プール")).toBeInTheDocument();
  });

  it("valuesに含まれるチェックボックスがチェック状態になる", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym", "pool"]}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
        <Checkbox label="プール" value="pool" />
      </CheckboxGroup>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // gym should be checked
    expect(checkboxes[0]).toBeChecked();
    // tennis should not be checked
    expect(checkboxes[1]).not.toBeChecked();
    // pool should be checked
    expect(checkboxes[2]).toBeChecked();
  });

  it("valuesが空の場合すべて未チェック状態", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={[]}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
      </CheckboxGroup>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it("チェックボックスをクリックするとonChangeが呼ばれる", async () => {
    const handleChange = vi.fn();
    const { user } = renderWithProviders(
      <CheckboxGroup {...defaultProps} onChange={handleChange}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="テニスコート" value="tennis" />
      </CheckboxGroup>
    );

    const checkbox = screen.getAllByRole("checkbox")[0]!;
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("チェックボックスのvalue属性が正しく設定される", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym"]}>
        <Checkbox label="体育館" value="gym" />
      </CheckboxGroup>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("value", "gym");
  });

  it("ネストされた要素内のチェックボックスを再帰的に処理する", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym", "pool"]}>
        <div>
          <Checkbox label="体育館" value="gym" />
          <Checkbox label="プール" value="pool" />
        </div>
      </CheckboxGroup>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it("Checkbox以外の子要素はnullを返す", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={[]}>
        <Checkbox label="体育館" value="gym" />
        {null}
        {false}
      </CheckboxGroup>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(1);
  });

  it("子要素なしのCheckbox以外の要素はnullを返す", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym"]}>
        <Checkbox label="体育館" value="gym" />
        <hr />
      </CheckboxGroup>
    );

    // The <hr /> element is not a Checkbox and has no children,
    // so mapChildren returns null for it
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(1);
    expect(checkboxes[0]).toBeChecked();
  });

  it("value属性のないCheckboxはchecked=falseになる", () => {
    renderWithProviders(
      <CheckboxGroup {...defaultProps} values={["gym"]}>
        <Checkbox label="体育館" value="gym" />
        <Checkbox label="不明" value="" />
      </CheckboxGroup>
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    // Checkbox with empty string value should not be checked
    expect(checkboxes[1]).not.toBeChecked();
  });
});
