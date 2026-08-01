# 自前 IdP と BFF 化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** viewer Worker を BFF にして Google を唯一の upstream とする自前認証へ移行し、viewer から Auth0 依存を取り除く。

**Architecture:** viewer Worker に `/auth/*` と `/api/*` を生やし、同一オリジンの HttpOnly Cookie でセッションを持つ。ブラウザにはトークンを一切渡さない。BFF は Service Binding で api Worker を呼び、寿命 60 秒の自前 JWT を付与する。api は issuer マップで Auth0 と自前 issuer の両方を受け付ける。

**Tech Stack:** Cloudflare Workers、D1、jose、React 19、Vite 8、@cloudflare/vite-plugin、@cloudflare/vitest-pool-workers、vitest 4

設計文書：`docs/superpowers/specs/2026-08-01-self-hosted-auth-bff-design.md`

## Global Constraints

- Node >= 24。ES Modules。npm workspaces（`-w @shisetsu-viewer/<package>`）
- 型検査は TypeScript 7 の素の `tsc`（各パッケージの `typecheck` script）
- Formatter は oxfmt（printWidth 100、double quotes、trailing commas es5、sortImports）。Linter は oxlint。disable コメントは `oxlint-disable-next-line <plugin>/<rule>`
- default export は名前付き const で行う。匿名アロー関数の default export は禁止
- コメントと文言は日本語。timezone は Asia/Tokyo
- 作業は git worktree で行い、worktree 作成直後に必ずルートで `npm install` を実行する
- master へ直接 push しない。ブランチと PR を経由する
- 非対話シェルで pre-commit がコマンド解決に失敗する場合は `PATH="$PWD/node_modules/.bin:$PATH" git commit ...` で回避する。`--no-verify` は使わない
- `.npmrc` の `min-release-age=3` により、公開から 3 日未満のバージョンは取得できない
- Cloudflare のツールチェインは**同じ日に公開された組で揃える**。`@cloudflare/vitest-pool-workers` が wrangler と miniflare を厳密固定するため、wrangler だけ上げると root と `packages/*` に二重の workerd が生まれる。2026-08-01 時点で取得できる組は 2026-07-28 公開の次の 3 点である（`min-release-age=3` により、これより新しい組は ETARGET になる）
  - `wrangler` 4.115.0
  - `@cloudflare/vitest-pool-workers` 0.19.0
  - `@cloudflare/vite-plugin` 1.48.0
- ワークスペースをまたぐ依存を更新したら、`rm -f package-lock.json && npm install --package-lock-only && npm dedupe` で単一 hoist に畳み、`node_modules/workerd` が 1 つだけであることを確認する
- 自前 issuer は `https://app.shisetsudb.com/`、audience は `shisetsu-api`、クレーム名前空間は `https://app.shisetsudb.com/token/claims`

---

### Task 1: wrangler を 4.115.0 へ更新する

`@cloudflare/vite-plugin@1.48.0` の peerDependencies が `wrangler: ^4.115.0` を要求する。
現在は viewer、api、mcp-server の 3 パッケージとも 4.112.0 である。
この更新は認証移行と独立しているため、単独のコミットにする。

**Files:**
- Modify: `packages/viewer/package.json`
- Modify: `packages/api/package.json`
- Modify: `packages/mcp-server/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: なし
- Produces: wrangler 4.115.0 が全パッケージで利用可能になる

- [ ] **Step 1: 取得可能な最新バージョンを確認する**

```bash
npm view wrangler versions --json | tail -20
npm view wrangler time --json | python3 -c "import json,sys;d=json.load(sys.stdin);print(list(d.items())[-5:])"
```

`min-release-age=3` により、公開から 3 日未満のバージョンは `ETARGET` になる。
2026-08-01 時点では 4.115.0（2026-07-28 公開）が上限である。
4.116.0 以降は公開から 3 日未満のため取得できない。

- [ ] **Step 2: 3 パッケージをまとめて更新する**

```bash
npm install -D wrangler@<選んだバージョン> -w @shisetsu-viewer/viewer -w @shisetsu-viewer/api -w @shisetsu-viewer/mcp-server
```

- [ ] **Step 3: 型検査とテストが通ることを確認する**

```bash
npm run typecheck:all
npm test -w @shisetsu-viewer/api
```

Expected: いずれも成功

- [ ] **Step 4: コミット**

```bash
git add packages/*/package.json package-lock.json
git commit -m "chore(deps): wrangler を 4.115 へ更新する"
```

---

### Task 2: users と sessions のマイグレーションを追加する

**Files:**
- Create: `packages/api/migrations/0003_auth.sql`

**Interfaces:**
- Consumes: なし
- Produces: `users`（id, google_sub, email, role, trial_expires_at, created_at, last_login_at）と `sessions`（token_hash, user_id, expires_at, created_at）

- [ ] **Step 1: マイグレーションを書く**

```sql
-- 0003: 自前認証のための users と sessions を追加する。
-- google_sub を NULL 許容にしているのは、Auth0 から移行する既存ユーザーを
-- email だけ先に投入し、初回 Google ログイン時に紐づけるためである。
-- trial_expires_at を列に持つのは、トライアル期間の設定を後で変えたときに
-- 既存ユーザーの期限が遡って動かないようにするためである。

CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  google_sub       TEXT UNIQUE,
  email            TEXT NOT NULL UNIQUE,
  role             TEXT NOT NULL DEFAULT 'trial'
                   CHECK (role IN ('anonymous', 'trial', 'user')),
  trial_expires_at TEXT,
  created_at       TEXT NOT NULL,
  last_login_at    TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

- [ ] **Step 2: ローカル D1 に適用して構文を確認する**

```bash
npm run migrate:local -w @shisetsu-viewer/api
```

Expected: 適用成功。エラーが出たら SQL を直す

- [ ] **Step 3: コミット**

```bash
git add packages/api/migrations/0003_auth.sql
git commit -m "feat(api): users と sessions のマイグレーションを追加する"
```

---

### Task 3: 実効ロールの算出と認証用の D1 クエリを実装する

BFF が使うユーザー解決とセッション操作、そしてトライアル期限を織り込んだ実効ロールの算出を api パッケージに置く。
viewer Worker からは `@shisetsu-viewer/api/db/authQueries` と `@shisetsu-viewer/api/auth/roles` として import する。

**Files:**
- Create: `packages/api/src/auth/roles.ts`
- Create: `packages/api/test/roles.test.ts`
- Create: `packages/api/src/db/authQueries.ts`
- Create: `packages/api/test/authQueries.test.ts`
- Modify: `packages/api/package.json`（exports に `./db/authQueries` と `./auth/roles` を追加）

**Interfaces:**
- Consumes: Task 2 の `users` と `sessions`
- Produces:
  - `type StoredRole = "anonymous" | "trial" | "user"`
  - `type Role = "anonymous" | "user"`
  - `const TRIAL_DURATION_DAYS = 7`
  - `effectiveRole(stored: StoredRole, trialExpiresAt: string | null, now: string): Role`
  - `interface UserRow { id: string; email: string; role: StoredRole; trialExpiresAt: string | null }`
  - `resolveUser(db: D1Database, params: { googleSub: string; email: string; now: string; newId: string; trialExpiresAt: string }): Promise<UserRow>`
  - `createSession(db: D1Database, params: { tokenHash: string; userId: string; expiresAt: string; now: string }): Promise<void>`
  - `deleteExpiredSessions(db: D1Database, userId: string, now: string): Promise<void>`
  - `findSessionUser(db: D1Database, tokenHash: string, now: string): Promise<UserRow | null>`
  - `deleteSession(db: D1Database, tokenHash: string): Promise<void>`

`resolveUser` に `emailVerified` を渡さないのは、呼び出し側（コールバック）が `email_verified: false` のログインを先に弾くためである。
検証済みの email だけがここへ到達する。

`trialExpiresAt` を引数で受け取るのは、期限の決め方（登録時刻 + 7 日）という方針をクエリ層に持ち込まないためである。

- [ ] **Step 0: 実効ロールの算出を TDD で作る**

`packages/api/test/roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { effectiveRole, TRIAL_DURATION_DAYS } from "../src/auth/roles.ts";

const NOW = "2026-08-01T00:00:00.000Z";

describe("effectiveRole", () => {
  it("user は期限に関係なく user", () => {
    expect(effectiveRole("user", null, NOW)).toBe("user");
  });

  it("anonymous は期限が残っていても anonymous", () => {
    expect(effectiveRole("anonymous", "2026-09-01T00:00:00.000Z", NOW)).toBe("anonymous");
  });

  it("期限内の trial は user", () => {
    expect(effectiveRole("trial", "2026-08-08T00:00:00.000Z", NOW)).toBe("user");
  });

  it("期限切れの trial は anonymous", () => {
    expect(effectiveRole("trial", "2026-07-25T00:00:00.000Z", NOW)).toBe("anonymous");
  });

  it("期限ちょうどは anonymous（境界は期限切れ側）", () => {
    expect(effectiveRole("trial", NOW, NOW)).toBe("anonymous");
  });

  it("期限が NULL の trial は anonymous", () => {
    expect(effectiveRole("trial", null, NOW)).toBe("anonymous");
  });

  it("トライアル期間は 7 日", () => {
    expect(TRIAL_DURATION_DAYS).toBe(7);
  });
});
```

```bash
npm test -w @shisetsu-viewer/api -- roles
```

Expected: FAIL（`../src/auth/roles.ts` が無い）

`packages/api/src/auth/roles.ts`:

```ts
/** users.role に保存される値。認可に使う実効ロールとは別物である。 */
export type StoredRole = "anonymous" | "trial" | "user";

