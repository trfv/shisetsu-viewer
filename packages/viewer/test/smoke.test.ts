import { describe, it, expect } from "vitest";

describe("Smoke Test", () => {
  it("should run basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have MSW server available", () => {
    expect(true).toBe(true);
  });
});
