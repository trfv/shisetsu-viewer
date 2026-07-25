import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const APP = "https://app.shisetsudb.com";

describe("CORS", () => {
  it("許可 origin からの OPTIONS プリフライトに 204 と CORS ヘッダを返す", async () => {
    const res = await SELF.fetch("https://api.example.com/v1/institutions", {
      method: "OPTIONS",
      headers: {
        Origin: APP,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Headers")?.toLowerCase()).toContain(
      "authorization"
    );
  });

  it("許可 origin からの GET 応答に Access-Control-Allow-Origin と Vary: Origin を付ける", async () => {
    const res = await SELF.fetch("https://api.example.com/v1/health", {
      headers: { Origin: APP },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  it("プレビュー *.trfv-dev.workers.dev を許可する", async () => {
    const origin = "https://worktree-rebuild-viewer-api-shisetsu-viewer.trfv-dev.workers.dev";
    const res = await SELF.fetch("https://api.example.com/v1/health", {
      headers: { Origin: origin },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("localhost 開発 origin を許可する", async () => {
    const origin = "http://localhost:3000";
    const res = await SELF.fetch("https://api.example.com/v1/health", {
      headers: { Origin: origin },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("許可されない origin には Access-Control-Allow-Origin を付けない", async () => {
    const res = await SELF.fetch("https://api.example.com/v1/health", {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
