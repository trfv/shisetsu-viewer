import { describe, expect, it } from "vitest";
import { toISODateString } from "./dateUtils";

describe("toISODateString", () => {
  it("should convert a standard Western calendar date string", () => {
    const dateString = "2023年4月1日";
    expect(toISODateString(dateString)).toBe("2023-04-01");
  });

  it("should convert a Reiwa date string", () => {
    const dateString = "令和5年12月25日";
    expect(toISODateString(dateString)).toBe("2023-12-25");
  });

  it("should convert a Heisei date string", () => {
    const dateString = "平成30年1月8日";
    expect(toISODateString(dateString)).toBe("2018-01-08");
  });

  it("should convert a Showa date string", () => {
    const dateString = "昭和63年11月30日";
    expect(toISODateString(dateString)).toBe("1988-11-30");
  });

  it("should handle single-digit month and day (Western)", () => {
    const dateString = "2024年1月5日";
    expect(toISODateString(dateString)).toBe("2024-01-05");
  });

  it("should handle single-digit month and day (Reiwa)", () => {
    const dateString = "令和6年2月9日";
    expect(toISODateString(dateString)).toBe("2024-02-09");
  });

  it("should handle single-digit month and day (Heisei)", () => {
    const dateString = "平成元年8月1日"; // 1989-08-01
    expect(toISODateString(dateString)).toBe("1989-08-01");
  });

  it("should handle single-digit month and day (Showa)", () => {
    const dateString = "昭和50年3月7日"; // 1975-03-07
    expect(toISODateString(dateString)).toBe("1975-03-07");
  });

  it("should handle double-digit year in Wareki (Reiwa)", () => {
    const dateString = "令和10年10月10日"; // 2028-10-10
    expect(toISODateString(dateString)).toBe("2028-10-10");
  });
});
