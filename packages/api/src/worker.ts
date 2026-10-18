import type { Institution, UpsertReservationsRequest } from "@shisetsu-viewer/shared";
import { createLocalJWKSet, type JWTVerifyGetKey } from "jose";

import { authorizeAdmin } from "./auth/adminAuth.ts";
import { verifyAccessToken, type Principal } from "./auth/auth0.ts";
import {
  exportReservations,
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
  // テスト環境では未定義になりうる
  RATE_LIMITER?: RateLimit;
  // テスト専用（本番 wrangler.jsonc には無い）
  TEST_JWKS_JSON?: string;
  TEST_GITHUB_JWKS_JSON?: string;
  // tag は deploy:ci が付けるコミット SHA（先頭 12 桁）
  CF_VERSION_METADATA?: WorkerVersionMetadata;
}

// Workers Free の CPU / D1 バインド上限に余裕を持たせる
const MAX_RESERVATION_ROWS = 500;
// ADMIN_API_KEY 漏洩時に D1 無料枠を一撃で使い切られないための上限。実運用の 3 倍以上
const MAX_INSTITUTION_ROWS = 2_000;
const MAX_HOLIDAY_ROWS = 1_000;
// 全行変化日への防御。超過分は 202 で受け流し次回 run に委ねる
const DAILY_WRITE_BUDGET = 80_000;

const ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_INSTITUTION = new RegExp(`^/v1/institutions/(${ID_PATTERN})$`, "i");
const RE_INSTITUTION_RESERVATIONS = new RegExp(
  `^/v1/institutions/(${ID_PATTERN})/reservations$`,
  "i"
);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_CACHE = "public, max-age=300";
// 施設マスタは週〜月単位でしか変わらないので長めに持たせる（upsert 直後の最大 10 分の陳腐化は許容）
const INSTITUTIONS_CACHE = "public, max-age=600";
// Cache-Control 無しの 200 はエッジの heuristic freshness で既定 2 時間キャッシュされうる。
// Authorization 付きは自動バイパスされる仕様だが、そこに依存しない
const PRIVATE_CACHE = "private, no-store";
// detail=true は scraper が施設マスタ upsert 直後に引く。古い id 対応表を掴むと
// 予約行の解決に失敗する（unmatched facility keys）ので、公開情報でもキャッシュしない
const NO_STORE_CACHE = "no-store";

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

function testJwks(env: Env): JWTVerifyGetKey | undefined {
  if (!env.TEST_JWKS_JSON) return undefined;
  return createLocalJWKSet(JSON.parse(env.TEST_JWKS_JSON));
}

function testGithubJwks(env: Env): JWTVerifyGetKey | undefined {
  if (!env.TEST_GITHUB_JWKS_JSON) return undefined;
  return createLocalJWKSet(JSON.parse(env.TEST_GITHUB_JWKS_JSON));
}

function bearerToken(request: Request): string | undefined {
  return request.headers.get("Authorization")?.replace(/^Bearer /, "") || undefined;
}

function authorizeUser(request: Request, principal: Principal | null): Response | null {
  if (!bearerToken(request)) return error(401, "authentication required");
  if (principal?.role !== "user") return error(403, "insufficient role");
  return null;
}

async function handleListInstitutions(url: URL, env: Env): Promise<Response> {
  const detail = parseBoolParam(url, "detail");
  const page = await listInstitutions(env.DB, {
    municipality: parseListParam(url, "municipality"),
    isAvailableStrings: parseBoolParam(url, "isAvailableStrings"),
    isAvailableWoodwind: parseBoolParam(url, "isAvailableWoodwind"),
    isAvailableBrass: parseBoolParam(url, "isAvailableBrass"),
    isAvailablePercussion: parseBoolParam(url, "isAvailablePercussion"),
    institutionSizes: parseListParam(url, "institutionSizes"),
    limit: parseLimit(url),
    cursor: url.searchParams.get("cursor") ?? undefined,
    detail,
  });
  return json(page, {
    headers: { "Cache-Control": detail ? NO_STORE_CACHE : INSTITUTIONS_CACHE },
  });
}

async function handleInstitutionDetail(id: string, env: Env): Promise<Response> {
  const detail = await getInstitutionDetail(env.DB, id);
  if (!detail) return error(404, "institution not found");
  return json(detail, { headers: { "Cache-Control": INSTITUTIONS_CACHE } });
}

