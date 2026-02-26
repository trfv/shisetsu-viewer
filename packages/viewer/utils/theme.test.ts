import { describe, it, expect } from "vitest";
import { palette, lightTheme, darkTheme } from "./theme";

describe("palette", () => {
  it("ヘッダー背景色が定義されている", () => {
    expect(palette.headerBg).toBe("#2A3544");
  });

  it("tealカラーが完全に定義されている", () => {
    expect(palette.teal.main).toBeDefined();
    expect(palette.teal.light).toBeDefined();
    expect(palette.teal.dark).toBeDefined();
  });

  it("slateカラーの全段階が定義されている", () => {
    expect(palette.slate[50]).toBeDefined();
    expect(palette.slate[100]).toBeDefined();
    expect(palette.slate[200]).toBeDefined();
    expect(palette.slate[300]).toBeDefined();
    expect(palette.slate[400]).toBeDefined();
    expect(palette.slate[500]).toBeDefined();
    expect(palette.slate[600]).toBeDefined();
    expect(palette.slate[700]).toBeDefined();
  });
});

describe("lightTheme", () => {
  it("lightモードで作成される", () => {
    expect(lightTheme.palette.mode).toBe("light");
  });

  it("primary色がteal.mainを使用する", () => {
    expect(lightTheme.palette.primary.main).toBe(palette.teal.main);
  });

  it("カスタムブレークポイントが設定されている", () => {
    expect(lightTheme.breakpoints.values.sm).toBe(680);
  });

  it("カスタムシャドウが設定されている", () => {
    expect(lightTheme.shadows[0]).toBe("none");
    expect(lightTheme.shadows[1]).toContain("rgba");
  });
});

describe("darkTheme", () => {
  it("darkモードで作成される", () => {
    expect(darkTheme.palette.mode).toBe("dark");
  });

  it("primary色がtealBright.mainを使用する", () => {
    expect(darkTheme.palette.primary.main).toBe(palette.tealBright.main);
  });

  it("背景色がslate.700を使用する", () => {
    expect(darkTheme.palette.background.default).toBe(palette.slate[700]);
  });

  it("カスタムシャドウが設定されている", () => {
    expect(darkTheme.shadows[0]).toBe("none");
    expect(darkTheme.shadows[1]).toContain("rgba(0,0,0");
  });
});
