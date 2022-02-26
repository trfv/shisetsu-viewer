import { describe, expect, test } from "vitest";
import {
  formatDate,
  formatDatetime,
  formatMonthDate,
  formatNumberWithCommas,
  formatPrice,
} from "../format";

describe("formatMonthDate", () => {
  test("empty string", () => {
    expect(formatMonthDate("")).toBe("");
  });
  test("string date", () => {
    expect(formatMonthDate("2022-02-26")).toBe("2月26日(土)");
  });
  test("Date date", () => {
    expect(formatMonthDate(new Date(2022, 1, 26))).toBe("2月26日(土)");
  });
});

describe("formatDate", () => {
  test("empty string", () => {
    expect(formatDate("")).toBe("");
  });
  test("string date", () => {
    expect(formatDate("2022-02-26")).toBe("2022/02/26(土)");
  });
  test("Date date", () => {
    expect(formatDate(new Date(2022, 1, 26))).toBe("2022/02/26(土)");
  });
});

describe("formatDatetime", () => {
  test("empty string", () => {
    expect(formatDatetime("")).toBe("");
  });
  test("string datetime", () => {
    expect(formatDatetime("2022-02-26T00:00:00")).toBe("2022/02/26 09:00:00");
  });
  test("Date datetime", () => {
    expect(formatDatetime(new Date("2022-02-26T09:00:00+0900"))).toBe("2022/02/26 09:00:00");
  });
});

describe("formatNumberWithCommas", () => {
  test("empty string", () => {
    expect(formatNumberWithCommas("")).toBe("");
  });
  test("zero number", () => {
    expect(formatNumberWithCommas(0)).toBe("0");
  });
  test("string number", () => {
    expect(formatNumberWithCommas("12345")).toBe("12,345");
  });
  test("number number", () => {
    expect(formatNumberWithCommas(12345)).toBe("12,345");
  });
});

describe("formatPrice", () => {
  test("empty string", () => {
    expect(formatPrice("")).toBe("");
  });
  test("zero number", () => {
    expect(formatPrice(0)).toBe("¥0");
  });
  test("string number", () => {
    expect(formatPrice("12345")).toBe("¥12,345");
  });
  test("number number", () => {
    expect(formatPrice(12345)).toBe("¥12,345");
  });
});
