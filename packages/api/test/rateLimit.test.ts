import { SELF, env } from "cloudflare:test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

const BASE = "https://api.test";
// 上限は 100 req/60s
const LIMIT = 100;

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

// 無認証のレート制限は CF-Connecting-IP をキーにする。テスト間で枠を食い合わないよう
// テストごとに別 IP・別 sub を使う（同一キーの状態は worker インスタンス内で共有される）。
async function get(path: string, ip: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = { "CF-Connecting-IP": ip };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return SELF.fetch(`${BASE}${path}`, { headers });
}

/** 429 が返るまで叩き、その応答を返す（上限を少し超えても返らなければ undefined） */
async function exhaust(ip: string, token?: string): Promise<Response | undefined> {
  for (let i = 0; i < LIMIT + 5; i++) {
    const res = await get("/v1/health", ip, token);
    if (res.status === 429) return res;
  }
  return undefined;
}

// 上限（100 回）まで連打するテストが並ぶ。JWT 付きは 1 回ごとに RS256 を検証するので、
// Workers Builds の遅い環境では既定の 5 秒を超える（手元や GitHub Actions では収まる）
describe("レート制限", { timeout: 30_000 }, () => {
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
    // MCP サーバーのように、多数の利用者を一つの送信元 IP から中継する呼び出し元を想定する
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
