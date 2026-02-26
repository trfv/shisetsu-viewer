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

  it("2つの日付ピッカーセクションを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
  });

  it("開始日と終了日の間に「〜」セパレーターを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    expect(screen.getByText("〜")).toBeInTheDocument();
  });

  it("開始日と終了日の値を正しく表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} />);

    const yearSpinners = screen.getAllByRole("spinbutton", { name: "Year" });
    const monthSpinners = screen.getAllByRole("spinbutton", { name: "Month" });
    const daySpinners = screen.getAllByRole("spinbutton", { name: "Day" });

    // Start date: 2021/01/01
    expect(yearSpinners[0]).toHaveAttribute("aria-valuenow", "2021");
    expect(monthSpinners[0]).toHaveAttribute("aria-valuenow", "1");
    expect(daySpinners[0]).toHaveAttribute("aria-valuenow", "1");

    // End date: 2021/02/01
    expect(yearSpinners[1]).toHaveAttribute("aria-valuenow", "2021");
    expect(monthSpinners[1]).toHaveAttribute("aria-valuenow", "2");
    expect(daySpinners[1]).toHaveAttribute("aria-valuenow", "1");
  });

  it("異なるラベルテキストを表示する", () => {
    renderWithProviders(<DateRangePicker {...defaultProps} label="日付範囲" />);

    expect(screen.getByText("日付範囲")).toBeInTheDocument();
  });
});
