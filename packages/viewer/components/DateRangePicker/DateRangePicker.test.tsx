import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { DateRangePicker } from "./DateRangePicker";

describe("DateRangePicker Component", () => {
  const defaultProps = {
    label: "期間",
    startDateProps: {
      value: new Date(2021, 0, 1),
      onChange: vi.fn(),
      minDate: new Date(2021, 0, 1),
      maxDate: new Date(2021, 11, 31),
    },
    endDateProps: {
      value: new Date(2021, 1, 1),
      onChange: vi.fn(),
      minDate: new Date(2021, 0, 1),
      maxDate: new Date(2021, 11, 31),
    },
  };

  it("ラベルを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    expect(screen.getByText("期間")).toBeInTheDocument();
  });

  it("2つの日付ピッカーを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
  });

  it("開始日と終了日の間に「〜」セパレーターを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    expect(screen.getByText("〜")).toBeInTheDocument();
  });

  it("開始日と終了日の値を正しく表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    expect(screen.getByDisplayValue("2021-01-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2021-02-01")).toBeInTheDocument();
  });

  it("異なるラベルテキストを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} label="日付範囲" />);

    expect(screen.getByText("日付範囲")).toBeInTheDocument();
  });
});
