import type { Institution, UpsertReservationsRequest } from "@shisetsu-viewer/shared";
import { createLocalJWKSet, type JWTVerifyGetKey } from "jose";

import { authorizeAdmin } from "./auth/adminAuth.ts";
import { resolveRole } from "./auth/auth0.ts";
import {
  getInstitutionDetail,
  listInstitutionReservations,
  listInstitutions,
  listScrapeRuns,
  loadHolidays,
  searchReservations,
} from "./db/queries.ts";
import {
  recordScrapeRun,
  todayRowsWritten,
  upsertHolidays,
  upsertInstitutions,
  upsertReservations,
} from "./db/upsert.ts";

export interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  GITHUB_REPOSITORY: string;
  OIDC_AUDIENCE: string;
  ADMIN_API_KEY?: string;
  // 無認証の公開エンドポイント向けレート制限。テスト環境では未定義になりうるため optional
  RATE_LIMITER?: RateLimit;
  // テスト専用: 設定されていればローカル JWKS を使う（本番 wrangler.jsonc には無い）
  TEST_JWKS_JSON?: string;
  TEST_GITHUB_JWKS_JSON?: string;
}

// 1 リクエストの最大予約行数（Workers Free CPU / D1 バインド上限に余裕）
const MAX_RESERVATION_ROWS = 500;
// institutions は自治体単位で一括送信される（全自治体でも実測 591 行）。
// holidays は数年分でも数百行。いずれも ADMIN_API_KEY 漏洩時に D1 無料枠を
// 一撃で使い切られないための上限で、実運用の 3 倍以上の余裕を取っている。
const MAX_INSTITUTION_ROWS = 2_000;
const MAX_HOLIDAY_ROWS = 1_000;
// 当日書き込み予算。超過分は 202 で受け流し次回 run に委ねる（全行変化日への防御）
const DAILY_WRITE_BUDGET = 80_000;

const ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_INSTITUTION = new RegExp(`^/v1/institutions/(${ID_PATTERN})$`, "i");
const RE_INSTITUTION_RESERVATIONS = new RegExp(
  `^/v1/institutions/(${ID_PATTERN})/reservations$`,
  "i"
);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_CACHE = "public, max-age=300";

function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}

function parseListParam(url: URL, key: string): string[] | undefined {
  const value = url.searchParams.get(key);
  if (!value) return undefined;
  return value.split(",").filter((v) => v.length > 0);
}

function parseBoolParam(url: URL, key: string): boolean | undefined {
  return url.searchParams.get(key) === "true" ? true : undefined;
}

function parseLimit(url: URL): number | undefined {
  const raw = url.searchParams.get("limit");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** テスト用ローカル JWKS があればそれを、無ければ undefined（本番 JWKS フェッチにフォールバック） */
function testJwks(env: Env): JWTVerifyGetKey | undefined {
  if (!env.TEST_JWKS_JSON) return undefined;
  return createLocalJWKSet(JSON.parse(env.TEST_JWKS_JSON));
}

function testGithubJwks(env: Env): JWTVerifyGetKey | undefined {
  if (!env.TEST_GITHUB_JWKS_JSON) return undefined;
  return createLocalJWKSet(JSON.parse(env.TEST_GITHUB_JWKS_JSON));
}

/** reservations 系エンドポイントの認可。user 以外は 401（トークン無し）/ 403（不足） */
async function authorizeUser(request: Request, env: Env): Promise<Response | null> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return error(401, "authentication required");
  const role = await resolveRole(token, env, testJwks(env));
  if (role !== "user") return error(403, "insufficient role");
  return null;
}

