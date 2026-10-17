import { describe, expect, it } from "vitest";

import { pick } from "./pick.ts";

const ALLOWED = ["id", "name", "size"] as const;

describe("pick", () => {
  it("selects the given fields only", () => {
    const obj = { id: "a", name: "b", size: "c" };
    expect(pick(obj, ALLOWED, ["id", "size"])).toEqual({ id: "a", size: "c" });
  });

  it("returns all allowed fields when selection is undefined", () => {
    const obj = { id: "a", name: "b", size: "c" };
    expect(pick(obj, ALLOWED, undefined)).toEqual({ id: "a", name: "b", size: "c" });
  });

  it("throws when a selected field is outside the allowlist", () => {
    expect(() => pick({ id: "a" }, ALLOWED, ["id", "bogus"])).toThrow(/Invalid field: bogus/);
  });

  it("silently drops allowlisted fields that are absent on the object", () => {
    // 旧 GraphQL の合成 id など、DTO に存在しないキーはエラーにせず落とす
    const obj = { name: "b" };
    expect(pick(obj, ALLOWED, undefined)).toEqual({ name: "b" });
  });
});
