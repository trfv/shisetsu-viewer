import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { MultiSelect } from "./MultiSelect";

const options = [
  { value: "koutou", label: "江東区" },
  { value: "kita", label: "北区" },
  { value: "kawasaki", label: "川崎市" },
];

const ALL = ["koutou", "kita", "kawasaki"];

const defaultProps = {
  label: "地区",
  options,
  allLabel: "すべて",
  emptyLabel: "選択なし",
  values: ALL,
  onChange: vi.fn(),
};

describe("MultiSelect Component", () => {
  it("全部選んでいるときは「すべて」と表示する", async () => {
    await renderWithProviders(<MultiSelect {...defaultProps} />);

    await expect
      .element(screen.getByRole("button", { name: /^地区/ }))
      .toHaveAccessibleName("地区 すべて");
  });

  it("何も選んでいないときは「選択なし」と表示する", async () => {
    await renderWithProviders(<MultiSelect {...defaultProps} values={[]} />);

    await expect
      .element(screen.getByRole("button", { name: /^地区/ }))
      .toHaveAccessibleName("地区 選択なし");
  });

  it("一部を選んでいるときは選択肢の順に並べて表示する", async () => {
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

  it("ボタンを押すと「すべて」と選択肢を開き、もう一度押すと閉じる", async () => {
    const { user } = await renderWithProviders(<MultiSelect {...defaultProps} />);

    const button = screen.getByRole("button", { name: /^地区/ });
    await user.click(button);

    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByRole("group", { name: "地区" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox").all()).toHaveLength(4);

    await user.click(button);

    await expect.element(screen.getByRole("group", { name: "地区" })).not.toBeInTheDocument();
  });

  it("全部選んでいるときは「すべて」とすべての選択肢がチェック状態になる", async () => {
    const { user } = await renderWithProviders(<MultiSelect {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /^地区/ }));

    await expect.element(screen.getByRole("checkbox", { name: "すべて" })).toBeChecked();
    await expect.element(screen.getByRole("checkbox", { name: "江東区" })).toBeChecked();
    await expect.element(screen.getByRole("checkbox", { name: "北区" })).toBeChecked();
    await expect.element(screen.getByRole("checkbox", { name: "川崎市" })).toBeChecked();
  });

  it("一部を選んでいるときは「すべて」が中間状態になる", async () => {
    const { user } = await renderWithProviders(<MultiSelect {...defaultProps} values={["kita"]} />);

    await user.click(screen.getByRole("button", { name: /^地区/ }));

    await expect.element(screen.getByRole("checkbox", { name: "すべて" })).toBePartiallyChecked();
    await expect.element(screen.getByRole("checkbox", { name: "江東区" })).not.toBeChecked();
    await expect.element(screen.getByRole("checkbox", { name: "北区" })).toBeChecked();
  });

  it("選択肢を外すと残りを選択肢の順で渡し、選択肢は開いたまま", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <MultiSelect {...defaultProps} onChange={handleChange} />
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByRole("checkbox", { name: "北区" }));

    expect(handleChange).toHaveBeenCalledWith(["koutou", "kawasaki"]);
    await expect.element(screen.getByRole("group", { name: "地区" })).toBeInTheDocument();
  });

  it("選択肢の名前を押しても閉じずに切り替わる", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <MultiSelect {...defaultProps} onChange={handleChange} />
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByText("北区"), { position: { x: 40, y: 8 } });

    expect(handleChange).toHaveBeenCalledWith(["koutou", "kawasaki"]);
    await expect.element(screen.getByRole("group", { name: "地区" })).toBeInTheDocument();
  });

  it("選択肢を足すと選択肢の順で渡す", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <MultiSelect {...defaultProps} onChange={handleChange} values={["kawasaki"]} />
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByRole("checkbox", { name: "江東区" }));

    expect(handleChange).toHaveBeenCalledWith(["koutou", "kawasaki"]);
  });

  it("「すべて」を外すと空を渡す", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <MultiSelect {...defaultProps} onChange={handleChange} />
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByRole("checkbox", { name: "すべて" }));

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it("一部を選んでいるときに「すべて」を押すと全部を渡す", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <MultiSelect {...defaultProps} onChange={handleChange} values={["kita"]} />
    );

    await user.click(screen.getByRole("button", { name: /^地区/ }));
    await user.click(screen.getByRole("checkbox", { name: "すべて" }));

    expect(handleChange).toHaveBeenCalledWith(ALL);
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
    for (let i = 0; i < 5; i++) {
      await user.tab();
    }

    await expect.element(screen.getByRole("button", { name: "次の要素" })).toHaveFocus();
    await expect.element(screen.getByRole("group", { name: "地区" })).not.toBeInTheDocument();
  });
});
