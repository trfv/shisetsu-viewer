import { describe, expect, it } from "vitest";

import { isAllowedApiPath, proxyToApi } from "./proxy.ts";

describe("isAllowedApiPath", () => {
  it("読み取り 5 経路を許可する", () => {
    expect(isAllowedApiPath("/v1/institutions")).toBe(true);
    expect(isAllowedApiPath("/v1/institutions/abc-123")).toBe(true);
    expect(isAllowedApiPath("/v1/institutions/abc-123/reservations")).toBe(true);
    expect(isAllowedApiPath("/v1/reservations/search")).toBe(true);
    expect(isAllowedApiPath("/v1/scrape-runs")).toBe(true);
  });

  it("admin 系を拒否する", () => {
    expect(isAllowedApiPath("/v1/admin/reservations")).toBe(false);
    expect(isAllowedApiPath("/v1/admin/institutions")).toBe(false);
    expect(isAllowedApiPath("/v1/admin/holidays")).toBe(false);
    expect(isAllowedApiPath("/v1/admin/reservations/export")).toBe(false);
  });

  it("未知のパスを拒否する", () => {
    expect(isAllowedApiPath("/v1/health")).toBe(false);
    expect(isAllowedApiPath("/v1/institutions/abc/../admin")).toBe(false);
    expect(isAllowedApiPath("/v1/institutions/")).toBe(false);
    expect(isAllowedApiPath("/v1/reservations/search/extra")).toBe(false);
    expect(isAllowedApiPath("")).toBe(false);
  });

  it("institution の id にスラッシュを含む偽装を拒否する", () => {
    expect(isAllowedApiPath("/v1/institutions/a/b")).toBe(false);
    expect(isAllowedApiPath("/v1/institutions/a/reservations/b")).toBe(false);
  });
});

/** 受け取った Request を記録して固定応答を返す Service Binding のスタブ。 */
function stubApi(capture: { request?: Request }): Fetcher {
  return {
    async fetch(request: Request) {
      capture.request = request;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      });
    },
  } as unknown as Fetcher;
}

describe("proxyToApi", () => {
  it("token があれば Authorization を付け、クエリを引き継ぐ", async () => {
    const capture: { request?: Request } = {};
    const request = new Request("https://app.test/api/v1/institutions?limit=5&municipality=kita");

    await proxyToApi({
      api: stubApi(capture),
      request,
      apiPath: "/v1/institutions",
      token: "jwt-token",
    });

    expect(capture.request?.url).toBe(
      "https://api.internal/v1/institutions?limit=5&municipality=kita"
    );
    expect(capture.request?.headers.get("Authorization")).toBe("Bearer jwt-token");
  });

  it("token が無ければ Authorization を付けない", async () => {
    const capture: { request?: Request } = {};
    await proxyToApi({
      api: stubApi(capture),
      request: new Request("https://app.test/api/v1/institutions"),
      apiPath: "/v1/institutions",
      token: null,
    });

    expect(capture.request?.headers.get("Authorization")).toBeNull();
  });

  it("ブラウザ由来の Cookie を api へ渡さない", async () => {
    const capture: { request?: Request } = {};
    await proxyToApi({
      api: stubApi(capture),
      request: new Request("https://app.test/api/v1/institutions", {
        headers: { Cookie: "__Host-session=secret" },
      }),
      apiPath: "/v1/institutions",
      token: null,
    });

    expect(capture.request?.headers.get("Cookie")).toBeNull();
  });

  it("Origin と Referer も api へ渡さない", async () => {
    const capture: { request?: Request } = {};
    await proxyToApi({
      api: stubApi(capture),
      request: new Request("https://app.test/api/v1/institutions", {
        headers: { Origin: "https://evil.example", Referer: "https://evil.example/x" },
      }),
      apiPath: "/v1/institutions",
      token: null,
    });

    expect(capture.request?.headers.get("Origin")).toBeNull();
    expect(capture.request?.headers.get("Referer")).toBeNull();
  });

  it("api の応答をそのまま返す", async () => {
    const capture: { request?: Request } = {};
    const response = await proxyToApi({
      api: stubApi(capture),
      request: new Request("https://app.test/api/v1/institutions"),
      apiPath: "/v1/institutions",
      token: null,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
