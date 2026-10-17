import { describe, it, expect, vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { DateRangePicker } from "./DateRangePicker";

describe("DateRangePicker Component", () => {
  const defaultProps = {
    label: "日付",
    value: { from: new Date(2021, 0, 10), to: new Date(2021, 0, 20) },
    onChange: vi.fn(),
    minDate: new Date(2021, 0, 5),
    maxDate: new Date(2021, 2, 31),
  };

  it("ラベルを表示する", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} />);

    await expect.element(screen.getByText("日付")).toBeInTheDocument();
  });

  it("1 回目はその日だけ、2 回目でそこまでの期間を onChange に渡す", async () => {
    const onChange = vi.fn();
    const { rerender, user } = await renderWithProviders(
      <DateRangePicker {...defaultProps} onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: /2021年1月12日/ }));
    const day = new Date(2021, 0, 12);
    expect(onChange).toHaveBeenLastCalledWith({ from: day, to: day });

    await rerender(
      <DateRangePicker {...defaultProps} onChange={onChange} value={{ from: day, to: day }} />
    );
    await user.click(screen.getByRole("button", { name: /2021年1月15日/ }));
    expect(onChange).toHaveBeenLastCalledWith({ from: day, to: new Date(2021, 0, 15) });
  });

  it("選べる範囲の外の日は押せない", async () => {
    await renderWithProviders(<DateRangePicker {...defaultProps} />);

    await expect.element(screen.getByRole("button", { name: /2021年1月4日/ })).toBeDisabled();
  });
});
