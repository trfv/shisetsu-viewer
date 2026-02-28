import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, fireEvent } from "../../test/utils/test-utils";
import { DatePicker } from "./DatePicker";

describe("DatePicker Component", () => {
  const defaultProps = {
    value: new Date(2021, 0, 15),
    onChange: vi.fn(),
    minDate: new Date(2021, 0, 1),
    maxDate: new Date(2021, 11, 31),
  };

  it("date入力フィールドを表示する", () => {
    renderWithProviders(<DatePicker {...defaultProps} />);
    const input = screen.getByDisplayValue("2021-01-15");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "date");
  });

  it("選択された日付の値を表示する", () => {
    renderWithProviders(<DatePicker {...defaultProps} />);
    expect(screen.getByDisplayValue("2021-01-15")).toBeInTheDocument();
  });

  it("minとmax属性が設定される", () => {
    const minDate = new Date(2021, 5, 1);
    const maxDate = new Date(2021, 5, 30);

    renderWithProviders(<DatePicker {...defaultProps} minDate={minDate} maxDate={maxDate} />);

    const input = screen.getByDisplayValue("2021-01-15");
    expect(input).toHaveAttribute("min", "2021-06-01");
    expect(input).toHaveAttribute("max", "2021-06-30");
  });

  it("日付変更時にonChangeが呼ばれる", () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker {...defaultProps} onChange={onChange} />);

    const input = screen.getByDisplayValue("2021-01-15");
    fireEvent.change(input, { target: { value: "2021-03-20" } });

    expect(onChange).toHaveBeenCalledWith(new Date(2021, 2, 20));
  });

  it("valueがnullの場合、空文字を表示する", () => {
    renderWithProviders(<DatePicker {...defaultProps} value={null} />);
    const input = document.querySelector('input[type="date"]');
    expect(input).toHaveAttribute("value", "");
  });
});
