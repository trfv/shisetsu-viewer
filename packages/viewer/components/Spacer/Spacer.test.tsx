import { describe, it, expect } from "vitest";
import { renderWithProviders } from "../../test/utils/test-utils";
import { Spacer } from "./Spacer";

describe("Spacer", () => {
  it("vertical方向ではwidth=1、height=sizeになる", () => {
    renderWithProviders(<Spacer size={20} axis="vertical" data-testid="spacer" />);
    const spacer = document.querySelector("span");
    expect(spacer).toBeDefined();
    expect(spacer!.style.width).toBe("1px");
    expect(spacer!.style.height).toBe("20px");
  });

  it("horizontal方向ではwidth=size、height=1になる", () => {
    renderWithProviders(<Spacer size={30} axis="horizontal" />);
    const spacer = document.querySelector("span");
    expect(spacer).toBeDefined();
    expect(spacer!.style.width).toBe("30px");
    expect(spacer!.style.height).toBe("1px");
  });
});
