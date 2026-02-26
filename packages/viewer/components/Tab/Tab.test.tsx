import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Tab } from "./Tab";

describe("Tab", () => {
  it("正しいa11y属性を持つ", () => {
    renderWithProviders(<Tab label="予約" value="reservation" />);
    const tab = screen.getByRole("tab", { name: "予約" });
    expect(tab).toHaveAttribute("id", "tab-reservation");
    expect(tab).toHaveAttribute("aria-controls", "tabpanel-reservation");
    expect(tab).toHaveAttribute("tabindex", "0");
  });

  it("minWidthが0pxに設定される", () => {
    renderWithProviders(<Tab label="施設" value="institution" />);
    const tab = screen.getByRole("tab", { name: "施設" });
    expect(tab.style.minWidth).toBe("0px");
  });
});
