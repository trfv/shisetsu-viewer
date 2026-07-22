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

  it("ラベルを表示する", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} />);

    await expect.element(screen.getByText("期間")).toBeInTheDocument();
  });

  it("2つの日付ピッカーを表示する", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
  });

  it("開始日と終了日の間に「〜」セパレーターを表示する", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} />);

    await expect.element(screen.getByText("〜")).toBeInTheDocument();
  });

  it("開始日と終了日の値を正しく表示する", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} />);

    const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    await expect.element(dateInputs[0]!).toHaveValue("2021-01-01");
    await expect.element(dateInputs[1]!).toHaveValue("2021-02-01");
  });

  it("異なるラベルテキストを表示する", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} label="日付範囲" />);

    await expect.element(screen.getByText("日付範囲")).toBeInTheDocument();
  });
});
