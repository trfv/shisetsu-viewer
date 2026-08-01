import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  findSessionUser,
  resolveUser,
} from "../src/db/authQueries.ts";

const NOW = "2026-08-01T00:00:00.000Z";
const TRIAL_END = "2026-08-08T00:00:00.000Z";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
});

describe("resolveUser", () => {
  it("google_sub が一致する行を返す", async () => {
    await env.DB.prepare(
      "INSERT INTO users (id, google_sub, email, role, created_at) VALUES ('u1', 'sub-1', 'a@example.com', 'user', ?)"
    )
      .bind(NOW)
      .run();

    const user = await resolveUser(env.DB, {
      googleSub: "sub-1",
      email: "a@example.com",
      now: NOW,
      newId: "u-new",
      trialExpiresAt: TRIAL_END,
    });

    expect(user).toEqual({
      id: "u1",
      email: "a@example.com",
      role: "user",
      trialExpiresAt: null,
    });
  });

  it("google_sub が無ければ email 一致行に google_sub を書き込む", async () => {
    await env.DB.prepare(
      "INSERT INTO users (id, google_sub, email, role, created_at) VALUES ('u2', NULL, 'b@example.com', 'user', ?)"
    )
      .bind(NOW)
      .run();

    const user = await resolveUser(env.DB, {
      googleSub: "sub-2",
      email: "b@example.com",
      now: NOW,
      newId: "u-new",
      trialExpiresAt: TRIAL_END,
    });

    expect(user.id).toBe("u2");
    expect(user.role).toBe("user");

    const row = await env.DB.prepare("SELECT google_sub FROM users WHERE id = 'u2'").first<{
      google_sub: string;
    }>();
    expect(row?.google_sub).toBe("sub-2");
  });

  it("該当が無ければ trial で新規作成し期限を入れる", async () => {
    const user = await resolveUser(env.DB, {
      googleSub: "sub-3",
      email: "c@example.com",
      now: NOW,
      newId: "u-new",
      trialExpiresAt: TRIAL_END,
    });

    expect(user).toEqual({
      id: "u-new",
      email: "c@example.com",
      role: "trial",
      trialExpiresAt: TRIAL_END,
    });
  });

  it("既存ユーザーの再ログインで trial 期限が延長されない", async () => {
    await resolveUser(env.DB, {
      googleSub: "sub-4",
      email: "d@example.com",
      now: NOW,
      newId: "u-4",
      trialExpiresAt: TRIAL_END,
    });

    const again = await resolveUser(env.DB, {
      googleSub: "sub-4",
      email: "d@example.com",
      now: "2026-08-05T00:00:00.000Z",
      newId: "u-ignored",
      trialExpiresAt: "2026-08-12T00:00:00.000Z",
    });

    expect(again.trialExpiresAt).toBe(TRIAL_END);
  });
});

describe("session", () => {
  beforeEach(async () => {
    await env.DB.prepare(
      "INSERT INTO users (id, google_sub, email, role, created_at) VALUES ('u1', 'sub-1', 'a@example.com', 'user', ?)"
    )
      .bind(NOW)
      .run();
  });

  it("作成したセッションからユーザーを引ける", async () => {
    await createSession(env.DB, {
      tokenHash: "hash-1",
      userId: "u1",
      expiresAt: "2026-09-01T00:00:00.000Z",
      now: NOW,
    });

    const user = await findSessionUser(env.DB, "hash-1", NOW);
    expect(user).toEqual({
      id: "u1",
      email: "a@example.com",
      role: "user",
      trialExpiresAt: null,
    });
  });

  it("期限切れのセッションは引けない", async () => {
    await createSession(env.DB, {
      tokenHash: "hash-2",
      userId: "u1",
      expiresAt: "2026-07-01T00:00:00.000Z",
      now: NOW,
    });

    expect(await findSessionUser(env.DB, "hash-2", NOW)).toBeNull();
  });

  it("deleteExpiredSessions は期限切れだけ消す", async () => {
    await createSession(env.DB, {
      tokenHash: "old",
      userId: "u1",
      expiresAt: "2026-07-01T00:00:00.000Z",
      now: NOW,
    });
    await createSession(env.DB, {
      tokenHash: "live",
      userId: "u1",
      expiresAt: "2026-09-01T00:00:00.000Z",
      now: NOW,
    });

    await deleteExpiredSessions(env.DB, "u1", NOW);

    expect(await findSessionUser(env.DB, "live", NOW)).not.toBeNull();
    const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM sessions").first<{ c: number }>();
    expect(count?.c).toBe(1);
  });

  it("deleteSession で引けなくなる", async () => {
    await createSession(env.DB, {
      tokenHash: "hash-3",
      userId: "u1",
      expiresAt: "2026-09-01T00:00:00.000Z",
      now: NOW,
    });

    await deleteSession(env.DB, "hash-3");
    expect(await findSessionUser(env.DB, "hash-3", NOW)).toBeNull();
  });
});
