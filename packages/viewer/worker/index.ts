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

// binding の定義は wrangler.jsonc から生成した Cloudflare.Env が持つ。
// Secret は生成対象外なので worker/secrets.d.ts で補っている。
export type Env = Cloudflare.Env;

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
  // 未ログインのときだけキャッシュを読む。ログイン中の応答は private を含みうる。
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
