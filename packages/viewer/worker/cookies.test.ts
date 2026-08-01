import { describe, expect, it } from "vitest";

import { readCookie, serializeCookie } from "./cookies.ts";

describe("readCookie", () => {
  it("複数の Cookie から目的の値を取り出す", () => {
    const request = new Request("https://app.test/", {
      headers: { Cookie: "a=1; __Host-session=abc; b=2" },
    });
    expect(readCookie(request, "__Host-session")).toBe("abc");
  });

  it("前方一致する別名に引っかからない", () => {
    const request = new Request("https://app.test/", {
      headers: { Cookie: "__Host-session-other=zzz" },
    });
    expect(readCookie(request, "__Host-session")).toBeNull();
  });

  it("値に = を含んでも末尾まで取れる", () => {
    const request = new Request("https://app.test/", {
      headers: { Cookie: "__Host-oauth=eyJhPSJ9=; x=1" },
    });
    expect(readCookie(request, "__Host-oauth")).toBe("eyJhPSJ9=");
  });

  it("Cookie ヘッダが無ければ null", () => {
    expect(readCookie(new Request("https://app.test/"), "__Host-session")).toBeNull();
  });
});

describe("serializeCookie", () => {
  it("__Host- prefix の要件を満たす属性を付ける", () => {
    const value = serializeCookie("__Host-session", "abc", 60);
    expect(value).toBe("__Host-session=abc; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=60");
  });

  it("Max-Age=0 で失効させられる", () => {
    expect(serializeCookie("__Host-session", "", 0)).toContain("Max-Age=0");
  });
});