/** 認可に使う実効ロール。api の契約はこの 2 値である。 */
export type Role = "anonymous" | "user";

export const TRIAL_DURATION_DAYS = 7;

/**
 * 保存ロールとトライアル期限から実効ロールを決める。
 * 期限は ISO8601 の文字列比較で判定する（両方 UTC の Z 表記であることが前提）。
 *
 * サブプロジェクト 3 で mcp-server を自前化するときも、この関数を通す。
 * 通し忘れると期限切れのトライアルユーザーが MCP から予約データを読めてしまう。
 */
export function effectiveRole(
  stored: StoredRole,
  trialExpiresAt: string | null,
  now: string
): Role {
  if (stored === "user") return "user";
  if (stored === "trial" && trialExpiresAt && now < trialExpiresAt) return "user";
  return "anonymous";
}
```

```bash
npm test -w @shisetsu-viewer/api -- roles
```

Expected: PASS（7 テスト）

- [ ] **Step 1: 失敗するテストを書く**

`packages/api/test/authQueries.test.ts`:

```ts
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
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -w @shisetsu-viewer/api -- authQueries
```

Expected: FAIL（`Cannot find module '../src/db/authQueries.ts'`）

- [ ] **Step 3: 実装する**

`packages/api/src/db/authQueries.ts`:

```ts
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
```

- [ ] **Step 4: exports を追加する**

`packages/api/package.json` の `exports` に 1 行足す。

```json
"./db/authQueries": "./src/db/authQueries.ts",
"./auth/roles": "./src/auth/roles.ts"
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm test -w @shisetsu-viewer/api -- authQueries
```

Expected: PASS（10 テスト）

- [ ] **Step 6: コミット**

```bash
git add packages/api/src/auth/roles.ts packages/api/test/roles.test.ts \
  packages/api/src/db/authQueries.ts packages/api/test/authQueries.test.ts packages/api/package.json
git commit -m "feat(api): 実効ロールの算出と認証用の D1 クエリを追加する"
```

---

### Task 4: api を複数 issuer 対応にする

**Files:**
- Modify: `packages/api/src/auth/auth0.ts`
- Modify: `packages/api/src/worker.ts:110-127`
- Modify: `packages/api/wrangler.jsonc`
- Modify: `packages/api/test/auth0.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `SELF_ISSUER = "https://app.shisetsudb.com/"`
  - `SELF_AUDIENCE = "shisetsu-api"`
  - `resolveRole(token, env, overrides?: { auth0?: JWTVerifyGetKey; self?: JWTVerifyGetKey }): Promise<Role>`
  - `env.SELF_JWKS_JSON`：自前 issuer の公開 JWKS（JSON 文字列）

`packages/mcp-server/worker.ts:165` は `resolveRole(token, env)` の 2 引数呼び出しなので変更不要である。

- [ ] **Step 1: 失敗するテストを追加する**

`packages/api/test/auth0.test.ts` の末尾に足す。冒頭の import に `SELF_AUDIENCE` と `SELF_ISSUER` を加える。

```ts
describe("自前 issuer", () => {
  let selfPrivate: CryptoKey;
  let selfGetKey: JWTVerifyGetKey;

  beforeAll(async () => {
    const pair = await generateKeyPair("ES256", { extractable: true });
    selfPrivate = pair.privateKey;
    const pubJwk = await exportJWK(pair.publicKey);
    pubJwk.kid = "self-key";
    pubJwk.alg = "ES256";
    const publicKey = await importJWK(pubJwk, "ES256");
    selfGetKey = (() => publicKey) as unknown as JWTVerifyGetKey;
  });

  async function signSelf(role: string) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ "https://app.shisetsudb.com/token/claims": { role } })
      .setProtectedHeader({ alg: "ES256", kid: "self-key" })
      .setIssuer(SELF_ISSUER)
      .setAudience(SELF_AUDIENCE)
      .setSubject("u1")
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(selfPrivate);
  }

  it("自前 issuer の role: user → user", async () => {
    const token = await signSelf("user");
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("user");
  });

  it("自前 issuer の role: anonymous → anonymous", async () => {
    const token = await signSelf("anonymous");
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("anonymous");
  });

  it("未知の issuer は anonymous", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: "self-key" })
      .setIssuer("https://evil.example/")
      .setAudience(SELF_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(selfPrivate);
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("anonymous");
  });

  it("JWT として解釈できない文字列は anonymous", async () => {
    expect(await resolveRole("not-a-jwt", ENV, { self: selfGetKey })).toBe("anonymous");
  });
});
```

既存テストの `resolveRole(token, ENV, getKey)` を `resolveRole(token, ENV, { auth0: getKey })` に全て書き換える。

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -w @shisetsu-viewer/api -- auth0
```

Expected: FAIL（`SELF_ISSUER` が export されていない）

- [ ] **Step 3: 実装する**

`packages/api/src/auth/auth0.ts` を全面的に書き換える。

```ts
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";

// Role の定義は roles.ts に移した。mcp-server が auth0 経由で import しているため再輸出する。
export type { Role } from "./roles.ts";
import type { Role } from "./roles.ts";

const HASURA_CLAIMS = "https://hasura.io/jwt/claims";
const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";

/** BFF が発行する JWT の issuer と audience */
export const SELF_ISSUER = "https://app.shisetsudb.com/";
export const SELF_AUDIENCE = "shisetsu-api";

// JWKS はユーザー非依存のためモジュールレベルのキャッシュで良い（可変シングルトン禁止の対象外）。
let auth0Jwks: JWTVerifyGetKey | null = null;
let selfJwks: JWTVerifyGetKey | null = null;

function getAuth0Jwks(domain: string): JWTVerifyGetKey {
  auth0Jwks ??= createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  return auth0Jwks;
}

function getSelfJwks(jwksJson: string): JWTVerifyGetKey {
  selfJwks ??= createLocalJWKSet(JSON.parse(jwksJson));
  return selfJwks;
}

interface AuthEnv {
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  SELF_JWKS_JSON?: string;
}

interface KeyOverrides {
  auth0?: JWTVerifyGetKey;
  self?: JWTVerifyGetKey;
}

/**
 * access token からロールを解決する。検証失敗・トークン無し・未知の issuer は anonymous。
 * 署名検証の前に読むのは iss だけで、他のクレームは検証後にしか参照しない。
 *
 * overrides はテスト用の鍵注入である。省略時は Auth0 のリモート JWKS と
 * env.SELF_JWKS_JSON のローカル JWKS を使う。
 */
export async function resolveRole(
  token: string | undefined,
  env: AuthEnv,
  overrides?: KeyOverrides
): Promise<Role> {
  if (!token) return "anonymous";

  let issuer: string | undefined;
  try {
    issuer = decodeJwt(token).iss;
  } catch {
    return "anonymous";
  }

  const auth0Issuer = `https://${env.AUTH0_DOMAIN}/`;

  if (issuer === auth0Issuer) {
    const getKey = overrides?.auth0 ?? getAuth0Jwks(env.AUTH0_DOMAIN);
    return await verifyAndResolve(token, getKey, auth0Issuer, env.AUTH0_AUDIENCE, ["RS256"]);
  }

  if (issuer === SELF_ISSUER) {
    const getKey =
      overrides?.self ?? (env.SELF_JWKS_JSON ? getSelfJwks(env.SELF_JWKS_JSON) : undefined);
    if (!getKey) return "anonymous";
    return await verifyAndResolve(token, getKey, SELF_ISSUER, SELF_AUDIENCE, ["ES256"]);
  }

  return "anonymous";
}

