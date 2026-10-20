import { SELF, env } from "cloudflare:test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const BASE = "https://api.test";
const LIMIT = 100;
const PERIOD_MS = 60_000;
const WINDOW_MARGIN_MS = 15_000;

let privateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const pubJwk = await exportJWK(pair.publicKey);
  pubJwk.kid = "test-key";
  pubJwk.alg = "RS256";
  pubJwk.use = "sig";
  // 同一 isolate なので worker (SELF.fetch) からも見える
  env.TEST_JWKS_JSON = JSON.stringify({ keys: [pubJwk] });
});

async function tokenFor(sub: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject(sub)
    .setIssuer(`https://${env.AUTH0_DOMAIN}/`)
    .setAudience(env.AUTH0_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

// 同一キーの状態は worker インスタンス内で共有されるので、テストごとに別 IP・別 sub を使う
async function get(path: string, ip: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = { "CF-Connecting-IP": ip };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return SELF.fetch(`${BASE}${path}`, { headers });
}

async function exhaust(ip: string, token?: string): Promise<Response | undefined> {
  for (let i = 0; i < LIMIT + 5; i++) {
    const res = await get("/v1/health", ip, token);
    if (res.status === 429) return res;
  }
  return undefined;
}

// JWT 付きの連打は 1 回ごとに RS256 を検証するので、Workers Builds の遅い環境では既定の 5 秒を超える
describe("レート制限", { timeout: 30_000 }, () => {
  // 窓は壁時計の 60 秒境界で切り替わり全キーのカウントが消えるので、境界の直前に始めると 429 に届かない
  beforeEach(async () => {
    const remaining = PERIOD_MS - (Date.now() % PERIOD_MS);
    if (remaining < WINDOW_MARGIN_MS) {
      await new Promise((resolve) => setTimeout(resolve, remaining + 100));
    }
  }, WINDOW_MARGIN_MS + 5_000);

  it("無認証の公開エンドポイントは上限超過で 429 + Retry-After を返す", async () => {
    const blocked = await exhaust("203.0.113.1");

    expect(blocked).toBeDefined();
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("60");
    expect(await blocked?.json()).toEqual({ error: "rate limit exceeded" });
  });

  it("上限内なら通常どおり応答する", async () => {
    const res = await get("/v1/health", "203.0.113.2");
    expect(res.status).toBe(200);
  });

  it("検証済みの利用者は sub で数え、同じ IP の他の利用者や無認証の枠を食わない", async () => {
    const ip = "203.0.113.4";
    expect(await exhaust(ip, await tokenFor("auth0|rate-a"))).toBeDefined();

    expect((await get("/v1/health", ip, await tokenFor("auth0|rate-b"))).status).toBe(200);
    expect((await get("/v1/health", ip)).status).toBe(200);
  });

  it("検証に失敗したトークンは IP で数える（偽のトークンで枠を増やせない）", async () => {
    const ip = "203.0.113.5";
    expect(await exhaust(ip)).toBeDefined();

    const res = await get("/v1/health", ip, "not-a-jwt");
    expect(res.status).toBe(429);
  });

  it("admin 系は対象外（scraper が短時間に大量 PUT するため）", async () => {
    const ip = "203.0.113.3";

    for (let i = 0; i < 120; i++) {
      const res = await SELF.fetch(`${BASE}/v1/admin/institutions`, {
        method: "PUT",
        headers: { "CF-Connecting-IP": ip },
        body: JSON.stringify({ rows: [] }),
      });
      // 429 ではなく認可の 401 が返る
      expect(res.status).toBe(401);
    }
  });
});
