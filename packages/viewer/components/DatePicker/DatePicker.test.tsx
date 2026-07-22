import { describe, it, expect, vi } from "vitest";
import { renderWithProviders } from "../../test/utils/test-utils";
import { DatePicker } from "./DatePicker";

describe("DatePicker Component", () => {
  const defaultProps = {
    value: new Date(2021, 0, 15),
    onChange: vi.fn(),
    minDate: new Date(2021, 0, 1),
    maxDate: new Date(2021, 11, 31),
  };

  it("date入力フィールドを表示する", async () => {
    await renderWithProviders(<DatePicker {...defaultProps} />);
    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    await expect.element(input).toHaveValue("2021-01-15");
    await expect.element(input).toHaveAttribute("type", "date");
  });

  it("選択された日付の値を表示する", async () => {
    await renderWithProviders(<DatePicker {...defaultProps} />);
    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    await expect.element(input).toHaveValue("2021-01-15");
  });

  it("minとmax属性が設定される", async () => {
    const minDate = new Date(2021, 5, 1);
    const maxDate = new Date(2021, 5, 30);

    await renderWithProviders(<DatePicker {...defaultProps} minDate={minDate} maxDate={maxDate} />);

    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    await expect.element(input).toHaveAttribute("min", "2021-06-01");
    await expect.element(input).toHaveAttribute("max", "2021-06-30");
  });

  it("日付変更時にonChangeが呼ばれる", async () => {
    const onChange = vi.fn();
    const { user } = await renderWithProviders(
      <DatePicker {...defaultProps} onChange={onChange} />
    );

    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    await user.fill(input, "2021-03-20");

    expect(onChange).toHaveBeenCalledWith(new Date(2021, 2, 20));
  });

  it("valueがnullの場合、空文字を表示する", async () => {
    await renderWithProviders(<DatePicker {...defaultProps} value={null} />);
    const input = document.querySelector<HTMLInputElement>('input[type="date"]');
    await expect.element(input).toHaveAttribute("value", "");
  });
});