async function verifyAndResolve(
  token: string,
  getKey: JWTVerifyGetKey,
  issuer: string,
  audience: string,
  algorithms: string[]
): Promise<Role> {
  try {
    const { payload } = await jwtVerify(token, getKey, { issuer, audience, algorithms });
    const app = payload[APP_CLAIMS] as { role?: string; trial?: boolean } | undefined;
    if (app?.trial === true) return "anonymous";
    if (app?.role && app.role !== "anonymous") return "user";
    const hasura = payload[HASURA_CLAIMS] as Record<string, unknown> | undefined;
    return hasura?.["x-hasura-default-role"] === "user" ? "user" : "anonymous";
  } catch {
    return "anonymous";
  }
}
```

- [ ] **Step 4: worker.ts の呼び出し側を直す**

`packages/api/src/worker.ts` の `Env` に `SELF_JWKS_JSON: string;` を足し、`testJwks` の使い方を変える。

```ts
async function authorizeUser(request: Request, env: Env): Promise<Response | null> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return error(401, "authentication required");
  const role = await resolveRole(token, env, { auth0: testJwks(env) });
  if (role !== "user") return error(403, "insufficient role");
  return null;
}
```

- [ ] **Step 5: wrangler.jsonc に空の SELF_JWKS_JSON を置く**

`packages/api/wrangler.jsonc` の `vars` に追加する。実際の公開鍵は Task 13 で入れる。

```jsonc
"SELF_JWKS_JSON": ""
```

`getSelfJwks` は空文字を渡されないよう `resolveRole` 側で分岐済みである。

- [ ] **Step 6: テストが通ることを確認する**

```bash
npm test -w @shisetsu-viewer/api
```

Expected: 全 PASS

- [ ] **Step 7: コミット**

```bash
git add packages/api/src/auth/auth0.ts packages/api/src/worker.ts packages/api/wrangler.jsonc packages/api/test/auth0.test.ts
git commit -m "feat(api): issuer マップで自前 JWT と Auth0 JWT を併存させる"
```

---

### Task 5: @cloudflare/vite-plugin を導入し Worker を配置する

BFF の中身を書く前に、Worker が動く土台を作る。
この時点の Worker は `/api/*` と `/auth/*` を 501 で返すだけにして、静的配信が壊れていないことを確認する。

**Files:**
- Create: `packages/viewer/worker/index.ts`
- Modify: `packages/viewer/vite.config.ts`
- Modify: `packages/viewer/vitest.config.ts`
- Modify: `packages/viewer/wrangler.jsonc`
- Modify: `packages/viewer/package.json`

**Interfaces:**
- Consumes: なし
- Produces: `packages/viewer/worker/index.ts` の default export（`ExportedHandler<Env>`）と `Env` 型

- [ ] **Step 1: プラグインを追加する**

```bash
npm install -D @cloudflare/vite-plugin@1.48.0 -w @shisetsu-viewer/viewer
```

1.48.0 に固定するのは、peer が `wrangler: ^4.115.0` で Task 1 の版と一致するためである。
1.49.0 以降は `wrangler ^4.116.0` 以上を要求し、`min-release-age=3` の下では今日入れられない。

- [ ] **Step 2: 最小の Worker を書く**

`packages/viewer/worker/index.ts`:

```ts
export interface Env {
  ASSETS: Fetcher;
}

export const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
      return new Response("not implemented", { status: 501 });
    }
    return await env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

export default worker;
```

- [ ] **Step 3: wrangler.jsonc に main、assets、bindings を足す**

bindings は後続タスクのテストが `env.DB` と `env.API` を要求するため、この時点で全て宣言する。
Secrets（`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`AUTH_SIGNING_KEYS`）は Task 13 で投入する。

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "shisetsu-viewer",
  "compatibility_date": "2026-02-28",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./worker/index.ts",
  "workers_dev": true,
  "preview_urls": true,
  "observability": { "enabled": true },
  "assets": {
    "directory": "./dist/client",
    "binding": "ASSETS",
    "html_handling": "drop-trailing-slash",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/auth/*", "/api/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shisetsu-db",
      // 本番 D1（APAC）。packages/api/wrangler.jsonc と同じ ID。
      "database_id": "353bd30e-d421-460f-821a-018fd05a455c"
    }
  ],
  "services": [{ "binding": "API", "service": "shisetsu-api" }],
  // ログイン経路の総当たり対策。api 側の RATE_LIMITER は別 Worker のため共有できない。
  "ratelimits": [
    {
      "name": "AUTH_RATE_LIMITER",
      "namespace_id": "1002",
      // period は 10 または 60 のみ指定可能
      "simple": { "limit": 20, "period": 60 }
    }
  ],
  "vars": { "APP_ORIGIN": "https://app.shisetsudb.com" },
  "dev": { "port": 3000 }
}
```

`migrations_dir` は api 側にだけ置く。
viewer からマイグレーションを適用することはない。

- [ ] **Step 4: vite.config.ts にプラグインを足す**

`plugins: [react()]` を `plugins: [react(), cloudflare()]` に変え、`import { cloudflare } from "@cloudflare/vite-plugin";` を足す。
`build.rollupOptions.output` はそのまま残す。

- [ ] **Step 5: vitest.config.ts から worker ディレクトリを除外する**

`test.exclude` の配列に `"worker/**"` を足す。
browser mode のテストが Worker のテストを拾わないようにする。

- [ ] **Step 6: ビルドと dev server を確認する**

```bash
npm run build -w @shisetsu-viewer/viewer
ls packages/viewer/dist/client/index.html
```

Expected: `dist/client/index.html` が存在する。存在しなければプラグインの出力先を確認して `assets.directory` を合わせる

```bash
npm start
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/health
```

Expected: 前者 200、後者 501

- [ ] **Step 7: deploy script のアセット指定を直す**

`packages/viewer/package.json` の `deploy:versions` を `wrangler versions upload` に変える。
`main` が設定された今、`--assets` の明示は不要である。

- [ ] **Step 8: 既存のフロントテストが壊れていないことを確認する**

```bash
npm run test:ci -w @shisetsu-viewer/viewer
```

Expected: 従来どおり PASS

- [ ] **Step 9: コミット**

```bash
git add packages/viewer/worker packages/viewer/vite.config.ts packages/viewer/vitest.config.ts packages/viewer/wrangler.jsonc packages/viewer/package.json package.json package-lock.json
git commit -m "build(viewer): @cloudflare/vite-plugin を導入し BFF の土台を置く"
```

---

### Task 6: Cookie と乱数のユーティリティを実装する

**Files:**
- Create: `packages/viewer/worker/cookies.ts`
- Create: `packages/viewer/worker/crypto.ts`
- Create: `packages/viewer/worker/cookies.test.ts`
- Create: `packages/viewer/worker/crypto.test.ts`
- Create: `packages/viewer/vitest.worker.config.ts`
- Create: `packages/viewer/worker/test-setup.ts`
- Modify: `packages/viewer/package.json`

**Interfaces:**
- Consumes: なし
- Produces:
  - `readCookie(request: Request, name: string): string | null`
  - `serializeCookie(name: string, value: string, maxAgeSeconds: number): string`
  - `randomToken(): string`
  - `sha256Hex(input: string): Promise<string>`
  - `codeChallenge(verifier: string): Promise<string>`

- [ ] **Step 1: Worker 用のテスト構成を作る**

```bash
npm install -D @cloudflare/vitest-pool-workers -w @shisetsu-viewer/viewer
```

`packages/viewer/vitest.worker.config.ts`:

```ts
import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        path.join(import.meta.dirname, "../api/migrations")
      );
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            GOOGLE_CLIENT_ID: "test-client-id",
            GOOGLE_CLIENT_SECRET: "test-secret",
            APP_ORIGIN: "https://app.test",
          },
        },
      };
    }),
  ],
  test: {
    include: ["worker/**/*.test.ts"],
    setupFiles: ["./worker/test-setup.ts"],
  },
});
```

`packages/viewer/worker/test-setup.ts`:

```ts
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

`packages/viewer/package.json` の scripts に足す。

```json
"test:worker": "vitest run --config vitest.worker.config.ts"
```

- [ ] **Step 2: 失敗するテストを書く**

`packages/viewer/worker/cookies.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { readCookie, serializeCookie } from "./cookies.ts";

describe("readCookie", () => {
  it("複数の Cookie から目的の値を取り出す", () => {
    const request = new Request("https://app.test/", {
      headers: { Cookie: "a=1; __Host-session=abc; b=2" },
    });
    expect(readCookie(request, "__Host-session")).toBe("abc");
  });

  it("前方一致する別名に引っかからない", () => {
    const request = new Request("https://app.test/", {
      headers: { Cookie: "__Host-session-other=zzz" },
    });
    expect(readCookie(request, "__Host-session")).toBeNull();
  });

  it("Cookie ヘッダが無ければ null", () => {
    expect(readCookie(new Request("https://app.test/"), "__Host-session")).toBeNull();
  });
});

describe("serializeCookie", () => {
  it("__Host- prefix の要件を満たす属性を付ける", () => {
    const value = serializeCookie("__Host-session", "abc", 60);
    expect(value).toBe("__Host-session=abc; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=60");
  });
});
```

`packages/viewer/worker/crypto.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { codeChallenge, randomToken, sha256Hex } from "./crypto.ts";

describe("randomToken", () => {
  it("base64url で 43 文字前後を返し、毎回異なる", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(42);
    expect(a).not.toBe(b);
  });
});

describe("sha256Hex", () => {
  it("既知の入力に対する SHA-256 を hex で返す", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});

describe("codeChallenge", () => {
  it("RFC 7636 の例と一致する", async () => {
    expect(await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer
```

Expected: FAIL（モジュールが無い）

- [ ] **Step 4: 実装する**

