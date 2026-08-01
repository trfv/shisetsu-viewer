import { env } from "cloudflare:test";
import { exportJWK, generateKeyPair } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sha256Hex } from "./crypto.ts";
import worker from "./index.ts";

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = "2026-01-01T00:00:00.000Z";

function ctx(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

/** AUTH_SIGNING_KEYS は Secret のためテスト構成から注入できない。env に直接載せる。 */
beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  const priv = await exportJWK(pair.privateKey);
  priv.kid = "test-key";
  priv.alg = "ES256";
  (env as unknown as { AUTH_SIGNING_KEYS: string }).AUTH_SIGNING_KEYS = JSON.stringify([priv]);
});

async function seedSession(
  token: string,
  role: "anonymous" | "trial" | "user",
  trialExpiresAt: string | null = null
) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO users (id, google_sub, email, role, trial_expires_at, created_at) " +
      "VALUES ('u1', 'sub-1', 'a@example.com', ?, ?, ?)"
  )
    .bind(role, trialExpiresAt, NOW)
    .run();
  await env.DB.prepare(
    "INSERT OR REPLACE INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, 'u1', ?, ?)"
  )
    .bind(await sha256Hex(token), FUTURE, NOW)
    .run();
}

function withSession(url: string, token: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, Cookie: `__Host-session=${token}` },
  });
}

/** /auth/login が置いた __Host-oauth Cookie の中身を取り出す。 */
function oauthPayload(response: Response) {
  const cookie = response.headers.get("Set-Cookie") ?? "";
  const raw = cookie.split("__Host-oauth=")[1]?.split(";")[0] ?? "";
  return JSON.parse(atob(raw)) as { state: string; verifier: string; redirect: string };
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
});

describe("/auth/login", () => {
  it("Google へリダイレクトし state Cookie を置く", async () => {
    const request = new Request("https://app.test/auth/login?redirect=/reservation");
    const response = await worker.fetch(request, env, ctx());

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location") ?? "");
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(response.headers.get("Set-Cookie")).toContain("__Host-oauth=");
    expect(oauthPayload(response).redirect).toBe("/reservation");
  });

  it("state と code_challenge が Cookie の verifier と対応する", async () => {
    const response = await worker.fetch(new Request("https://app.test/auth/login"), env, ctx());
    const location = new URL(response.headers.get("Location") ?? "");
    const payload = oauthPayload(response);
    expect(location.searchParams.get("state")).toBe(payload.state);
    expect(payload.verifier).not.toBe(payload.state);
  });

  it("絶対 URL の redirect は無視してトップに倒す", async () => {
    const request = new Request("https://app.test/auth/login?redirect=https://evil.example/");
    expect(oauthPayload(await worker.fetch(request, env, ctx())).redirect).toBe("/");
  });

  it("スキーム相対の redirect も倒す", async () => {
    const request = new Request("https://app.test/auth/login?redirect=//evil.example/");
    expect(oauthPayload(await worker.fetch(request, env, ctx())).redirect).toBe("/");
  });
});

describe("/auth/callback", () => {
  it("state Cookie が無ければエラーでトップへ戻す", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/auth/callback?code=c&state=s"),
      env,
      ctx()
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/?auth_error=state_missing");
  });

  it("state が一致しなければエラーでトップへ戻す", async () => {
    const payload = btoa(JSON.stringify({ state: "correct", verifier: "v", redirect: "/" }));
    const response = await worker.fetch(
      new Request("https://app.test/auth/callback?code=c&state=wrong", {
        headers: { Cookie: `__Host-oauth=${payload}` },
      }),
      env,
      ctx()
    );
    expect(response.headers.get("Location")).toBe("/?auth_error=state_mismatch");
  });

  it("Google 側 error はそのままエラーへ倒す", async () => {
    const payload = btoa(JSON.stringify({ state: "s", verifier: "v", redirect: "/" }));
    const response = await worker.fetch(
      new Request("https://app.test/auth/callback?error=access_denied&state=s", {
        headers: { Cookie: `__Host-oauth=${payload}` },
      }),
      env,
      ctx()
    );
    expect(response.headers.get("Location")).toBe("/?auth_error=google");
  });
});

describe("/auth/me", () => {
  async function fetchMe(token: string) {
    const response = await worker.fetch(withSession("https://app.test/auth/me", token), env, ctx());
    return await response.json();
  }

  it("セッション無しなら未認証を返す", async () => {
    const response = await worker.fetch(new Request("https://app.test/auth/me"), env, ctx());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      authenticated: false,
      anonymous: true,
      trial: false,
      email: null,
    });
  });

  it("user はトライアル扱いにならない", async () => {
    await seedSession("tok-1", "user");
    expect(await fetchMe("tok-1")).toEqual({
      authenticated: true,
      anonymous: false,
      trial: false,
      email: "a@example.com",
    });
  });

  it("期限内の trial は user として扱い trial: true を返す", async () => {
    await seedSession("tok-4", "trial", FUTURE);
    expect(await fetchMe("tok-4")).toEqual({
      authenticated: true,
      anonymous: false,
      trial: true,
      email: "a@example.com",
    });
  });

  it("期限切れの trial は anonymous と同じ見え方になる", async () => {
    await seedSession("tok-5", "trial", PAST);
    expect(await fetchMe("tok-5")).toEqual({
      authenticated: true,
      anonymous: true,
      trial: false,
      email: "a@example.com",
    });
  });

  it("保存ロールが anonymous なら anonymous", async () => {
    await seedSession("tok-6", "anonymous");
    expect(await fetchMe("tok-6")).toEqual({
      authenticated: true,
      anonymous: true,
      trial: false,
      email: "a@example.com",
    });
  });
});

describe("/auth/logout", () => {
  it("セッションを消して Cookie を失効させる", async () => {
    await seedSession("tok-2", "user");
    const response = await worker.fetch(
      withSession("https://app.test/auth/logout", "tok-2", { method: "POST" }),
      env,
      ctx()
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM sessions").first<{ c: number }>();
    expect(count?.c).toBe(0);
  });

  it("GET は受け付けない", async () => {
    const response = await worker.fetch(new Request("https://app.test/auth/logout"), env, ctx());
    expect(response.status).toBe(404);
  });
});

describe("/api/*", () => {
  it("ホワイトリスト外は 404", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/api/v1/admin/reservations"),
      env,
      ctx()
    );
    expect(response.status).toBe(404);
  });

  it("セッションがあれば api へ転送される", async () => {
    await seedSession("tok-3", "user");
    const response = await worker.fetch(
      withSession("https://app.test/api/v1/institutions?limit=1", "tok-3"),
      env,
      ctx()
    );
    expect(response.status).toBe(200);
  });

  it("セッション無しでも公開経路は転送される", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/api/v1/institutions"),
      env,
      ctx()
    );
    expect(response.status).toBe(200);
  });
});

describe("未知の /auth/* パス", () => {
  it("404 を返す", async () => {
    const response = await worker.fetch(new Request("https://app.test/auth/unknown"), env, ctx());
    expect(response.status).toBe(404);
  });
});
