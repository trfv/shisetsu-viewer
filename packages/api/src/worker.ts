import { createLocalJWKSet, type JWTVerifyGetKey } from "jose";
import { resolveRole } from "./auth/auth0.ts";
import {
  getInstitutionDetail,
  listInstitutionReservations,
  listInstitutions,
  listScrapeRuns,
  loadHolidays,
  searchReservations,
} from "./db/queries.ts";

export interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  GITHUB_REPOSITORY: string;
  OIDC_AUDIENCE: string;
  ADMIN_API_KEY?: string;
  // テスト専用: 設定されていればローカル JWKS を使う（本番 wrangler.jsonc には無い）
  TEST_JWKS_JSON?: string;
}

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    try {
      if (request.method === "GET") {
        if (pathname === "/v1/health") return json({ ok: true });
        if (pathname === "/v1/institutions") return await handleListInstitutions(url, env);
        if (pathname === "/v1/scrape-runs") return await handleScrapeRuns(env);
        if (pathname === "/v1/reservations/search") return await handleSearch(request, url, env);
        const resv = pathname.match(RE_INSTITUTION_RESERVATIONS);
        if (resv) return await handleInstitutionReservations(request, resv[1] as string, url, env);
        const detail = pathname.match(RE_INSTITUTION);
        if (detail) return await handleInstitutionDetail(detail[1] as string, env);
      }
      return error(404, "not found");
    } catch (e) {
      console.error(e);
      return error(500, "internal error");
    }
  },
} satisfies ExportedHandler<Env>;
