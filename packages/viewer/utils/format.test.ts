import { describe, expect, test, vi } from "vitest";

import {
  formatDate,
  formatDatetime,
  formatMonthDate,
  formatNumberWithCommas,
  formatPrice,
} from "./format";

const withErrorMock = (fn: () => void) => {
  const spy = vi.spyOn(console, "error");
  spy.mockImplementation(() => null);
  fn();
  expect(spy).toHaveBeenCalledOnce();
  spy.mockReset();
};

describe("formatMonthDate", () => {
  test("empty string", () => {
    withErrorMock(() => expect(formatMonthDate("")).toBe(""));
  });
  test("string date", () => {
    expect(formatMonthDate("2022-02-26")).toBe("2月26日(土)");
  });
  test("Date date", () => {
    expect(formatMonthDate(new Date(2022, 1, 26))).toBe("2月26日(土)");
  });
  test("無効な文字列は空文字を返す（throw しない）", () => {
    withErrorMock(() => expect(formatMonthDate("not-a-date")).toBe(""));
  });
});

describe("formatDate", () => {
  test("empty string", () => {
    withErrorMock(() => expect(formatDate("")).toBe(""));
  });
  test("string date", () => {
    expect(formatDate("2022-02-26")).toBe("2022/02/26(土)");
  });
  test("Date date", () => {
    expect(formatDate(new Date(2022, 1, 26))).toBe("2022/02/26(土)");
  });
  test("無効な文字列は空文字を返す（throw しない）", () => {
    withErrorMock(() => expect(formatDate("not-a-date")).toBe(""));
  });
});

describe("formatDatetime", () => {
  test("empty string", () => {
    withErrorMock(() => expect(formatDatetime("")).toBe(""));
  });
  test("string datetime（Z 無し・UTC とみなす）", () => {
    expect(formatDatetime("2022-02-26T00:00:00")).toBe("2022/02/26 09:00:00");
  });
  test("Z 付き ISO 文字列（新 packages/api の形式）", () => {
    expect(formatDatetime("2022-02-26T00:00:00.000Z")).toBe("2022/02/26 09:00:00");
  });
  test("タイムゾーンオフセット付き文字列", () => {
    expect(formatDatetime("2022-02-26T09:00:00+09:00")).toBe("2022/02/26 09:00:00");
  });
  test("Date datetime", () => {
    expect(formatDatetime(new Date("2022-02-26T09:00:00+0900"))).toBe("2022/02/26 09:00:00");
  });
  test("無効な文字列は空文字を返す（throw しない）", () => {
    withErrorMock(() => expect(formatDatetime("not-a-date")).toBe(""));
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
