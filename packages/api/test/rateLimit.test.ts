import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BASE = "https://api.test";

// レート制限は CF-Connecting-IP をキーにする。テスト間で枠を食い合わないよう
// テストごとに別 IP を使う（同一キーの状態は worker インスタンス内で共有される）。
async function get(path: string, ip: string): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`, { headers: { "CF-Connecting-IP": ip } });
}

describe("レート制限", () => {
  it("無認証の公開エンドポイントは上限超過で 429 + Retry-After を返す", async () => {
    const ip = "203.0.113.1";
    let blocked: Response | undefined;

    // 上限は 100 req/60s。超えるまで叩く
    for (let i = 0; i < 105; i++) {
      const res = await get("/v1/health", ip);
      if (res.status === 429) {
        blocked = res;
        break;
      }
    }

    expect(blocked).toBeDefined();
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("60");
    expect(await blocked?.json()).toEqual({ error: "rate limit exceeded" });
  });

  it("上限内なら通常どおり応答する", async () => {
    const res = await get("/v1/health", "203.0.113.2");
    expect(res.status).toBe(200);
  });

  it("admin 系は対象外（scraper が短時間に大量 PUT するため）", async () => {
    const ip = "203.0.113.3";

    // 上限を大きく超える回数を admin パスに投げても 429 にならないこと。
    // 認可は別途効くので 401 が返る = レート制限に到達していない。
    for (let i = 0; i < 120; i++) {
      const res = await SELF.fetch(`${BASE}/v1/admin/institutions`, {
        method: "PUT",
        headers: { "CF-Connecting-IP": ip },
        body: JSON.stringify({ rows: [] }),
      });
      expect(res.status).toBe(401);
    }
  });
});
