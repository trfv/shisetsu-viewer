import {
  auth0Config,
  buildAuthorizeUrl,
  buildLogoutUrl,
  exchangeCode,
  readRole,
  RefreshError,
  refreshSession,
  revokeRefreshToken,
  type FetchLike,
} from "./auth0.ts";
import { readCookie, serializeCookie } from "./cookies.ts";
import { isAllowedApiPath, proxyToApi } from "./proxy.ts";
import { keyLoader, seal, toBase64Url, unseal, type KeyLoader, type Session } from "./session.ts";

export type Env = Cloudflare.Env;

const SESSION_COOKIE = "__Host-session";
const OAUTH_COOKIE = "__Host-oauth";
// refresh token の Maximum Lifetime（Auth0 側の設定）に揃える。
const SESSION_TTL_SECONDS = 365 * 24 * 60 * 60;
const OAUTH_TTL_SECONDS = 600;
// 失効直前のトークンは api に届く頃に切れていることがある。
const REFRESH_LEEWAY_SECONDS = 60;

// /auth/me は含めない。全訪問者がページ読み込みごとに叩くため、共有 IP（CGNAT）で枠を食い潰し、
// 429 を受けた Auth コンテキストがログイン済みユーザーを anonymous に倒す。/api/* は api 側が数える。
const RATE_LIMITED_PATHS = new Set(["/auth/login", "/auth/callback"]);

interface OauthState {
  state: string;
  verifier: string;
  redirect: string;
}

// この pool では vi.mock が効かないため、テストは偽の fetch を注入する。
export interface Deps {
  fetch: FetchLike;
}

const defaultDeps: Deps = { fetch: (input, init) => fetch(input, init) };

// 実在ドメインを基準にすると、攻撃者がその絶対 URL を渡したときに origin が一致して素通りする。
const REDIRECT_BASE = "https://placeholder.invalid";

// 文字列の前方一致では足りない。URL パーサは `\` を `/` と同一視しタブや改行を除去するため、
// `/\evil.example/` や `/<TAB>/evil.example/` が `//evil.example/` として解決される。
function safeRedirect(raw: string | null): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, REDIRECT_BASE);
    if (url.origin !== REDIRECT_BASE) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

// 本番と localhost で同じ Worker が動くため固定値にしない。Auth0 が Allowed Callback URLs で検証する。
function callbackUri(request: Request): string {
  return `${new URL(request.url).origin}/auth/callback`;
}

function randomToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

