import { describe, it, expect } from "vitest";
import {
  BREAKPOINTS,
  CONTAINER_WIDTH,
  WIDTHS,
  FONT_SIZE,
  HEADER_HEIGHT,
  SEARCH_TABLE_HEIGHT,
} from "./styles";

describe("styles constants", () => {
  it("BREAKPOINTSが正しい値を持つ", () => {
    expect(BREAKPOINTS.xs).toBe(0);
    expect(BREAKPOINTS.sm).toBe(680);
    expect(BREAKPOINTS.md).toBe(960);
    expect(BREAKPOINTS.lg).toBe(1280);
    expect(BREAKPOINTS.xl).toBe(1920);
  });

  it("CONTAINER_WIDTHがlgブレークポイントと同じ", () => {
    expect(CONTAINER_WIDTH).toBe(BREAKPOINTS.lg);
  });

  it("WIDTHSが正しいサイズを持つ", () => {
    expect(WIDTHS.small).toBe(128);
    expect(WIDTHS.medium).toBe(256);
    expect(WIDTHS.large).toBe(512);
  });

  it("FONT_SIZEが正しいrem値を持つ", () => {
    expect(FONT_SIZE.small).toBe("0.75rem");
    expect(FONT_SIZE.medium).toBe("0.9375rem");
    expect(FONT_SIZE.large).toBe("1.125rem");
  });

  it("HEADER_HEIGHTが定義されている", () => {
    expect(HEADER_HEIGHT).toBe(72);
  });

  it("SEARCH_TABLE_HEIGHTがHEADER_HEIGHTから計算されている", () => {
    expect(SEARCH_TABLE_HEIGHT).toBe(`calc(100dvh - ${HEADER_HEIGHT + 240}px)`);
  });
});
