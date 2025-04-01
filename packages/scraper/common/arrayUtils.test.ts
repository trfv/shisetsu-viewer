import { describe, expect, it } from "vitest";
import { stripTrailingEmptyValue } from "./arrayUtils";

describe("stripTrailingEmptyValue", () => {
  it("should remove trailing empty strings", () => {
    const arr = ["a", "b", "c", "", " "];
    expect(stripTrailingEmptyValue(arr)).toEqual(["a", "b", "c"]);
  });

  it("should remove multiple trailing empty strings", () => {
    const arr = ["a", "b", "", "", "  ", ""];
    expect(stripTrailingEmptyValue(arr)).toEqual(["a", "b"]);
  });

  it("should return the original array if no trailing empty strings", () => {
    const arr = ["a", "b", "c"];
    expect(stripTrailingEmptyValue(arr)).toEqual(["a", "b", "c"]);
  });

  it("should return an empty array if all elements are empty strings", () => {
    const arr = ["", " ", "  "];
    expect(stripTrailingEmptyValue(arr)).toEqual([]);
  });

  it("should return an empty array for an empty input array", () => {
    const arr: string[] = [];
    expect(stripTrailingEmptyValue(arr)).toEqual([]);
  });

  it("should handle arrays with only non-empty strings", () => {
    const arr = ["hello", "world"];
    expect(stripTrailingEmptyValue(arr)).toEqual(["hello", "world"]);
  });

  it("should handle arrays with empty strings in the middle", () => {
    const arr = ["a", "", "b", " ", "c", "", " "];
    expect(stripTrailingEmptyValue(arr)).toEqual(["a", "", "b", " ", "c"]);
  });
});
