import { describe, expect, it } from "vitest";

import { preflight } from "./preflight.ts";

const req = (method: string, path: string, headers: Record<string, string> = {}) =>
  new Request(`https://mcp.example.com${path}`, { method, headers });

describe("preflight", () => {
  it("未知のパスを 404 で短絡する", () => {
    const res = preflight(req("GET", "/wp-login.php"));
    expect(res?.status).toBe(404);
  });

  it("既知のパスは通す", () => {
    expect(preflight(req("GET", "/authorize"))).toBeNull();
    expect(preflight(req("POST", "/oauth/token"))).toBeNull();
    expect(preflight(req("POST", "/mcp"))).toBeNull();
  });

  it("形式不正な Bearer トークンを 401 で短絡する", () => {
    const res = preflight(req("POST", "/mcp", { authorization: "Bearer garbage" }));
    expect(res?.status).toBe(401);
  });

  it("OAuthProvider 形式のトークンは通す", () => {
    const res = preflight(req("POST", "/mcp", { authorization: "Bearer user:grant:hash" }));
    expect(res).toBeNull();
  });

  it("GET /mcp を 405 で短絡する（ステートレスなので SSE ストリームを提供しない）", () => {
    const res = preflight(
      req("GET", "/mcp", {
        accept: "text/event-stream",
        authorization: "Bearer user:grant:hash",
      })
    );
    expect(res?.status).toBe(405);
    expect(res?.headers.get("allow")).toBe("POST");
  });

  // DELETE はステートレスでも 200 で終わる（ハングしない）ので短絡しない
  it("DELETE /mcp は通す", () => {
    const res = preflight(req("DELETE", "/mcp", { authorization: "Bearer user:grant:hash" }));
    expect(res).toBeNull();
  });

  it("別オリジンのブラウザからの /mcp は 403 で弾き、Origin の無い要求と許可したオリジンは通す", () => {
    expect(preflight(req("POST", "/mcp", { origin: "https://evil.example" }))?.status).toBe(403);
    expect(preflight(req("POST", "/mcp"))).toBeNull();
    expect(preflight(req("POST", "/mcp", { origin: "https://claude.ai" }))).toBeNull();
    expect(preflight(req("POST", "/mcp", { origin: "https://mcp.example.com" }))).toBeNull();
  });

  it("GET /mcp の 405 は JSON-RPC エラー本文を返す", async () => {
    const res = preflight(req("GET", "/mcp", { accept: "text/event-stream" }));
    expect(res).not.toBeNull();
    const body = (await res!.json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32000);
  });
});