async function handleInstitutionReservations(
  request: Request,
  principal: Principal | null,
  id: string,
  url: URL,
  env: Env
): Promise<Response> {
  const denied = authorizeUser(request, principal);
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
  return json(page, { headers: { "Cache-Control": PRIVATE_CACHE } });
}

async function handleSearch(
  request: Request,
  principal: Principal | null,
  url: URL,
  env: Env
): Promise<Response> {
  const denied = authorizeUser(request, principal);
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
  return json(page, { headers: { "Cache-Control": PRIVATE_CACHE } });
}

async function handleScrapeRuns(env: Env): Promise<Response> {
  const items = await listScrapeRuns(env.DB);
  return json({ items }, { headers: { "Cache-Control": PUBLIC_CACHE } });
}

async function handleAdminReservations(request: Request, env: Env): Promise<Response> {
  if (!(await authorizeAdmin(request, env, testGithubJwks(env)))) return error(401, "unauthorized");
  const body = (await request.json().catch(() => null)) as UpsertReservationsRequest | null;
  if (!body || !Array.isArray(body.rows) || !body.municipality || !body.runId) {
    return error(400, "invalid body");
  }
  if (body.rows.length > MAX_RESERVATION_ROWS) return error(400, "too many rows");

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

async function handleAdminExport(request: Request, url: URL, env: Env): Promise<Response> {
  if (!(await authorizeAdmin(request, env, testGithubJwks(env)))) return error(401, "unauthorized");
  const page = await exportReservations(env.DB, {
    limit: parseLimit(url),
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  return json(page, { headers: { "Cache-Control": PRIVATE_CACHE } });
}

// Worker が生成したレスポンスは `Cache-Control: public` だけではエッジに載らないので明示的に put/match する。
// キーは元のリクエストのヘッダを持ち込まないよう、メソッドと URL だけの Request にする
async function withEdgeCache(
  url: URL,
  ctx: ExecutionContext,
  produce: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  const key = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await produce();
  if (res.status === 200 && res.headers.get("Cache-Control")?.includes("public")) {
    ctx.waitUntil(cache.put(key, res.clone()));
  }
  return res;
}

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  try {
    // admin はレート制限から外す。scraper がチャンクを短時間に大量 PUT するため、適用すると投入が壊れる
    const isAdmin = pathname.startsWith("/v1/admin/");
    const principal = isAdmin
      ? null
      : await verifyAccessToken(bearerToken(request), env, testJwks(env));

    if (env.RATE_LIMITER && !isAdmin) {
      // IP だけで数えないのは、MCP サーバーのように多数の利用者を少数の IP から中継する呼び出し元が
      // 一つの枠を共有しないため。検証に失敗したトークンは IP に落ちるので偽トークンで枠は増えない
      const key = principal?.sub
        ? `sub:${principal.sub}`
        : `ip:${request.headers.get("CF-Connecting-IP") ?? "unknown"}`;
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) {
        return json(
          { error: "rate limit exceeded" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (request.method === "GET") {
      // version は Database ワークフローが新しい api の稼働を待つのに使う
      if (pathname === "/v1/health")
        return json({ ok: true, version: env.CF_VERSION_METADATA?.tag || null });
      if (pathname === "/v1/institutions")
        return await withEdgeCache(url, ctx, () => handleListInstitutions(url, env));
      if (pathname === "/v1/scrape-runs")
        return await withEdgeCache(url, ctx, () => handleScrapeRuns(env));
      if (pathname === "/v1/reservations/search")
        return await handleSearch(request, principal, url, env);
      if (pathname === "/v1/admin/reservations/export")
        return await handleAdminExport(request, url, env);
      const resv = pathname.match(RE_INSTITUTION_RESERVATIONS);
      if (resv)
        return await handleInstitutionReservations(request, principal, resv[1] as string, url, env);
      const detail = pathname.match(RE_INSTITUTION);
      if (detail) {
        const id = detail[1] as string;
        return await withEdgeCache(url, ctx, () => handleInstitutionDetail(id, env));
      }
    }
    if (request.method === "PUT") {
      if (pathname === "/v1/admin/reservations") return await handleAdminReservations(request, env);
      if (pathname === "/v1/admin/institutions") return await handleAdminInstitutions(request, env);
      if (pathname === "/v1/admin/holidays") return await handleAdminHolidays(request, env);
    }
    return error(404, "not found");
  } catch (e) {
    console.error(e);
    return error(500, "internal error");
  }
}

export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;
