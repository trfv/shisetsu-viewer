import { env } from "cloudflare:test";
import { exportJWK, generateKeyPair } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sha256Hex } from "./crypto.ts";
import { createWorker } from "./index.ts";

// Google を差し替えて /auth/callback の成功パスを通す。実際の通信は起きない。
// この pool では vi.mock によるモジュール差し替えが効かず、seam が無いと
// テストが本物の Google エンドポイントを叩いてしまう。
const identity = { sub: "google-sub-1", email: "new@example.com", emailVerified: true };

const worker = createWorker({
  exchangeCode: async () => "dummy-id-token",
  verifyIdToken: async () => identity,
});

const NOW = new Date().toISOString();

function ctx(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  const priv = await exportJWK(pair.privateKey);
  priv.kid = "test-key";
  priv.alg = "ES256";
  (env as unknown as { AUTH_SIGNING_KEYS: string }).AUTH_SIGNING_KEYS = JSON.stringify([priv]);
});

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  identity.sub = "google-sub-1";
  identity.email = "new@example.com";
  identity.emailVerified = true;
});

/** state Cookie を正しく持った callback リクエストを組み立てる。 */
function callback(redirect = "/reservation", ip = "192.0.2.1") {
  const payload = btoa(JSON.stringify({ state: "s", verifier: "v", redirect }));
  return new Request("https://app.test/auth/callback?code=c&state=s", {
    headers: { Cookie: `__Host-oauth=${payload}`, "CF-Connecting-IP": ip },
  });
}

function setCookies(response: Response): string[] {
  return response.headers.getAll?.("Set-Cookie") ?? [response.headers.get("Set-Cookie") ?? ""];
}

describe("/auth/callback の成功パス", () => {
  it("新規ユーザーを trial で作り、セッション Cookie を発行して戻り先へ返す", async () => {
    const response = await worker.fetch(callback(), env, ctx());

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/reservation");

    const user = await env.DB.prepare(
      "SELECT role, trial_expires_at AS t, email FROM users WHERE google_sub = 'google-sub-1'"
    ).first<{ role: string; t: string; email: string }>();
    expect(user?.role).toBe("trial");
    expect(user?.email).toBe("new@example.com");
    // 期限は登録時刻 + 7 日。now を注入できないので、未来であることだけ確かめる。
    // ISO8601 の Z 表記どうしなので辞書順比較で時系列比較になる。
    expect(Date.parse(user?.t ?? "")).toBeGreaterThan(Date.parse(NOW));

    const sessions = await env.DB.prepare("SELECT COUNT(*) AS c FROM sessions").first<{
      c: number;
    }>();
    expect(sessions?.c).toBe(1);
  });

  it("セッション Cookie と OAuth Cookie の失効を 2 枚とも返す", async () => {
    const cookies = setCookies(await worker.fetch(callback(), env, ctx()));

    const session = cookies.find((c) => c.startsWith("__Host-session="));
    const oauth = cookies.find((c) => c.startsWith("__Host-oauth="));
    expect(session).toContain("HttpOnly");
    expect(session).toContain("SameSite=Lax");
    expect(oauth).toContain("Max-Age=0");
  });

  it("発行された Cookie の値が sessions の hash と対応する", async () => {
    const cookies = setCookies(await worker.fetch(callback(), env, ctx()));
    const raw = cookies.find((c) => c.startsWith("__Host-session="))?.split(";")[0] ?? "";
    const token = raw.replace("__Host-session=", "");

    const row = await env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash = ?")
      .bind(await sha256Hex(token))
      .first<{ user_id: string }>();
    expect(row?.user_id).toBeTruthy();
    // 生値そのものは保存されていない
    const raw_stored = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM sessions WHERE token_hash = ?"
    )
      .bind(token)
      .first<{ c: number }>();
    expect(raw_stored?.c).toBe(0);
  });

  // 未検証 email を認めると、他人の email を名乗るアカウントで昇格済みの行を奪える。
  // 乗っ取り防止の要なので明示的に固定する。
  it("email_verified が false なら users を作らずエラーへ倒す", async () => {
    identity.emailVerified = false;

    const response = await worker.fetch(callback(), env, ctx());

    expect(response.headers.get("Location")).toBe("/?auth_error=email_unverified");
    const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first<{ c: number }>();
    expect(count?.c).toBe(0);
  });

  it("Auth0 から移行した既存ユーザーに email で紐づき role を保つ", async () => {
    await env.DB.prepare(
      "INSERT INTO users (id, google_sub, email, role, created_at) VALUES ('u-legacy', NULL, 'new@example.com', 'user', ?)"
    )
      .bind(NOW)
      .run();

    await worker.fetch(callback(), env, ctx());

    const row = await env.DB.prepare(
      "SELECT id, role, google_sub AS sub FROM users WHERE email = 'new@example.com'"
    ).first<{ id: string; role: string; sub: string }>();
    expect(row?.id).toBe("u-legacy");
    expect(row?.role).toBe("user");
    expect(row?.sub).toBe("google-sub-1");
  });

  it("同じ email を別の google_sub が持っていれば email_conflict へ倒す", async () => {
    await env.DB.prepare(
      "INSERT INTO users (id, google_sub, email, role, created_at) VALUES ('u-owner', 'other-sub', 'new@example.com', 'user', ?)"
    )
      .bind(NOW)
      .run();

    const response = await worker.fetch(callback(), env, ctx());

    expect(response.headers.get("Location")).toBe("/?auth_error=email_conflict");
    const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM sessions").first<{ c: number }>();
    expect(count?.c).toBe(0);
  });

  it("Cookie 内の redirect も再検証して自オリジンに倒す", async () => {
    const response = await worker.fetch(callback("//evil.example/"), env, ctx());
    expect(response.headers.get("Location")).toBe("/");
  });
});
