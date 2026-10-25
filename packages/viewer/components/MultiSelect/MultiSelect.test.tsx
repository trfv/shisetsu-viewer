import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { MultiSelect } from "./MultiSelect";

const options = [
  { value: "koutou", label: "江東区" },
  { value: "kita", label: "北区" },
  { value: "kawasaki", label: "川崎市" },
];

const defaultProps = {
  label: "地区",
  options,
  placeholder: "すべて",
  values: [] as string[],
  onChange: vi.fn(),
};

describe("MultiSelect Component", () => {
  it("未選択のときはプレースホルダを表示する", async () => {
    await renderWithProviders(<MultiSelect {...defaultProps} />);

    await expect
      .element(screen.getByRole("button", { name: /^地区/ }))
      .toHaveAccessibleName("地区 すべて");
  });

  it("選択中の項目を選択肢の順に並べて表示する", async () => {
    await renderWithProviders(<MultiSelect {...defaultProps} values={["kawasaki", "koutou"]} />);

    await expect
      .element(screen.getByRole("button", { name: /^地区/ }))
      .toHaveAccessibleName("地区 江東区、川崎市");
  });

  it("初期状態では選択肢を表示しない", async () => {
    await renderWithProviders(<MultiSelect {...defaultProps} />);

    await expect
      .element(screen.getByRole("button", { name: /^地区/ }))
      .toHaveAttribute("aria-expanded", "false");
    await expect.element(screen.getByRole("checkbox", { name: "北区" })).not.toBeInTheDocument();
  });

  it("ボタンを押すと選択肢を開き、もう一度押すと閉じる", async () => {
    const { user } = await renderWithProviders(<MultiSelect {...defaultProps} />);

    const button = screen.getByRole("button", { name: /^地区/ });
    await user.click(button);

    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByRole("group", { name: "地区" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox").all()).toHaveLength(3);

    await user.click(button);

    await expect.element(screen.getByRole("group", { name: "地区" })).not.toBeInTheDocument();
  });

  it("valuesに含まれる選択肢がチェック状態になる", async () => {
    const { user } = await renderWithProviders(<MultiSelect {...defaultProps} values={["kita"]} />);

    await user.click(screen.getByRole("button", { name: /^地区/ }));

    await expect.element(screen.getByRole("checkbox", { name: "江東区" })).not.toBeChecked();
    await expect.element(screen.getByRole("checkbox", { name: "北区" })).toBeChecked();
  });

  it("選択肢を切り替えるとonChangeが値付きで呼ばれ、選択肢は開いたまま", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <MultiSelect {...defaultProps} onChange={handleChange} />
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByRole("checkbox", { name: "北区" }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]![0].target.value).toBe("kita");
    await expect.element(screen.getByRole("group", { name: "地区" })).toBeInTheDocument();
  });

  it("Escapeで閉じてボタンにフォーカスを戻し、外側にはEscapeを伝えない", async () => {
    const outerKeyDown = vi.fn();
    document.addEventListener("keydown", outerKeyDown);
    const { user } = await renderWithProviders(<MultiSelect {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByRole("checkbox", { name: "北区" }));
    await user.keyboard("{Escape}");

    await expect.element(screen.getByRole("group", { name: "地区" })).not.toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: /^地区/ })).toHaveFocus();
    expect(outerKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: "Escape" }));
    document.removeEventListener("keydown", outerKeyDown);
  });

  it("外側を押すと閉じる", async () => {
    const { user } = await renderWithProviders(
      <>
        <p>外側</p>
        <MultiSelect {...defaultProps} />
      </>
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByText("外側"));

    await expect.element(screen.getByRole("group", { name: "地区" })).not.toBeInTheDocument();
  });

  it("フォーカスが外へ移ると閉じる", async () => {
    const { user } = await renderWithProviders(
      <>
        <MultiSelect {...defaultProps} />
        <button type="button">次の要素</button>
      </>
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    await expect.element(screen.getByRole("button", { name: "次の要素" })).toHaveFocus();
    await expect.element(screen.getByRole("group", { name: "地区" })).not.toBeInTheDocument();
  });
});
