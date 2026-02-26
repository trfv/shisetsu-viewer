import { describe, it, expect } from "vitest";
import { ROUTES } from "./routes";

describe("ROUTES", () => {
  it("すべてのルートパスが定義されている", () => {
    expect(ROUTES.top).toBe("/");
    expect(ROUTES.waiting).toBe("/waiting");
    expect(ROUTES.reservation).toBe("/reservation");
    expect(ROUTES.institution).toBe("/institution");
    expect(ROUTES.detail).toBe("/institution/:id");
  });
});