async function handleListInstitutions(url: URL, env: Env): Promise<Response> {
  const page = await listInstitutions(env.DB, {
    municipality: parseListParam(url, "municipality"),
    isAvailableStrings: parseBoolParam(url, "isAvailableStrings"),
    isAvailableWoodwind: parseBoolParam(url, "isAvailableWoodwind"),
    isAvailableBrass: parseBoolParam(url, "isAvailableBrass"),
    isAvailablePercussion: parseBoolParam(url, "isAvailablePercussion"),
    institutionSizes: parseListParam(url, "institutionSizes"),
    limit: parseLimit(url),
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  return json(page, { headers: { "Cache-Control": PUBLIC_CACHE } });
}

async function handleInstitutionDetail(id: string, env: Env): Promise<Response> {
  const detail = await getInstitutionDetail(env.DB, id);
  if (!detail) return error(404, "institution not found");
  return json(detail, { headers: { "Cache-Control": PUBLIC_CACHE } });
}

async function handleInstitutionReservations(
  request: Request,
  id: string,
  url: URL,
  env: Env
): Promise<Response> {
  const denied = await authorizeUser(request, env);
  if (denied) return denied;
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  if (startDate && !DATE_RE.test(startDate)) return error(400, "invalid startDate");
  if (endDate && !DATE_RE.test(endDate)) return error(400, "invalid endDate");
  const holidays = await loadHolidays(env.DB);
  const page = await listInstitutionReservations(
    env.DB,
    id,
    {
      startDate,
      endDate,
      limit: parseLimit(url),
      cursor: url.searchParams.get("cursor") ?? undefined,
    },
    holidays
  );
  return json(page);
}

async function handleSearch(request: Request, url: URL, env: Env): Promise<Response> {
  const denied = await authorizeUser(request, env);
  if (denied) return denied;
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  if (!startDate || !DATE_RE.test(startDate)) return error(400, "invalid startDate");
  if (!endDate || !DATE_RE.test(endDate)) return error(400, "invalid endDate");
  const holidays = await loadHolidays(env.DB);
  const page = await searchReservations(
    env.DB,
    {
      startDate,
      endDate,
      municipality: parseListParam(url, "municipality"),
      isHoliday: parseBoolParam(url, "isHoliday"),
      isMorningVacant: parseBoolParam(url, "isMorningVacant"),
      isAfternoonVacant: parseBoolParam(url, "isAfternoonVacant"),
      isEveningVacant: parseBoolParam(url, "isEveningVacant"),
      isAvailableStrings: parseBoolParam(url, "isAvailableStrings"),
      isAvailableWoodwind: parseBoolParam(url, "isAvailableWoodwind"),
      isAvailableBrass: parseBoolParam(url, "isAvailableBrass"),
      isAvailablePercussion: parseBoolParam(url, "isAvailablePercussion"),
      institutionSizes: parseListParam(url, "institutionSizes"),
      limit: parseLimit(url),
      cursor: url.searchParams.get("cursor") ?? undefined,
    },
    holidays
  );
  return json(page);
}

async function handleScrapeRuns(env: Env): Promise<Response> {
  const items = await listScrapeRuns(env.DB);
  return json({ items }, { headers: { "Cache-Control": PUBLIC_CACHE } });
}

// ---- admin (write) ----

async function handleAdminReservations(request: Request, env: Env): Promise<Response> {
  if (!(await authorizeAdmin(request, env, testGithubJwks(env)))) return error(401, "unauthorized");
  const body = (await request.json().catch(() => null)) as UpsertReservationsRequest | null;
  if (!body || !Array.isArray(body.rows) || !body.municipality || !body.runId) {
    return error(400, "invalid body");
  }
  if (body.rows.length > MAX_RESERVATION_ROWS) return error(400, "too many rows");

  // 書き込み予算ガード: 当日の rows_written が枠を超えていたら書かずに 202 で受け流す
  if ((await todayRowsWritten(env.DB)) > DAILY_WRITE_BUDGET) {
    return json({ received: body.rows.length, rowsWritten: 0, deferred: true }, { status: 202 });
  }

  const { rowsWritten } = await upsertReservations(env.DB, body.rows);
  await recordScrapeRun(env.DB, body.municipality, body.runId, rowsWritten);
  return json({ received: body.rows.length, rowsWritten, deferred: false });
}

async function handleAdminInstitutions(request: Request, env: Env): Promise<Response> {
  if (!(await authorizeAdmin(request, env, testGithubJwks(env)))) return error(401, "unauthorized");
  const body = (await request.json().catch(() => null)) as { rows?: Institution[] } | null;
  if (!body || !Array.isArray(body.rows)) return error(400, "invalid body");
  if (body.rows.length > MAX_INSTITUTION_ROWS) return error(400, "too many rows");
  const { rowsWritten } = await upsertInstitutions(env.DB, body.rows);
  return json({ received: body.rows.length, rowsWritten, deferred: false });
}

async function handleAdminHolidays(request: Request, env: Env): Promise<Response> {
  if (!(await authorizeAdmin(request, env, testGithubJwks(env)))) return error(401, "unauthorized");
  const body = (await request.json().catch(() => null)) as {
    rows?: { date: string; name: string }[];
  } | null;
  if (!body || !Array.isArray(body.rows)) return error(400, "invalid body");
  if (body.rows.length > MAX_HOLIDAY_ROWS) return error(400, "too many rows");
  const { rowsWritten } = await upsertHolidays(env.DB, body.rows);
  return json({ received: body.rows.length, rowsWritten, deferred: false });
}

/** パリティ突合用: 予約を全列 dump（keyset、admin 認可） */
async function handleAdminExport(request: Request, url: URL, env: Env): Promise<Response> {
  if (!(await authorizeAdmin(request, env, testGithubJwks(env)))) return error(401, "unauthorized");
  const municipality = parseListParam(url, "municipality");
  const holidays = await loadHolidays(env.DB);
  const page = await searchReservations(
    env.DB,
    {
      startDate: "0000-01-01",
      endDate: "9999-12-31",
      municipality,
      limit: parseLimit(url) ?? 1000,
      cursor: url.searchParams.get("cursor") ?? undefined,
    },
    holidays
  );
  return json(page);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    try {
      // admin 系は除外する。scraper が 500 行ずつのチャンクを短時間に大量 PUT するため、
      // 一律に適用すると本番のデータ投入が壊れる（admin は OIDC / API キーで保護済み）。
      if (env.RATE_LIMITER && !pathname.startsWith("/v1/admin/")) {
        const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
        const { success } = await env.RATE_LIMITER.limit({ key });
        if (!success) {
          return json(
            { error: "rate limit exceeded" },
            { status: 429, headers: { "Retry-After": "60" } }
          );
        }
      }

      if (request.method === "GET") {
        if (pathname === "/v1/health") return json({ ok: true });
        if (pathname === "/v1/institutions") return await handleListInstitutions(url, env);
        if (pathname === "/v1/scrape-runs") return await handleScrapeRuns(env);
        if (pathname === "/v1/reservations/search") return await handleSearch(request, url, env);
        if (pathname === "/v1/admin/reservations/export")
          return await handleAdminExport(request, url, env);
        const resv = pathname.match(RE_INSTITUTION_RESERVATIONS);
        if (resv) return await handleInstitutionReservations(request, resv[1] as string, url, env);
        const detail = pathname.match(RE_INSTITUTION);
        if (detail) return await handleInstitutionDetail(detail[1] as string, env);
      }
      if (request.method === "PUT") {
        if (pathname === "/v1/admin/reservations")
          return await handleAdminReservations(request, env);
        if (pathname === "/v1/admin/institutions")
          return await handleAdminInstitutions(request, env);
        if (pathname === "/v1/admin/holidays") return await handleAdminHolidays(request, env);
      }
      return error(404, "not found");
    } catch (e) {
      console.error(e);
      return error(500, "internal error");
    }
  },
} satisfies ExportedHandler<Env>;
