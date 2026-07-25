import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
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

  // DELETE はステートレスでも 200 を返して正常終了する（ハングしない）ため短絡しない
  it("DELETE /mcp は通す", () => {
    const res = preflight(req("DELETE", "/mcp", { authorization: "Bearer user:grant:hash" }));
    expect(res).toBeNull();
  });

  it("GET /mcp の 405 は JSON-RPC エラー本文を返す", async () => {
    const res = preflight(req("GET", "/mcp", { accept: "text/event-stream" }));
    expect(res).not.toBeNull();
    const body = (await res!.json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32000);
  });
});

/**
 * preflight が GET を弾く根拠を固定する。worker.ts はリクエストごとに transport を作り直す
 * ステートレス構成なので、GET が開く SSE ストリームには誰も書き込まない。Workers ランタイムは
 * これをハングと判定してリクエストを落とし、クライアントが再接続ループに入る。
 * SDK 側の挙動が変わったらこのテストが落ちて気づける。
 */
describe("WebStandardStreamableHTTPServerTransport の GET 挙動", () => {
  it("ステートレス構成の GET は、決して書き込まれない SSE ストリームを返す", async () => {
    const transport = new WebStandardStreamableHTTPServerTransport({});
    const res = await transport.handleRequest(
      new Request("https://mcp.example.com/mcp", {
        method: "GET",
        headers: { accept: "text/event-stream" },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    const reader = res.body!.getReader();
    const silent = Symbol("silent");
    const outcome = await Promise.race([
      reader.read(),
      new Promise((resolve) => setTimeout(() => resolve(silent), 200)),
    ]);

    // チャンクも終端も来ない = ランタイムから見て「応答を生成しえない」状態
    expect(outcome).toBe(silent);
    await reader.cancel();
  });
});
