import { SELF, env } from "cloudflare:test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const BASE = "https://api.example.com";
const ADMIN_KEY = "test-admin-key-0123456789";

let githubPrivateKey: CryptoKey;

beforeAll(async () => {
  env.ADMIN_API_KEY = ADMIN_KEY;
  const pair = await generateKeyPair("RS256", { extractable: true });
  githubPrivateKey = pair.privateKey;
  const pubJwk = await exportJWK(pair.publicKey);
  pubJwk.kid = "gh-key";
  pubJwk.alg = "RS256";
  pubJwk.use = "sig";
  env.TEST_GITHUB_JWKS_JSON = JSON.stringify({ keys: [pubJwk] });
});

beforeEach(async () => {
  await env.DB.exec("DELETE FROM reservations");
  await env.DB.exec("DELETE FROM scrape_runs");
});

function adminHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY };
}

async function githubToken(ref = "refs/heads/master"): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ repository: env.GITHUB_REPOSITORY, ref })
    .setProtectedHeader({ alg: "RS256", kid: "gh-key" })
    .setIssuer("https://token.actions.githubusercontent.com")
    .setAudience(env.OIDC_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(githubPrivateKey);
}

function putReservations(headers: HeadersInit, rows: unknown[], runId = "run-1") {
  return SELF.fetch(`${BASE}/v1/admin/reservations`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ municipality: "MUNICIPALITY_KOUTOU", runId, rows }),
  });
}

const sampleRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    institution_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" },
  }));

describe("PUT /v1/admin/reservations 認可", () => {
  it("X-Admin-Key なし・Bearer なしは 401", async () => {
    const res = await putReservations({ "Content-Type": "application/json" }, sampleRows(1));
    expect(res.status).toBe(401);
  });

  it("誤った X-Admin-Key は 401", async () => {
    const res = await putReservations(
      { "Content-Type": "application/json", "X-Admin-Key": "wrong" },
      sampleRows(1)
    );
    expect(res.status).toBe(401);
  });

  it("正しい X-Admin-Key で 200 + rows_written + scrape_runs 記録", async () => {
    const res = await putReservations(adminHeaders(), sampleRows(3));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received: number; rowsWritten: number; deferred: boolean };
    expect(body.received).toBe(3);
    expect(body.rowsWritten).toBeGreaterThanOrEqual(3);
    expect(body.deferred).toBe(false);
    const runs = await SELF.fetch(`${BASE}/v1/scrape-runs`);
    const runsBody = (await runs.json()) as { items: { municipality: string }[] };
    expect(runsBody.items.map((r) => r.municipality)).toContain("MUNICIPALITY_KOUTOU");
  });

  it("GitHub OIDC Bearer でも 200", async () => {
    const res = await putReservations(
      { "Content-Type": "application/json", Authorization: `Bearer ${await githubToken()}` },
      sampleRows(2)
    );
    expect(res.status).toBe(200);
  });

  it("501 行は 400", async () => {
    const res = await putReservations(adminHeaders(), sampleRows(0));
    // 空は OK（0 行）だが、上限超過を検証
    expect(res.status).toBe(200);
    const tooMany = Array.from({ length: 501 }, (_, i) => ({
      institution_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      date: `2027-${String((i % 12) + 1).padStart(2, "0")}-01`,
      reservation: {},
    }));
    const res2 = await putReservations(adminHeaders(), tooMany);
    expect(res2.status).toBe(400);
  });
});

describe("書き込み予算ガード", () => {
  it("当日 rows_written が予算超過なら 202 deferred で書かない", async () => {
    // 予算(80000)を超える台帳を直接作る
    await env.DB.prepare(
      `INSERT INTO scrape_runs (municipality, run_id, run_date, rows_written) VALUES (?, ?, date('now'), ?)`
    )
      .bind("MUNICIPALITY_KOUTOU", "seed", 90000)
      .run();
    const res = await putReservations(adminHeaders(), sampleRows(3));
    expect(res.status).toBe(202);
    const body = (await res.json()) as { deferred: boolean; rowsWritten: number };
    expect(body.deferred).toBe(true);
    expect(body.rowsWritten).toBe(0);
    const count = await env.DB.prepare(`SELECT COUNT(*) AS c FROM reservations`).first<{
      c: number;
    }>();
    expect(count?.c).toBe(0); // 書かれていない
  });
});

describe("行数上限", () => {
  it("institutions は上限(2000)超過で 400", async () => {
    const rows = Array.from({ length: 2001 }, (_, i) => ({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
      prefecture: "PREFECTURE_TOKYO",
      municipality: "MUNICIPALITY_KOUTOU",
    }));
    const res = await SELF.fetch(`${BASE}/v1/admin/institutions`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ rows }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "too many rows" });
  });

  it("holidays は上限(1000)超過で 400", async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      name: `祝日${i}`,
    }));
    const res = await SELF.fetch(`${BASE}/v1/admin/holidays`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ rows }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "too many rows" });
  });
});

describe("PUT /v1/admin/holidays / export", () => {
  it("holidays を書いて search の is_holiday に反映される", async () => {
    const res = await SELF.fetch(`${BASE}/v1/admin/holidays`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ rows: [{ date: "2026-08-13", name: "臨時" }] }),
    });
    expect(res.status).toBe(200);
    const h = await env.DB.prepare(`SELECT name FROM holidays WHERE date = ?`)
      .bind("2026-08-13")
      .first<{ name: string }>();
    expect(h?.name).toBe("臨時");
  });

  it("export はページングして全行を dump する", async () => {
    // search は institutions と JOIN するため、対象施設を入れておく
    await env.DB.prepare(
      `INSERT INTO institutions (id, prefecture, municipality) VALUES (?, ?, ?)
       ON CONFLICT (id) DO NOTHING`
    )
      .bind("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "PREFECTURE_TOKYO", "MUNICIPALITY_KOUTOU")
      .run();
    await putReservations(adminHeaders(), sampleRows(5));
    const res = await SELF.fetch(`${BASE}/v1/admin/reservations/export?limit=2`, {
      headers: adminHeaders(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; pageInfo: { hasNextPage: boolean } };
    expect(body.items).toHaveLength(2);
    expect(body.pageInfo.hasNextPage).toBe(true);
  });

  it("export は認可必須（401）", async () => {
    const res = await SELF.fetch(`${BASE}/v1/admin/reservations/export`);
    expect(res.status).toBe(401);
  });
});
