import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "../src/db/cursor.ts";

describe("cursor", () => {
  it("encode → decode で往復する", () => {
    const fields = { date: "2026-08-01", institution_id: "id-123" };
    const encoded = encodeCursor(fields);
    expect(decodeCursor(encoded)).toEqual(fields);
  });

  it("base64url なので + / = を含まない", () => {
    // 多くの区切りを含む値でも URL 安全な文字だけになる
    const encoded = encodeCursor({ a: "?>?>?>?>", b: "~~~~" });
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeCursor(encoded)).toEqual({ a: "?>?>?>?>", b: "~~~~" });
  });

  it("多バイト文字（かな）を含むキーも往復する", () => {
    const fields = { building_kana: "かいかんA", institution_kana: "おんがくしつ", id: "x" };
    expect(decodeCursor(encodeCursor(fields))).toEqual(fields);
  });

  it("不正な base64 は null", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
  });

  it("JSON にならない中身は null", () => {
    const notJson = btoa("not json at all").replace(/=+$/, "");
    expect(decodeCursor(notJson)).toBeNull();
  });

  it("オブジェクトでない JSON（配列・数値）は null", () => {
    const arr = encodeCursor({ x: "1" }).length > 0;
    expect(arr).toBe(true);
    const numeric = btoa("123").replace(/=+$/, "");
    expect(decodeCursor(numeric)).toBeNull();
  });
});