`packages/viewer/worker/cookies.ts`:

```ts
/** Cookie ヘッダから name に完全一致する値を取り出す。無ければ null。 */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

/**
 * __Host- prefix の要件（Secure かつ Path=/ かつ Domain 属性なし）を満たす形で直列化する。
 * これによりサブドメインから Cookie を上書きされる経路を塞ぐ。
 */
export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
```

`packages/viewer/worker/crypto.ts`:

```ts
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32 バイトの乱数を base64url で返す。セッショントークンと code_verifier に使う。 */
export function randomToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** PKCE の S256 チャレンジ。base64url(SHA-256(verifier)) を返す。 */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer
```

Expected: PASS（7 テスト）

- [ ] **Step 6: コミット**

```bash
git add packages/viewer/worker packages/viewer/vitest.worker.config.ts packages/viewer/package.json package-lock.json
git commit -m "feat(viewer): BFF の Cookie と乱数ユーティリティを追加する"
```

---

### Task 7: api 向け JWT の発行を実装する

**Files:**
- Create: `packages/viewer/worker/jwt.ts`
- Create: `packages/viewer/worker/jwt.test.ts`
- Modify: `packages/viewer/package.json`（jose を依存に追加）

**Interfaces:**
- Consumes: `SELF_ISSUER`、`SELF_AUDIENCE`（Task 4）
- Produces: `signApiToken(signingKeysJson: string, userId: string, role: string): Promise<string>`

`signingKeysJson` は秘密 JWK の配列を JSON 文字列にしたもので、先頭を署名に使う。

- [ ] **Step 1: 失敗するテストを書く**

`packages/viewer/worker/jwt.test.ts`:

```ts
import { exportJWK, generateKeyPair, importJWK, jwtVerify, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { signApiToken } from "./jwt.ts";

let signingKeysJson: string;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  const priv = await exportJWK(pair.privateKey);
  priv.kid = "k1";
  priv.alg = "ES256";
  signingKeysJson = JSON.stringify([priv]);
  publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = "k1";
  publicJwk.alg = "ES256";
});

describe("signApiToken", () => {
  it("api が検証できる iss / aud / claim を持つ JWT を返す", async () => {
    const token = await signApiToken(signingKeysJson, "u1", "user");
    const key = await importJWK(publicJwk, "ES256");

    const { payload, protectedHeader } = await jwtVerify(token, key, {
      issuer: "https://app.shisetsudb.com/",
      audience: "shisetsu-api",
      algorithms: ["ES256"],
    });

    expect(protectedHeader.kid).toBe("k1");
    expect(payload.sub).toBe("u1");
    expect(payload["https://app.shisetsudb.com/token/claims"]).toEqual({ role: "user" });
  });

  it("寿命は 60 秒である", async () => {
    const token = await signApiToken(signingKeysJson, "u1", "user");
    const key = await importJWK(publicJwk, "ES256");
    const { payload } = await jwtVerify(token, key, {
      issuer: "https://app.shisetsudb.com/",
      audience: "shisetsu-api",
    });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(60);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- jwt
```

Expected: FAIL（`./jwt.ts` が無い）

- [ ] **Step 3: 実装する**

```bash
npm install jose@6.2.3 -w @shisetsu-viewer/viewer
```

`packages/viewer/worker/jwt.ts`:

```ts
import { importJWK, SignJWT, type JWK } from "jose";

import { SELF_AUDIENCE, SELF_ISSUER } from "@shisetsu-viewer/api/auth/auth0";

const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";

/**
 * api へ渡す寿命 60 秒の JWT を署名する。
 * signingKeysJson は秘密 JWK の配列。先頭が署名鍵で、残りは検証側のローテーション用に存在する。
 */
export async function signApiToken(
  signingKeysJson: string,
  userId: string,
  role: string
): Promise<string> {
  const keys = JSON.parse(signingKeysJson) as JWK[];
  const jwk = keys[0];
  if (!jwk) throw new Error("AUTH_SIGNING_KEYS が空です");

  const key = await importJWK(jwk, "ES256");
  return await new SignJWT({ [APP_CLAIMS]: { role } })
    .setProtectedHeader({ alg: "ES256", kid: jwk.kid })
    .setIssuer(SELF_ISSUER)
    .setAudience(SELF_AUDIENCE)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key);
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- jwt
```

Expected: PASS（2 テスト）

- [ ] **Step 5: コミット**

```bash
git add packages/viewer/worker/jwt.ts packages/viewer/worker/jwt.test.ts packages/viewer/package.json package-lock.json
git commit -m "feat(viewer): BFF から api へ渡す短命 JWT の発行を追加する"
```

---

### Task 8: Google OIDC のクライアントを実装する

**Files:**
- Create: `packages/viewer/worker/google.ts`
- Create: `packages/viewer/worker/google.test.ts`

**Interfaces:**
- Consumes: `codeChallenge`（Task 6）
- Produces:
  - `interface GoogleIdentity { sub: string; email: string; emailVerified: boolean }`
  - `buildAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string; challenge: string }): string`
  - `exchangeCode(params: { clientId: string; clientSecret: string; redirectUri: string; code: string; verifier: string }): Promise<string>`（id_token を返す）
  - `verifyIdToken(idToken: string, clientId: string, getKey?: JWTVerifyGetKey): Promise<GoogleIdentity>`

- [ ] **Step 1: 失敗するテストを書く**

`packages/viewer/worker/google.test.ts`:

```ts
import { fetchMock } from "cloudflare:test";
import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildAuthorizeUrl, exchangeCode, verifyIdToken } from "./google.ts";

let privateKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "g1";
  pub.alg = "RS256";
  const publicKey = await importJWK(pub, "RS256");
  getKey = (() => publicKey) as unknown as JWTVerifyGetKey;
});

beforeEach(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

async function signIdToken(claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "g1" })
    .setIssuer("https://accounts.google.com")
    .setAudience("test-client-id")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);
}

describe("buildAuthorizeUrl", () => {
  it("必要なクエリを全て載せる", () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: "cid",
        redirectUri: "https://app.test/auth/callback",
        state: "st",
        challenge: "ch",
      })
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("exchangeCode", () => {
  it("id_token を取り出す", async () => {
    fetchMock
      .get("https://oauth2.googleapis.com")
      .intercept({ path: "/token", method: "POST" })
      .reply(200, { id_token: "dummy-id-token" });

    const idToken = await exchangeCode({
      clientId: "cid",
      clientSecret: "secret",
      redirectUri: "https://app.test/auth/callback",
      code: "code-1",
      verifier: "verifier-1",
    });

    expect(idToken).toBe("dummy-id-token");
  });

  it("エラー応答なら例外を投げる", async () => {
    fetchMock
      .get("https://oauth2.googleapis.com")
      .intercept({ path: "/token", method: "POST" })
      .reply(400, { error: "invalid_grant" });

    await expect(
      exchangeCode({
        clientId: "cid",
        clientSecret: "secret",
        redirectUri: "https://app.test/auth/callback",
        code: "bad",
        verifier: "v",
      })
    ).rejects.toThrow(/invalid_grant/);
  });
});

describe("verifyIdToken", () => {
  it("sub と email と email_verified を返す", async () => {
    const token = await signIdToken({
      sub: "google-sub-1",
      email: "a@example.com",
      email_verified: true,
    });

    expect(await verifyIdToken(token, "test-client-id", getKey)).toEqual({
      sub: "google-sub-1",
      email: "a@example.com",
      emailVerified: true,
    });
  });

  it("audience が違えば例外", async () => {
    const token = await signIdToken({ sub: "s", email: "a@example.com", email_verified: true });
    await expect(verifyIdToken(token, "other-client", getKey)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- google
```

Expected: FAIL（`./google.ts` が無い）

- [ ] **Step 3: 実装する**

`packages/viewer/worker/google.ts`:

```ts
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUER = "https://accounts.google.com";

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

// JWKS はユーザー非依存のためモジュールレベルのキャッシュで良い。
let jwks: JWTVerifyGetKey | null = null;

function getJwks(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(CERTS_URL));
  return jwks;
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** 認可コードを id_token に交換する。access_token は使わないので捨てる。 */
export async function exchangeCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.verifier,
    grant_type: "authorization_code",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json()) as { id_token?: string; error?: string };
  if (!response.ok || !json.id_token) {
    throw new Error(`Google token endpoint error: ${json.error ?? response.status}`);
  }
  return json.id_token;
}

/** getKey はテスト用の鍵注入。省略時は Google の JWKS を使う。 */
export async function verifyIdToken(
  idToken: string,
  clientId: string,
  getKey?: JWTVerifyGetKey
): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, getKey ?? getJwks(), {
    issuer: ISSUER,
    audience: clientId,
    algorithms: ["RS256"],
  });

  const sub = payload.sub;
  const email = payload["email"];
  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("id_token に sub または email がありません");
  }
  return { sub, email, emailVerified: payload["email_verified"] === true };
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- google
```

Expected: PASS（5 テスト）

