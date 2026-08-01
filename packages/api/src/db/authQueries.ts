import type { StoredRole } from "../auth/roles.ts";

export interface UserRow {
  id: string;
  email: string;
  role: StoredRole;
  trialExpiresAt: string | null;
}

const SELECT_COLUMNS = "id, email, role, trial_expires_at AS trialExpiresAt";

/**
 * Google の sub から users 行を解決する。
 * 1) google_sub 一致 → その行
 * 2) email 一致かつ google_sub 未設定 → google_sub を書き込んで確定（Auth0 からの移行経路）
 * 3) どちらも無ければ role='trial' で新規作成し、trial_expires_at を入れる
 *
 * email が検証済みであることは呼び出し側が保証する。
 * 既存行の trial_expires_at は書き換えない。再ログインで期限が延びると
 * トライアルが無期限になるためである。
 */
export async function resolveUser(
  db: D1Database,
  params: {
    googleSub: string;
    email: string;
    now: string;
    newId: string;
    trialExpiresAt: string;
  }
): Promise<UserRow> {
  const { googleSub, email, now, newId, trialExpiresAt } = params;

  const bySub = await db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM users WHERE google_sub = ?`)
    .bind(googleSub)
    .first<UserRow>();
  if (bySub) {
    await db
      .prepare("UPDATE users SET last_login_at = ?, email = ? WHERE id = ?")
      .bind(now, email, bySub.id)
      .run();
    return { ...bySub, email };
  }

  const byEmail = await db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM users WHERE email = ? AND google_sub IS NULL`)
    .bind(email)
    .first<UserRow>();
  if (byEmail) {
    await db
      .prepare("UPDATE users SET google_sub = ?, last_login_at = ? WHERE id = ?")
      .bind(googleSub, now, byEmail.id)
      .run();
    return byEmail;
  }

  await db
    .prepare(
      "INSERT INTO users (id, google_sub, email, role, trial_expires_at, created_at, last_login_at) " +
        "VALUES (?, ?, ?, 'trial', ?, ?, ?)"
    )
    .bind(newId, googleSub, email, trialExpiresAt, now, now)
    .run();
  return { id: newId, email, role: "trial", trialExpiresAt };
}

export async function createSession(
  db: D1Database,
  params: { tokenHash: string; userId: string; expiresAt: string; now: string }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(params.tokenHash, params.userId, params.expiresAt, params.now)
    .run();
}

export async function deleteExpiredSessions(
  db: D1Database,
  userId: string,
  now: string
): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?")
    .bind(userId, now)
    .run();
}

export async function findSessionUser(
  db: D1Database,
  tokenHash: string,
  now: string
): Promise<UserRow | null> {
  return await db
    .prepare(
      "SELECT u.id, u.email, u.role, u.trial_expires_at AS trialExpiresAt FROM sessions s " +
        "JOIN users u ON u.id = s.user_id " +
        "WHERE s.token_hash = ? AND s.expires_at > ?"
    )
    .bind(tokenHash, now)
    .first<UserRow>();
}

export async function deleteSession(db: D1Database, tokenHash: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}
