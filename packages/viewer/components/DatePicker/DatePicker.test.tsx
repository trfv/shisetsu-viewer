import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { DatePicker } from "./DatePicker";

describe("DatePicker Component", () => {
  const defaultProps = {
    value: new Date(2021, 0, 15),
    onChange: vi.fn(),
    minDate: new Date(2021, 0, 1),
    maxDate: new Date(2021, 11, 31),
  };

  it("日付入力グループを表示する", () => {
    renderWithProviders(<DatePicker {...defaultProps} />);

    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("年・月・日のスピンボタンを表示する", () => {
    renderWithProviders(<DatePicker {...defaultProps} />);

    const spinbuttons = screen.getAllByRole("spinbutton");
    expect(spinbuttons).toHaveLength(3);
    expect(screen.getByRole("spinbutton", { name: "Year" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Day" })).toBeInTheDocument();
  });

  it("選択された日付の値を表示する", () => {
    renderWithProviders(<DatePicker {...defaultProps} />);

    const yearSpinner = screen.getByRole("spinbutton", { name: "Year" });
    const monthSpinner = screen.getByRole("spinbutton", { name: "Month" });
    const daySpinner = screen.getByRole("spinbutton", { name: "Day" });

    expect(yearSpinner).toHaveAttribute("aria-valuenow", "2021");
    expect(monthSpinner).toHaveAttribute("aria-valuenow", "1");
    expect(daySpinner).toHaveAttribute("aria-valuenow", "15");
  });

  it("minDateとmaxDateのpropsを受け取る", () => {
    const minDate = new Date(2021, 5, 1);
    const maxDate = new Date(2021, 5, 30);

    renderWithProviders(<DatePicker {...defaultProps} minDate={minDate} maxDate={maxDate} />);

    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
  });

  it("readOnlyフィールドとして表示される", () => {
    renderWithProviders(<DatePicker {...defaultProps} />);

    const spinbuttons = screen.getAllByRole("spinbutton");
    spinbuttons.forEach((spinbutton) => {
      expect(spinbutton).toHaveAttribute("aria-readonly", "true");
    });
  });
});