- [ ] **Step 5: コミット**

```bash
git add packages/viewer/worker/google.ts packages/viewer/worker/google.test.ts
git commit -m "feat(viewer): BFF に Google OIDC クライアントを追加する"
```

---

### Task 9: api への転送とホワイトリストを実装する

**Files:**
- Create: `packages/viewer/worker/proxy.ts`
- Create: `packages/viewer/worker/proxy.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `isAllowedApiPath(path: string): boolean`
  - `proxyToApi(params: { api: Fetcher; request: Request; apiPath: string; token: string | null }): Promise<Response>`

`api` を引数で受け取るのは、テストからスタブを渡せるようにするためである。
Service Binding の実体は `env.API` から呼び出し側が渡す。

- [ ] **Step 1: 失敗するテストを書く**

`packages/viewer/worker/proxy.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isAllowedApiPath, proxyToApi } from "./proxy.ts";

describe("isAllowedApiPath", () => {
  it("読み取り 5 経路を許可する", () => {
    expect(isAllowedApiPath("/v1/institutions")).toBe(true);
    expect(isAllowedApiPath("/v1/institutions/abc-123")).toBe(true);
    expect(isAllowedApiPath("/v1/institutions/abc-123/reservations")).toBe(true);
    expect(isAllowedApiPath("/v1/reservations/search")).toBe(true);
    expect(isAllowedApiPath("/v1/scrape-runs")).toBe(true);
  });

  it("admin 系を拒否する", () => {
    expect(isAllowedApiPath("/v1/admin/reservations")).toBe(false);
    expect(isAllowedApiPath("/v1/admin/reservations/export")).toBe(false);
  });

  it("未知のパスを拒否する", () => {
    expect(isAllowedApiPath("/v1/health")).toBe(false);
    expect(isAllowedApiPath("/v1/institutions/abc/../admin")).toBe(false);
  });
});

describe("proxyToApi", () => {
  function stubApi(capture: { request?: Request }): Fetcher {
    return {
      async fetch(request: Request) {
        capture.request = request;
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
        });
      },
    } as unknown as Fetcher;
  }

  it("token があれば Authorization を付ける", async () => {
    const capture: { request?: Request } = {};
    const request = new Request("https://app.test/api/v1/institutions?limit=5");

    await proxyToApi({
      api: stubApi(capture),
      request,
      apiPath: "/v1/institutions",
      token: "jwt-token",
    });

    expect(capture.request?.url).toBe("https://api.internal/v1/institutions?limit=5");
    expect(capture.request?.headers.get("Authorization")).toBe("Bearer jwt-token");
  });

  it("token が無ければ Authorization を付けない", async () => {
    const capture: { request?: Request } = {};
    await proxyToApi({
      api: stubApi(capture),
      request: new Request("https://app.test/api/v1/institutions"),
      apiPath: "/v1/institutions",
      token: null,
    });

    expect(capture.request?.headers.get("Authorization")).toBeNull();
  });

  it("ブラウザ由来の Cookie を api へ渡さない", async () => {
    const capture: { request?: Request } = {};
    await proxyToApi({
      api: stubApi(capture),
      request: new Request("https://app.test/api/v1/institutions", {
        headers: { Cookie: "__Host-session=secret" },
      }),
      apiPath: "/v1/institutions",
      token: null,
    });

    expect(capture.request?.headers.get("Cookie")).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- proxy
```

Expected: FAIL（`./proxy.ts` が無い）

- [ ] **Step 3: 実装する**

`packages/viewer/worker/proxy.ts`:

```ts
// api の内部 URL。Service Binding では host は使われないが、Request の構築に必要である。
const INTERNAL_ORIGIN = "https://api.internal";

// BFF が転送してよい読み取り経路。Cookie 認証である以上、admin 系の PUT を
// 素通しにできないため、パスは列挙で閉じる。SameSite=Lax は第二の防壁にすぎない。
const ALLOWED_PATHS: RegExp[] = [
  /^\/v1\/institutions$/,
  /^\/v1\/institutions\/[^/]+$/,
  /^\/v1\/institutions\/[^/]+\/reservations$/,
  /^\/v1\/reservations\/search$/,
  /^\/v1\/scrape-runs$/,
];

export function isAllowedApiPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

export async function proxyToApi(params: {
  api: Fetcher;
  request: Request;
  apiPath: string;
  token: string | null;
}): Promise<Response> {
  const { search } = new URL(params.request.url);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (params.token) headers.set("Authorization", `Bearer ${params.token}`);

  const upstream = new Request(`${INTERNAL_ORIGIN}${params.apiPath}${search}`, {
    method: "GET",
    headers,
  });

  return await params.api.fetch(upstream);
}
```

ヘッダを引き継がず新規に組み立てているのは、`Cookie` と `Origin` を api へ渡さないためである。

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- proxy
```

Expected: PASS（6 テスト）

- [ ] **Step 5: コミット**

```bash
git add packages/viewer/worker/proxy.ts packages/viewer/worker/proxy.test.ts
git commit -m "feat(viewer): api への転送とパスのホワイトリストを追加する"
```

---

### Task 10: BFF のルーティングを組み上げる

**Files:**
- Modify: `packages/viewer/worker/index.ts`
- Create: `packages/viewer/worker/index.test.ts`

**Interfaces:**
- Consumes: Task 3、6、7、8、9 の全 export
- Produces: `Env`（ASSETS、API、DB、GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、AUTH_SIGNING_KEYS、APP_ORIGIN）と 5 経路のハンドラ

- [ ] **Step 1: 失敗するテストを書く**

`packages/viewer/worker/index.test.ts`:

```ts
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { serializeCookie } from "./cookies.ts";
import { sha256Hex } from "./crypto.ts";
import worker from "./index.ts";

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

function ctx(): ExecutionContext {
  return { waitUntil: () => undefined, passThroughOnException: () => undefined };
}

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
    expect(response.headers.get("Set-Cookie")).toContain("__Host-oauth=");
  });

  it("絶対 URL の redirect は無視してトップに倒す", async () => {
    const request = new Request("https://app.test/auth/login?redirect=https://evil.example/");
    const response = await worker.fetch(request, env, ctx());
    const cookie = response.headers.get("Set-Cookie") ?? "";
    const payload = JSON.parse(atob(cookie.split("__Host-oauth=")[1]?.split(";")[0] ?? ""));
    expect(payload.redirect).toBe("/");
  });

  it("スキーム相対の redirect も倒す", async () => {
    const request = new Request("https://app.test/auth/login?redirect=//evil.example/");
    const response = await worker.fetch(request, env, ctx());
    const cookie = response.headers.get("Set-Cookie") ?? "";
    const payload = JSON.parse(atob(cookie.split("__Host-oauth=")[1]?.split(";")[0] ?? ""));
    expect(payload.redirect).toBe("/");
  });
});

describe("/auth/me", () => {
  async function fetchMe(token: string) {
    const response = await worker.fetch(
      new Request("https://app.test/auth/me", {
        headers: { Cookie: serializeCookie("__Host-session", token, 60).split(";")[0] ?? "" },
      }),
      env,
      ctx()
    );
    return await response.json();
  }

  it("セッション無しなら未認証を返す", async () => {
    const response = await worker.fetch(new Request("https://app.test/auth/me"), env, ctx());
    expect(response.status).toBe(200);
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
    await seedSession("tok-5", "trial", "2026-01-01T00:00:00.000Z");
    expect(await fetchMe("tok-5")).toEqual({
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
      new Request("https://app.test/auth/logout", {
        method: "POST",
        headers: { Cookie: "__Host-session=tok-2" },
      }),
      env,
      ctx()
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM sessions").first<{ c: number }>();
    expect(count?.c).toBe(0);
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
      new Request("https://app.test/api/v1/institutions?limit=1", {
        headers: { Cookie: "__Host-session=tok-3" },
      }),
      env,
      ctx()
    );
    // env.API はテスト構成でスタブに差し替わる
    expect(response.status).toBe(200);
  });
});
```

`env.API` は `vitest.worker.config.ts` の `miniflare.serviceBindings` でスタブに差し替える。
設定に次を足す。

```ts
serviceBindings: {
  API: () =>
    new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
},
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer -- index
```

Expected: FAIL（501 が返る）

- [ ] **Step 3: 実装する**

`packages/viewer/worker/index.ts` を書き換える。

```ts
import { effectiveRole, TRIAL_DURATION_DAYS } from "@shisetsu-viewer/api/auth/roles";
import {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  findSessionUser,
  resolveUser,
} from "@shisetsu-viewer/api/db/authQueries";

import { readCookie, serializeCookie } from "./cookies.ts";
import { codeChallenge, randomToken, sha256Hex } from "./crypto.ts";
import { buildAuthorizeUrl, exchangeCode, verifyIdToken } from "./google.ts";
import { signApiToken } from "./jwt.ts";
import { isAllowedApiPath, proxyToApi } from "./proxy.ts";

export interface Env {
  ASSETS: Fetcher;
  API: Fetcher;
  DB: D1Database;
  AUTH_RATE_LIMITER?: RateLimit;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SIGNING_KEYS: string;
  APP_ORIGIN: string;
}

const SESSION_COOKIE = "__Host-session";
const OAUTH_COOKIE = "__Host-oauth";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const OAUTH_TTL_SECONDS = 600;

interface OauthState {
  state: string;
  verifier: string;
  redirect: string;
}

/** オープンリダイレクトを防ぐ。自オリジン内のパスだけを許す。 */
function safeRedirect(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function redirectTo(location: string, cookie?: string): Response {
  const headers = new Headers({ Location: location });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const payload: OauthState = {
    state: randomToken(),
    verifier: randomToken(),
    redirect: safeRedirect(url.searchParams.get("redirect")),
  };

  const authorizeUrl = buildAuthorizeUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: `${env.APP_ORIGIN}/auth/callback`,
    state: payload.state,
    challenge: await codeChallenge(payload.verifier),
  });

  const cookie = serializeCookie(OAUTH_COOKIE, btoa(JSON.stringify(payload)), OAUTH_TTL_SECONDS);
  return redirectTo(authorizeUrl, cookie);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const raw = readCookie(request, OAUTH_COOKIE);
  if (!raw) return redirectTo("/?auth_error=state_missing");

  let saved: OauthState;
  try {
    saved = JSON.parse(atob(raw)) as OauthState;
  } catch {
    return redirectTo("/?auth_error=state_broken");
  }

  if (url.searchParams.get("error")) return redirectTo("/?auth_error=google");
  if (url.searchParams.get("state") !== saved.state) {
    return redirectTo("/?auth_error=state_mismatch");
  }

  const code = url.searchParams.get("code");
  if (!code) return redirectTo("/?auth_error=code_missing");

  let identity;
  try {
    const idToken = await exchangeCode({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${env.APP_ORIGIN}/auth/callback`,
      code,
      verifier: saved.verifier,
    });
    identity = await verifyIdToken(idToken, env.GOOGLE_CLIENT_ID);
  } catch (e) {
    console.error(e);
    return redirectTo("/?auth_error=exchange_failed");
  }

  // 未検証 email を認めると、他人の email を名乗るアカウントで昇格済みの行を奪える。
  if (!identity.emailVerified) return redirectTo("/?auth_error=email_unverified");

  const now = new Date();
  const user = await resolveUser(env.DB, {
    googleSub: identity.sub,
    email: identity.email,
    now: now.toISOString(),
    newId: crypto.randomUUID(),
    trialExpiresAt: new Date(
      now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  const token = randomToken();
  await createSession(env.DB, {
    tokenHash: await sha256Hex(token),
    userId: user.id,
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
    now: now.toISOString(),
  });
  // 掃除をここに置くのは、/api/* の経路に D1 書き込みを持ち込まないためである。
  await deleteExpiredSessions(env.DB, user.id, now.toISOString());

  const headers = new Headers({ Location: saved.redirect });
  headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS));
  headers.append("Set-Cookie", serializeCookie(OAUTH_COOKIE, "", 0));
  return new Response(null, { status: 302, headers });
}

