import { SELF, env } from "cloudflare:test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { INSTITUTIONS, seed } from "./fixtures.ts";

const BASE = "https://api.example.com";
const ISSUER = `https://${env.AUTH0_DOMAIN}/`;

let privateKey: CryptoKey;

beforeAll(async () => {
  await seed(env.DB);
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const pubJwk = await exportJWK(pair.publicKey);
  pubJwk.kid = "test-key";
  pubJwk.alg = "RS256";
  pubJwk.use = "sig";
  // 同一 isolate なので worker (SELF.fetch) からも見える
  env.TEST_JWKS_JSON = JSON.stringify({ keys: [pubJwk] });
});

async function userToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ "https://hasura.io/jwt/claims": { "x-hasura-default-role": "user" } })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(env.AUTH0_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

describe("public endpoints", () => {
  it("GET /v1/health → 200 ok", async () => {
    const res = await SELF.fetch(`${BASE}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("GET /v1/institutions → 200 + Cache-Control", async () => {
    const res = await SELF.fetch(`${BASE}/v1/institutions?limit=5`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=600");
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("GET /v1/institutions/:id 非 RFC UUID も 200", async () => {
    const res = await SELF.fetch(`${BASE}/v1/institutions/${INSTITUTIONS[2].id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { building: string };
    expect(body.building).toBe("非RFC館");
  });

  it("不正な ID 形式は 404", async () => {
    const res = await SELF.fetch(`${BASE}/v1/institutions/not-a-uuid`);
    expect(res.status).toBe(404);
  });

  it("公開 GET はエッジキャッシュから返る（D1 の変更が max-age 内は見えない）", async () => {
    const url = `${BASE}/v1/institutions/${INSTITUTIONS[1].id}`;
    const before = (await (await SELF.fetch(url)).json()) as { building: string };
    expect(before.building).toBe("会館A");

    await env.DB.prepare(`UPDATE institutions SET building = ? WHERE id = ?`)
      .bind("差し替え後", INSTITUTIONS[1].id)
      .run();

    const after = (await (await SELF.fetch(url)).json()) as { building: string };
    expect(after.building).toBe("会館A");
  });

  it("キャッシュヒットでも CORS は リクエストごとの origin で返る", async () => {
    // キーから Origin を外している（Cloudflare の Cache は Vary をほぼ解釈しないため）。
    // CORS は handle() の外で付け直すので、origin が混ざらないことを押さえる。
    const url = `${BASE}/v1/institutions?limit=1&cors-probe=1`;
    const first = await SELF.fetch(url, { headers: { Origin: "http://localhost:3000" } });
    const second = await SELF.fetch(url, { headers: { Origin: "https://app.shisetsudb.com" } });
    expect(first.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(second.headers.get("Access-Control-Allow-Origin")).toBe("https://app.shisetsudb.com");
  });

  it("認証必須の GET はキャッシュされない（D1 の変更が即座に見える）", async () => {
    const url = `${BASE}/v1/institutions/${INSTITUTIONS[0].id}/reservations?limit=1`;
    const auth = { Authorization: `Bearer ${await userToken()}` };
    const before = (await (await SELF.fetch(url, { headers: auth })).json()) as {
      items: { date: string }[];
    };
    expect(before.items.length).toBeGreaterThan(0);

    await env.DB.prepare(`DELETE FROM reservations WHERE institution_id = ?`)
      .bind(INSTITUTIONS[0].id)
      .run();

    const after = (await (await SELF.fetch(url, { headers: auth })).json()) as {
      items: unknown[];
    };
    expect(after.items).toHaveLength(0);
  });

  it("GET /v1/scrape-runs → 200", async () => {
    const res = await SELF.fetch(`${BASE}/v1/scrape-runs`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { municipality: string }[] };
    expect(body.items.map((r) => r.municipality)).toContain("MUNICIPALITY_KOUTOU");
  });
});

describe("reservations 認可", () => {
  it("トークン無しの search は 401", async () => {
    const res = await SELF.fetch(
      `${BASE}/v1/reservations/search?startDate=2026-08-01&endDate=2026-08-31`
    );
    expect(res.status).toBe(401);
  });

  it("無効トークンの search は 403", async () => {
    const res = await SELF.fetch(
      `${BASE}/v1/reservations/search?startDate=2026-08-01&endDate=2026-08-31`,
      { headers: { Authorization: "Bearer not.a.jwt" } }
    );
    expect(res.status).toBe(403);
  });

  it("有効な user トークンの search は 200", async () => {
    const res = await SELF.fetch(
      `${BASE}/v1/reservations/search?startDate=2026-08-01&endDate=2026-08-04&isMorningVacant=true`,
      { headers: { Authorization: `Bearer ${await userToken()}` } }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("不正な日付は 400", async () => {
    const res = await SELF.fetch(
      `${BASE}/v1/reservations/search?startDate=bad&endDate=2026-08-31`,
      {
        headers: { Authorization: `Bearer ${await userToken()}` },
      }
    );
    expect(res.status).toBe(400);
  });

  it("施設別予約はトークン無しで 401", async () => {
    const res = await SELF.fetch(`${BASE}/v1/institutions/${INSTITUTIONS[0].id}/reservations`);
    expect(res.status).toBe(401);
  });

  it("認証必須の 200 は private, no-store を返す", async () => {
    // Cache-Control 無しの 200 はエッジ側の heuristic freshness で既定 2 時間
    // キャッシュされうる。ユーザー単位の応答なので明示的に落とす。
    const auth = { Authorization: `Bearer ${await userToken()}` };
    const search = await SELF.fetch(
      `${BASE}/v1/reservations/search?startDate=2026-08-01&endDate=2026-08-04`,
      { headers: auth }
    );
    const byInstitution = await SELF.fetch(
      `${BASE}/v1/institutions/${INSTITUTIONS[0].id}/reservations`,
      { headers: auth }
    );
    expect(search.headers.get("Cache-Control")).toBe("private, no-store");
    expect(byInstitution.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("ページングの一連フロー", () => {
  it("cursor を辿って全施設を重複なく取得する", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const qs: string = cursor ? `?limit=1&cursor=${encodeURIComponent(cursor)}` : "?limit=1";
      const res = await SELF.fetch(`${BASE}/v1/institutions${qs}`);
      const body = (await res.json()) as {
        items: { id: string }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
      seen.push(...body.items.map((x) => x.id));
      if (!body.pageInfo.hasNextPage) break;
      cursor = body.pageInfo.endCursor;
    }
    expect(seen).toEqual(INSTITUTIONS.map((i) => i.id));
  });
});