function redirectTo(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function json(body: unknown, init: { status?: number; cookies?: string[] } = {}): Response {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  for (const cookie of init.cookies ?? []) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

const clearSession = () => serializeCookie(SESSION_COOKIE, "", 0);

async function sessionCookie(keys: KeyLoader, session: Session): Promise<string> {
  return serializeCookie(
    SESSION_COOKIE,
    await seal(await keys(), SESSION_COOKIE, session),
    SESSION_TTL_SECONDS
  );
}

// unavailable は Auth0 の一時障害。ログアウトさせないよう Cookie は消さない。
type SessionState =
  | { session: Session | null; cookies: string[]; unavailable?: false }
  | { session: null; cookies: string[]; unavailable: true };

async function loadSession(
  request: Request,
  env: Env,
  keys: KeyLoader,
  deps: Deps
): Promise<SessionState> {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return { session: null, cookies: [] };

  const session = await unseal<Session>(await keys(), SESSION_COOKIE, raw);
  if (!session) return { session: null, cookies: [clearSession()] };

  if (session.expiresAt - Date.now() / 1000 > REFRESH_LEEWAY_SECONDS) {
    return { session, cookies: [] };
  }

  // 並行する /api/* が同じ refresh token を使う。Auth0 の rotation を無効にしているので全て成功する。
  try {
    const refreshed = await refreshSession(auth0Config(env), session.refreshToken, deps.fetch);
    return { session: refreshed, cookies: [await sessionCookie(keys, refreshed)] };
  } catch (e) {
    if (e instanceof RefreshError && e.kind === "invalid_grant") {
      return { session: null, cookies: [clearSession()] };
    }
    console.error(e);
    return { session: null, cookies: [], unavailable: true };
  }
}

async function handleLogin(request: Request, env: Env, keys: KeyLoader): Promise<Response> {
  const url = new URL(request.url);
  const payload: OauthState = {
    state: randomToken(),
    verifier: randomToken(),
    redirect: safeRedirect(url.searchParams.get("redirect")),
  };

  const authorizeUrl = buildAuthorizeUrl(auth0Config(env), {
    redirectUri: callbackUri(request),
    state: payload.state,
    challenge: await codeChallenge(payload.verifier),
  });

  const cookie = serializeCookie(
    OAUTH_COOKIE,
    await seal(await keys(), OAUTH_COOKIE, payload),
    OAUTH_TTL_SECONDS
  );
  return redirectTo(authorizeUrl, [cookie]);
}

async function handleCallback(
  request: Request,
  env: Env,
  keys: KeyLoader,
  deps: Deps
): Promise<Response> {
  const url = new URL(request.url);
  const clearOauth = serializeCookie(OAUTH_COOKIE, "", 0);
  const fail = (code: string) => redirectTo(`/?auth_error=${code}`, [clearOauth]);

  const raw = readCookie(request, OAUTH_COOKIE);
  if (!raw) return fail("state_missing");
  const saved = await unseal<OauthState>(await keys(), OAUTH_COOKIE, raw);
  if (!saved) return fail("state_broken");

  if (url.searchParams.get("error")) return fail("auth0");
  if (url.searchParams.get("state") !== saved.state) return fail("state_mismatch");

  const code = url.searchParams.get("code");
  if (!code) return fail("code_missing");

  let session: Session;
  try {
    session = await exchangeCode(
      auth0Config(env),
      { code, verifier: saved.verifier, redirectUri: callbackUri(request) },
      deps.fetch
    );
  } catch (e) {
    console.error(e);
    return fail("exchange_failed");
  }

  // Cookie は暗号化済みだが、Location に入れる直前にも通す。
  return redirectTo(safeRedirect(saved.redirect), [await sessionCookie(keys, session), clearOauth]);
}

async function handleMe(
  request: Request,
  env: Env,
  keys: KeyLoader,
  deps: Deps
): Promise<Response> {
  const { session, cookies, unavailable } = await loadSession(request, env, keys, deps);
  if (unavailable) return json({ error: "auth temporarily unavailable" }, { status: 503 });
  const body = session
    ? { authenticated: true, ...readRole(session.accessToken) }
    : { authenticated: false, anonymous: true, trial: false };
  return json(body, { cookies });
}

// /v2/logout で Auth0 のセッションも消す。消さないと次のログインが同じ Google アカウントで即完了する。
// POST なのは他サイトのリンクで強制ログアウトさせないため（Lax の Cookie はトップレベル GET に載る）。
// fetch は別オリジンへの 302 を辿れないので、遷移先は JSON で返す。
async function handleLogout(
  request: Request,
  env: Env,
  keys: KeyLoader,
  deps: Deps
): Promise<Response> {
  const raw = readCookie(request, SESSION_COOKIE);
  const session = raw ? await unseal<Session>(await keys(), SESSION_COOKIE, raw) : null;
  if (session) {
    try {
      await revokeRefreshToken(auth0Config(env), session.refreshToken, deps.fetch);
    } catch (e) {
      // 失敗しても Cookie は消すので、このブラウザからは使えなくなる。
      console.error(e);
    }
  }
  const returnTo = `${new URL(request.url).origin}/`;
  return json(
    { logoutUrl: buildLogoutUrl(auth0Config(env), returnTo) },
    {
      cookies: [clearSession()],
    }
  );
}

async function handleApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  keys: KeyLoader,
  deps: Deps,
  apiPath: string
): Promise<Response> {
  if (!isAllowedApiPath(apiPath)) return new Response("not found", { status: 404 });
  // 素通しにすると POST が GET に変換されて 200 を返し、キャッシュにも載る。
  if (request.method !== "GET") {
    return new Response("method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  // 入るのは api が public と宣言したロール非依存の応答だけなので、ログイン中も読む。
  // 読まないとログインユーザーだけが毎回 D1 を引く（無料枠の制約は rows read）。
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(hit.body, hit);

  const { session, cookies, unavailable } = await loadSession(request, env, keys, deps);
  if (unavailable) return new Response("auth temporarily unavailable", { status: 503 });

  const upstream = await proxyToApi({
    api: env.API,
    request,
    apiPath,
    token: session?.accessToken ?? null,
  });

  if (upstream.status === 200 && upstream.headers.get("Cache-Control")?.includes("public")) {
    ctx.waitUntil(cache.put(cacheKey, upstream.clone()));
  }
  if (cookies.length === 0) return upstream;

  const response = new Response(upstream.body, upstream);
  for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
  return response;
}

export function createWorker(deps: Deps = defaultDeps) {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const { pathname } = new URL(request.url);
      try {
        if (RATE_LIMITED_PATHS.has(pathname) && env.AUTH_RATE_LIMITER) {
          const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
          const { success } = await env.AUTH_RATE_LIMITER.limit({ key });
          if (!success) {
            return new Response("rate limit exceeded", {
              status: 429,
              headers: { "Retry-After": "60" },
            });
          }
        }

        if (pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
          const keys = keyLoader(env.SESSION_KEYS);
          if (pathname === "/auth/login" && request.method === "GET") {
            return await handleLogin(request, env, keys);
          }
          if (pathname === "/auth/callback" && request.method === "GET") {
            return await handleCallback(request, env, keys, deps);
          }
          if (pathname === "/auth/me" && request.method === "GET") {
            return await handleMe(request, env, keys, deps);
          }
          if (pathname === "/auth/logout" && request.method === "POST") {
            return await handleLogout(request, env, keys, deps);
          }
          if (pathname.startsWith("/api/")) {
            return await handleApi(request, env, ctx, keys, deps, pathname.slice("/api".length));
          }
          return new Response("not found", { status: 404 });
        }
        // run_worker_first の対象外なので通常は来ないが、設定変更時の受け皿として残す。
        return await env.ASSETS.fetch(request);
      } catch (e) {
        console.error(e);
        return new Response("internal error", { status: 500 });
      }
    },
  } satisfies ExportedHandler<Env>;
}

export const worker = createWorker();

export default worker;