async function currentUser(request: Request, env: Env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return await findSessionUser(env.DB, await sha256Hex(token), new Date().toISOString());
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await currentUser(request, env);
  const now = new Date().toISOString();
  // trial は「トライアル期間中」を意味する。期限切れは anonymous と区別しない。
  const role = user ? effectiveRole(user.role, user.trialExpiresAt, now) : "anonymous";
  const body = user
    ? {
        authenticated: true,
        anonymous: role === "anonymous",
        trial: user.role === "trial" && role === "user",
        email: user.email,
      }
    : { authenticated: false, anonymous: true, trial: false, email: null };
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await deleteSession(env.DB, await sha256Hex(token));
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": serializeCookie(SESSION_COOKIE, "", 0) },
  });
}

async function handleApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  apiPath: string
): Promise<Response> {
  if (!isAllowedApiPath(apiPath)) return new Response("not found", { status: 404 });

  const user = await currentUser(request, env);
  const token = user
    ? await signApiToken(
        env.AUTH_SIGNING_KEYS,
        user.id,
        effectiveRole(user.role, user.trialExpiresAt, new Date().toISOString())
      )
    : null;

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  if (!user) {
    const hit = await cache.match(cacheKey);
    if (hit) return new Response(hit.body, hit);
  }

  const response = await proxyToApi({ api: env.API, request, apiPath, token });

  if (response.status === 200 && response.headers.get("Cache-Control")?.includes("public")) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

export const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      // ログイン経路だけレート制限する。/api/* は api 側の RATE_LIMITER が受け持つ。
      if (pathname.startsWith("/auth/") && env.AUTH_RATE_LIMITER) {
        const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
        const { success } = await env.AUTH_RATE_LIMITER.limit({ key });
        if (!success) {
          return new Response("rate limit exceeded", {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }
      }

      if (pathname === "/auth/login" && request.method === "GET") {
        return await handleLogin(request, env);
      }
      if (pathname === "/auth/callback" && request.method === "GET") {
        return await handleCallback(request, env);
      }
      if (pathname === "/auth/me" && request.method === "GET") {
        return await handleMe(request, env);
      }
      if (pathname === "/auth/logout" && request.method === "POST") {
        return await handleLogout(request, env);
      }
      if (pathname.startsWith("/api/")) {
        return await handleApi(request, env, ctx, pathname.slice("/api".length));
      }
      if (pathname.startsWith("/auth/")) return new Response("not found", { status: 404 });
      return await env.ASSETS.fetch(request);
    } catch (e) {
      console.error(e);
      return new Response("internal error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

export default worker;
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test:worker -w @shisetsu-viewer/viewer
```

Expected: 全 PASS

- [ ] **Step 5: 型検査を通す**

```bash
npm run typecheck -w @shisetsu-viewer/viewer
```

Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add packages/viewer/worker packages/viewer/vitest.worker.config.ts
git commit -m "feat(viewer): BFF のログイン・セッション・API 転送を実装する"
```

---

### Task 11: フロント全体を BFF 経由の認証へ差し替える

フロントの差し替えは Context とクライアントとコンポーネントが一体で、途中で切ると型検査が通らない。
Step 1 から Step 14 までを 1 タスクとして扱い、最後に全テストが緑になった状態でコミットする。

**Files:**
- Create: `packages/viewer/contexts/Auth.tsx`
- Create: `packages/viewer/contexts/Auth.test.tsx`
- Delete: `packages/viewer/contexts/Auth0.tsx`、`packages/viewer/contexts/Auth0.test.tsx`
- Delete: `packages/viewer/pages/Waiting.tsx`、`packages/viewer/pages/Waiting.test.tsx`、`packages/viewer/constants/env.ts`
- Modify: `packages/viewer/api/client.ts`、`packages/viewer/api/endpoints.ts`
- Modify: `packages/viewer/hooks/useApiQuery.ts`、`packages/viewer/hooks/usePaginatedQuery.ts`
- Modify: `packages/viewer/test/utils/test-utils.tsx`、`packages/viewer/test/browser-setup.ts`
- Modify: `packages/viewer/index.tsx`、`packages/viewer/App.tsx`、`packages/viewer/constants/routes.ts`
- Modify: `packages/viewer/components/Header/Header.tsx`、`components/HeaderMenuButton/HeaderMenuButton.tsx`、`components/SettingsMenu/SettingsMenu.tsx`、`components/utils/AuthGuard.tsx`
- Modify: `packages/viewer/pages/Detail.tsx`
- Modify: `packages/viewer/package.json`、`packages/viewer/env.d.ts`、`packages/viewer/.env.sample`
- Modify: 各コンポーネントの `*.test.tsx`

**Interfaces:**
- Consumes: BFF の `/auth/me`、`/auth/login`、`/auth/logout`（Task 10）
- Produces:
  - `AuthContext`、`useAuth(): { isLoading: boolean; authenticated: boolean; userInfo: { anonymous: boolean; trial: boolean }; login: () => void; logout: () => void }`
  - `AuthProvider`（props は children のみ）
  - `apiGet<T>(url: string, params: QueryParams): Promise<T>`（token 引数を削除）
  - `useApiQuery<T>(fetcher: () => Promise<T>, key: string)`
  - `usePaginatedQuery<TItem>(fetchPage: (cursor: string | null) => Promise<Page<TItem>>, key: string)`

- [ ] **Step 1: 失敗するテストを書く**

`packages/viewer/contexts/Auth.test.tsx`:

```tsx
import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { AuthProvider, useAuth } from "./Auth";

const Probe = () => {
  const { isLoading, authenticated, userInfo } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="auth">{String(authenticated)}</span>
      <span data-testid="anon">{String(userInfo.anonymous)}</span>
      <span data-testid="trial">{String(userInfo.trial)}</span>
    </div>
  );
};

describe("AuthProvider", () => {
  it("/auth/me の結果を Context に反映する", async () => {
    const worker = setupWorker(
      http.get("/auth/me", () =>
        HttpResponse.json({
          authenticated: true,
          anonymous: false,
          trial: true,
          email: "a@example.com",
        })
      )
    );
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await expect.element(page.getByTestId("auth")).toHaveTextContent("true");
    await expect.element(page.getByTestId("anon")).toHaveTextContent("false");
    await expect.element(page.getByTestId("trial")).toHaveTextContent("true");
    await expect.element(page.getByTestId("loading")).toHaveTextContent("false");
    worker.stop();
  });

  it("/auth/me が失敗しても未認証として確定する", async () => {
    const worker = setupWorker(http.get("/auth/me", () => HttpResponse.error()));
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await expect.element(page.getByTestId("auth")).toHaveTextContent("false");
    await expect.element(page.getByTestId("loading")).toHaveTextContent("false");
    worker.stop();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:ci -w @shisetsu-viewer/viewer -- contexts/Auth
```

Expected: FAIL（`./Auth` が無い）

- [ ] **Step 3: Auth コンテキストを実装する**

`packages/viewer/contexts/Auth.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type AuthContextValue = {
  isLoading: boolean;
  authenticated: boolean;
  // anonymous は実効ロールが anonymous であること、trial はトライアル期間中であることを表す。
  // 期限切れのトライアルは anonymous: true, trial: false になる。
  userInfo: { anonymous: boolean; trial: boolean };
  login: () => void;
  logout: () => void;
};

const initialContext: AuthContextValue = {
  isLoading: true,
  authenticated: false,
  userInfo: { anonymous: true, trial: false },
  login: () => null,
  logout: () => null,
};

export const AuthContext = createContext<AuthContextValue>(initialContext);
export const useAuth = () => useContext(AuthContext);

type MeResponse = {
  authenticated: boolean;
  anonymous: boolean;
  trial: boolean;
  email: string | null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [trial, setTrial] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/auth/me", { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        const me = (await response.json()) as MeResponse;
        if (cancelled) return;
        setAuthenticated(me.authenticated);
        setAnonymous(me.anonymous);
        setTrial(me.trial);
      } catch {
        if (cancelled) return;
        setAuthenticated(false);
        setAnonymous(true);
        setTrial(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
  }, []);

  const logout = useCallback(() => {
    fetch("/auth/logout", { method: "POST" }).finally(() => window.location.assign("/"));
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, authenticated, userInfo: { anonymous, trial }, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 4: API クライアントから token を落とす**

`packages/viewer/api/client.ts` の `apiGet` を書き換える。

```ts
export async function apiGet<T>(url: string, params: QueryParams): Promise<T> {
  const sp = buildSearchParams(params);
  const qs = sp.size > 0 ? `?${sp.toString()}` : "";
  const res = await fetch(`${url}${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }
  // 2xx でも JSON でない応答（BFF が SPA の index.html を返した場合など）は、
  // res.json() の "Unexpected token '<'" ではなく原因が分かるメッセージで弾く。
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `API が JSON を返しませんでした (content-type: ${contentType || "なし"}, status: ${res.status}). ` +
        `url=${url} body=${body.slice(0, 120)}`
    );
  }
  return (await res.json()) as T;
}
```

`packages/viewer/api/endpoints.ts` は `API_ENDPOINT` の import を消し、全 URL を `/api/v1/...` に変える。
`fetchInstitutionReservations` と `searchReservations` から `token` 引数を削除する。

```ts
export function fetchInstitutionReservations(
  id: string,
  params: { startDate?: string; endDate?: string; limit?: number },
  cursor: string | null
): Promise<Page<ReservationDto>> {
  return apiGet(`/api/v1/institutions/${id}/reservations`, { ...params, cursor });
}
```

- [ ] **Step 5: フックから token を落とす**

`useApiQuery.ts` を次のように変える。

```ts
export function useApiQuery<T>(fetcher: () => Promise<T>, key: string): UseApiQueryResult<T> {
  const { isLoading: authLoading } = useAuth();
  // 中略（state と fetcherRef は現状のまま）

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        setData(result);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [key, authLoading, refetchCount]);
```

`usePaginatedQuery.ts` も同様に、`fetchPage` を `(cursor: string | null) => Promise<Page<TItem>>` へ変え、
`fetchPageRef.current(token || "", null)` を `fetchPageRef.current(null)`、
`fetchPageRef.current(token || "", endCursorRef.current)` を `fetchPageRef.current(endCursorRef.current)` にする。
`useEffect` と `fetchMore` の依存配列から `token` を外す。

呼び出し側（`pages/Detail.tsx:188`、予約検索ページ）の fetcher も引数を 1 つ減らす。

```bash
grep -rn "usePaginatedQuery\|useApiQuery" packages/viewer/pages
```

- [ ] **Step 6: テストのモックを差し替える**

`test/browser-setup.ts` の `vi.mock("@auth0/auth0-spa-js", ...)` ブロックを削除する。

`test/utils/test-utils.tsx` を書き換える。

```tsx
import { AuthContext } from "../../contexts/Auth";

type AuthMockConfig = {
  isLoading?: boolean;
  authenticated?: boolean;
  userInfo?: { anonymous: boolean; trial: boolean };
  login?: () => void;
  logout?: () => void;
};

const MockAuthProvider = ({
  children,
  config = {},
}: {
  children: ReactNode;
  config?: AuthMockConfig;
}) => {
  const value = {
    isLoading: config.isLoading ?? false,
    authenticated: config.authenticated ?? true,
    userInfo: config.userInfo ?? { anonymous: false, trial: false },
    login: config.login ?? vi.fn(),
    logout: config.logout ?? vi.fn(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

`CustomRenderOptions` の `auth0Config` を `authConfig` に改名し、`renderWithProviders` の分割代入も合わせる。
既存テストで `auth0Config` を渡している箇所を grep して全て置き換える。

```bash
grep -rn "auth0Config" packages/viewer
```

- [ ] **Step 7: index.tsx を差し替える**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/noto-sans-jp";

import "./theme.css";
import App from "./App";
import { AuthProvider } from "./contexts/Auth";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}
```

- [ ] **Step 8: 旧ファイルを消す**

```bash
git rm packages/viewer/contexts/Auth0.tsx packages/viewer/contexts/Auth0.test.tsx
```

この時点ではコンポーネントがまだ `useAuth0` を参照しているため、型検査もテストも通らない。
Step 9 まで進めてから確認する。

- [ ] **Step 9: useAuth0 の参照を全て置き換える**

```bash
grep -rn "useAuth0\|contexts/Auth0" packages/viewer
```

`Header.tsx:13-15` と `HeaderMenuButton.tsx:12-14` は import 元を変えるだけで、分割代入の形は変えない。

```tsx
const {
  userInfo: { anonymous, trial },
} = useAuth();
```

「（トライアル）」のラベル（`Header.tsx:42` と `HeaderMenuButton.tsx:73`）はそのまま残す。
表示条件は変わらないが、`trial` の意味が「Auth0 の固定フラグ」から「トライアル期間中」に変わっている。

`Detail.tsx` は 3 箇所を直す。

- `:331` の分割代入から `trial` を外す
- `:363` を `<Tab disabled={anonymous} label="予約状況" value="reservation" />` にする
- `:369` を `{!anonymous && (` にする

`anonymous || trial` を `anonymous` に縮めるのは、新モデルでは期限内の `trial` が `user` として振る舞い、予約状況タブを塞ぐ理由が無いためである。
期限切れなら BFF が `anonymous: true` を返すので、同じ条件で塞がれる。

`SettingsMenu.tsx` は `token` を `authenticated` に置き換える。

```tsx
const { isLoading, authenticated, login, logout } = useAuth();

const handleAuthAction = useCallback(() => {
  close();
  if (authenticated) {
    logout();
  } else {
    login();
  }
}, [authenticated, login, logout, close]);
```

表示側の `token ?` も `authenticated ?` に変える（`SettingsMenu.tsx:112` と `:117`）。

`AuthGuard.tsx` は `useAuth0` を `useAuth` に変えるだけで、ロジックは変えない。

- [ ] **Step 10: waiting ルートを削除する**

`constants/routes.ts` から `waiting` を消す。
`App.tsx` の `ROUTES.waiting` に対する `<Route>` と `React.lazy` の定義を消す。

```bash
git rm packages/viewer/pages/Waiting.tsx packages/viewer/pages/Waiting.test.tsx
grep -rn "waiting" packages/viewer
```

grep の結果が 0 件になるまで消す。

- [ ] **Step 11: 環境変数と Auth0 依存を削除する**

```bash
git rm packages/viewer/constants/env.ts
npm uninstall @auth0/auth0-spa-js -w @shisetsu-viewer/viewer
```

`env.d.ts` から `VITE_AUTH0_*` と `VITE_API_ENDPOINT` の宣言を消す。
`.env.sample` も同様に空にするか、ファイルごと削除する。

```bash
grep -rn "VITE_AUTH0\|VITE_API_ENDPOINT\|API_ENDPOINT" packages/viewer
```

grep の結果が 0 件になることを確認する。

- [ ] **Step 12: テストを直す**

`Header.test.tsx`、`HeaderMenuButton.test.tsx`、`SettingsMenu.test.tsx`、`Detail.test.tsx`、`AuthGuard.test.tsx`、`test/integration/authFlow.test.tsx`、`test/integration/navigation.test.tsx` を直す。

- `auth0Config` を `authConfig` に改名する
- `token: "..."` を渡していた箇所は `authenticated: true` に置き換える
- `userInfo` は `{ anonymous, trial }` の形のまま。Header と HeaderMenuButton の「（トライアル）」を期待するアサーションは**残す**
- `Detail.test.tsx` で `{ anonymous: false, trial: true }` を渡して予約状況タブが無効になることを期待しているケースがあれば、**有効になる**期待に反転させる。新モデルでは期限内の trial は user として振る舞う

```bash
grep -rn "trial\|mock-token\|auth0Config" packages/viewer/components packages/viewer/pages packages/viewer/test
```

- [ ] **Step 13: 全テストと lint を通す**

```bash
npm run test:ci -w @shisetsu-viewer/viewer
npm run typecheck:all
npm run lint:all
npm run format:check:all
npm run knip
```

Expected: 全て成功。`knip` が未使用として報告するファイルが残っていれば消す

- [ ] **Step 14: コミット**

```bash
git add -A packages/viewer
git commit -m "feat(viewer): フロントを BFF 経由の認証へ差し替え Auth0 依存を撤去する"
```

---

### Task 12: bindings と Secrets を設定して本番へ出す（人が実行する runbook）

このタスクは Google Cloud Console の操作、本番 Secrets の投入、本番 D1 へのマイグレーション、実デプロイを含む。
サブエージェントには実行できないため、実装フェーズの対象外とし、手順書として人が実行する。

**Files:**
- Modify: `packages/viewer/wrangler.jsonc`
- Modify: `packages/api/wrangler.jsonc`

**Interfaces:**
- Consumes: Task 1 から 11 の全て
- Produces: 本番で動作する自前認証

- [ ] **Step 1: 署名鍵を生成する**

スクラッチパッドにスクリプトを書いて実行する。

```js
// scratchpad/genkey.mjs
import { exportJWK, generateKeyPair } from "jose";

const pair = await generateKeyPair("ES256", { extractable: true });
const priv = await exportJWK(pair.privateKey);
const pub = await exportJWK(pair.publicKey);
const kid = "auth-2026-08";
priv.kid = kid;
priv.alg = "ES256";
pub.kid = kid;
pub.alg = "ES256";

console.log("AUTH_SIGNING_KEYS:", JSON.stringify([priv]));
console.log("SELF_JWKS_JSON:", JSON.stringify({ keys: [pub] }));
```

```bash
node scratchpad/genkey.mjs
```

- [ ] **Step 2: api に公開鍵を入れてデプロイする**

`packages/api/wrangler.jsonc` の `vars.SELF_JWKS_JSON` に上で出た公開 JWKS を貼る。

```bash
npm run deploy -w @shisetsu-viewer/api
curl -s https://d1-api.shisetsudb.com/v1/health
```

Expected: `{"ok":true}`

この時点では誰も自前 JWT を送らないため、既存の動作は変わらない。

- [ ] **Step 3: Google の OAuth クライアントを作り Secrets を投入する**

bindings（DB、API、AUTH_RATE_LIMITER、APP_ORIGIN）は Task 5 で設定済みである。
ここで入れるのは Secrets だけである。

Google Cloud Console でウェブアプリケーションの OAuth クライアントを作り、承認済みリダイレクト URI に 2 件を登録する。

- `https://app.shisetsudb.com/auth/callback`
- `http://localhost:3000/auth/callback`

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --config packages/viewer/wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_SECRET --config packages/viewer/wrangler.jsonc
npx wrangler secret put AUTH_SIGNING_KEYS --config packages/viewer/wrangler.jsonc
```

- [ ] **Step 4: 本番 D1 にマイグレーションを適用する**

```bash
npm run migrate:remote -w @shisetsu-viewer/api
```

- [ ] **Step 5: 既存ユーザーを投入する**

Auth0 のダッシュボードから `role=user` のユーザーの email を控え、1 件ずつ入れる。

```bash
npx wrangler d1 execute shisetsu-db --remote --command \
  "INSERT INTO users (id, google_sub, email, role, trial_expires_at, created_at) VALUES ('<uuid>', NULL, '<email>', 'user', NULL, '<ISO8601>')"
```

既存ユーザーは `role='user'` かつ `trial_expires_at` は NULL とする。
トライアルを経ずに恒久の権限を持たせるためである。

- [ ] **Step 6: viewer をデプロイする**

```bash
npm run build -w @shisetsu-viewer/viewer
npm run deploy -w @shisetsu-viewer/viewer
```

- [ ] **Step 7: 本番で動作を確認する**

ブラウザで `https://app.shisetsudb.com` を開き、次を順に確認する。

1. 未ログインで施設検索が表示される
2. 設定メニューからログインでき、Google の同意画面を経てトップへ戻る
3. 予約検索が表示され、データが出る
4. ログアウトで予約検索が非表示に戻る

トライアルは、Step 5 で投入していない別の Google アカウントでログインして確認する。
メニューに「予約検索（トライアル）」と出て、予約データが読めれば正しい。

期限切れの挙動は、そのユーザーの期限を過去にして確認する。

```bash
npx wrangler d1 execute shisetsu-db --remote --command \
  "UPDATE users SET trial_expires_at = '2026-01-01T00:00:00.000Z' WHERE email = '<trial 用の email>'"
```

再読み込みすると予約検索が押せなくなる。
確認後は行を削除するか、期限を戻す。

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://app.shisetsudb.com/api/v1/institutions?limit=1
curl -s -o /dev/null -w "%{http_code}\n" https://app.shisetsudb.com/api/v1/reservations/search
curl -s -o /dev/null -w "%{http_code}\n" https://app.shisetsudb.com/api/v1/admin/reservations
```

Expected: 200、401、404

- [ ] **Step 8: 未検証事項を実測する**

Cloudflare のダッシュボードで、viewer Worker と api Worker のリクエスト数を GraphQL Analytics の `datetimeHour` 単位で確認する。
Service Binding 経由の呼び出しが api 側のリクエスト数に計上されているかを見る。
結果を設計文書の「未検証事項」に追記する。

- [ ] **Step 9: コミットして PR を出す**

```bash
git add packages/api/wrangler.jsonc
git commit -m "feat(api): 自前 issuer の公開 JWKS を設定する"
gh pr create --base master \
  --title "feat: 自前 IdP と BFF 化で viewer から Auth0 を外す" \
  --body "$(cat <<'EOF'
## 概要

viewer Worker を BFF にして、Google を唯一の upstream とする自前認証へ移行する。
設計は docs/superpowers/specs/2026-08-01-self-hosted-auth-bff-design.md を参照。

## 変更点

- viewer Worker に /auth/* と /api/* を追加し、セッションを HttpOnly Cookie に閉じた
- ブラウザにトークンを渡さなくなり、VITE_AUTH0_* と VITE_API_ENDPOINT の 4 変数が不要になった
- api は issuer マップで Auth0 と自前 issuer の両方を受け付ける（mcp-server のため Auth0 を残す）
- users と sessions を D1 に追加。ロール付与が Auth0 Actions から D1 のカラムに移った
- trial ロールと /waiting ルートを廃止した

## 確認したこと

- 本番でログイン、予約検索、ログアウトが動作すること
- /api/v1/admin/reservations が 404 になること（BFF のホワイトリスト）
- 未ログインで /api/v1/reservations/search が 401 になること

## 残作業

mcp-server の認可サーバ自前化（サブプロジェクト 3）が終わるまで Auth0 テナントは残す。
EOF
)"
```

`AUTH_SIGNING_KEYS` の秘密鍵はコミットしない。
`wrangler.jsonc` に入るのは公開 JWKS だけである。

- [ ] **Step 10: ロールバック手順を確認しておく**

viewer で問題が出た場合は、直前のバージョンへ戻す。

```bash
npx wrangler rollback --config packages/viewer/wrangler.jsonc
```

api の issuer マップは Auth0 を受け付けたままなので、旧 viewer はそのまま動く。
D1 の `users` と `sessions` は旧 viewer から参照されないため、消さずに残してよい。

---

## 移行後の残作業

本計画の完了時点で Auth0 依存は mcp-server の 1 箇所だけになる。
テナントの削除はサブプロジェクト 3 と 4 の完了を待つ。

1 週間の安定運用を確認したら、Auth0 の viewer 用アプリケーションを無効化する。
無効化しても api の issuer マップは Auth0 を受け付けたままなので、mcp-server は動き続ける。

サブプロジェクト 3 では、mcp-server が BFF を経由せず api を直接叩くため、`effectiveRole` を必ず通す。
通し忘れると、期限切れのトライアルユーザーが MCP からは予約データを読めてしまう。
