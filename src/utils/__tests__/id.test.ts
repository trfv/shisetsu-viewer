import { describe, expect, test } from "vitest";
import { isValidUuid } from "../id";

describe("isValidUuid", () => {
  test("empty string", () => {
    expect(isValidUuid("")).toBe(false);
  });
  test("invalid uuid", () => {
    expect(isValidUuid("XXXX-XXXX-XXXX")).toBe(false);
  });
  test("valid uuid", () => {
    expect(isValidUuid("b3ed861c-c057-4b71-8678-93b7fea06202")).toBe(true);
  });
});
