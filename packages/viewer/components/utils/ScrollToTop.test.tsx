import { describe, it, expect, vi } from "vitest";
import { renderWithProviders } from "../../test/utils/test-utils";
import { ScrollToTop } from "./ScrollToTop";

describe("ScrollToTop Component", () => {
  it("マウント時にwindow.scrollTo(0, 0)を呼び出す", () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo");

    renderWithProviders(<ScrollToTop />);

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });
});
