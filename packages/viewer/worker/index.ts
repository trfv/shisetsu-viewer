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

/** レート制限の対象。総当たりの的になるログイン経路だけに絞る。 */
const RATE_LIMITED_PATHS = new Set(["/auth/login", "/auth/callback"]);

interface OauthState {
  state: string;
  verifier: string;
  redirect: string;
}

/**
 * Google に触る関数の注入口。テストから差し替えて /auth/callback の成功パスを通す。
 * この pool では vi.mock によるモジュール差し替えが効かず、seam が無いと
 * テストが実際に Google へ通信してしまう。google.ts の fetchImpl / getKey と同じ方針。
 */
export interface GoogleDeps {
  exchangeCode: typeof exchangeCode;
  verifyIdToken: typeof verifyIdToken;
}

const defaultGoogle: GoogleDeps = { exchangeCode, verifyIdToken };

// 到達不能な TLD を基準オリジンに使う。実在ドメインだと、攻撃者がその絶対 URL を
// 渡したときに origin が一致して素通りする。
const REDIRECT_BASE = "https://placeholder.invalid";

/**
 * オープンリダイレクトを防ぐ。ブラウザと同じ URL パーサで解決し、自オリジンに落ちるものだけ許す。
 *
 * 文字列の前方一致で弾く実装では足りない。WHATWG の URL パーサは special scheme で
 * バックスラッシュを `/` と同一視し、タブや改行を除去してから解釈するため、
 * `/\evil.example/` や `/<TAB>/evil.example/` が `//evil.example/` として解決してしまう。
 * 判定をパーサに委ねれば、この手の表記ゆれをまとめて塞げる。
 */
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

/**
 * OAuth の redirect_uri。リクエストが来たオリジンから組み立てる。
 *
 * 固定値にすると、同じ Worker が複数のオリジンで動く状況（本番・ブランチ preview・
 * localhost）で必ずずれる。redirect_uri は「ブラウザが戻ってくる先」なので、
 * リクエストのオリジンと一致するのが本来の姿である。
 *
 * 導出しても安全性は落ちない。Google は事前登録された URI としか一致させないため、
 * 未登録のオリジンを名乗っても認可自体が通らない。Worker のルートはアカウントに
 * 紐づくホスト名でしか呼ばれないので、Host の偽装で別オリジンを名乗らせることもできない。
 */
function callbackUri(request: Request): string {
  return `${new URL(request.url).origin}/auth/callback`;
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
    redirectUri: callbackUri(request),
    state: payload.state,
    challenge: await codeChallenge(payload.verifier),
  });

  const cookie = serializeCookie(OAUTH_COOKIE, btoa(JSON.stringify(payload)), OAUTH_TTL_SECONDS);
  return redirectTo(authorizeUrl, cookie);
}

async function handleCallback(request: Request, env: Env, google: GoogleDeps): Promise<Response> {
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
    const idToken = await google.exchangeCode({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: callbackUri(request),
      code,
      verifier: saved.verifier,
    });
    identity = await google.verifyIdToken(idToken, env.GOOGLE_CLIENT_ID);
  } catch (e) {
    console.error(e);
    return redirectTo("/?auth_error=exchange_failed");
  }

  // 未検証 email を認めると、他人の email を名乗るアカウントで昇格済みの行を奪える。
  if (!identity.emailVerified) return redirectTo("/?auth_error=email_unverified");

  const now = new Date();
  let user;
  try {
    user = await resolveUser(env.DB, {
      googleSub: identity.sub,
      email: identity.email,
      now: now.toISOString(),
      newId: crypto.randomUUID(),
      trialExpiresAt: new Date(
        now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  } catch (e) {
    // users.email は UNIQUE。Google 側で他ユーザーが使っている email に変更されると
    // 制約違反になる。UNIQUE 自体は乗っ取り防止として正しいので、500 ではなく
    // 案内可能なエラーに倒す。
    console.error(e);
    return redirectTo("/?auth_error=email_conflict");
  }

  const token = randomToken();
  await createSession(env.DB, {
    tokenHash: await sha256Hex(token),
    userId: user.id,
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
    now: now.toISOString(),
  });
  // 掃除をここに置くのは、/api/* の経路に D1 書き込みを持ち込まないためである。
  await deleteExpiredSessions(env.DB, user.id, now.toISOString());

  // Cookie は __Host- prefix かつ HttpOnly なので通常は書き換えられないが、
  // Location に入れる直前にもう一度通す。safeRedirect は冪等なのでコストは無い。
  const headers = new Headers({ Location: safeRedirect(saved.redirect) });
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
  // 転送先は読み取り専用の 5 経路だけなので、GET 以外は受ける意味がない。
  // 素通しにすると POST が GET に変換されて 200 を返し、キャッシュにも載る。
  if (request.method !== "GET") {
    return new Response("method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  const user = await currentUser(request, env);
  const token = user
    ? await signApiToken(
        env.AUTH_SIGNING_KEYS,
        user.id,
        effectiveRole(user.role, user.trialExpiresAt, new Date().toISOString())
      )
    : null;

  // 格納するのは api が public と宣言した応答だけで、それはロール非依存の経路
  // （institutions / scrape-runs）に限られる。認証必須の応答には private, no-store が
  // 付くので入らない。したがってログイン中でも読んでよく、むしろ読まないと
  // ログインユーザーだけが毎回 D1 を引くことになる（無料枠の制約は rows read）。
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(hit.body, hit);

  const response = await proxyToApi({ api: env.API, request, apiPath, token });

  if (response.status === 200 && response.headers.get("Cache-Control")?.includes("public")) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

export function createWorker(google: GoogleDeps = defaultGoogle) {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const { pathname } = new URL(request.url);
      try {
        // 総当たり対策なので、対象はログイン開始と受け口の 2 経路だけである。
        // /auth/me を含めてはならない。全訪問者がページ読み込みごとに叩くため、
        // 共有 IP（CGNAT・社内 NAT）で枠を食い潰し、429 を受けた Auth コンテキストが
        // ログイン済みユーザーを anonymous に倒してしまう。
        // /api/* は api 側の RATE_LIMITER が受け持つ。
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

        if (pathname === "/auth/login" && request.method === "GET") {
          return await handleLogin(request, env);
        }
        if (pathname === "/auth/callback" && request.method === "GET") {
          return await handleCallback(request, env, google);
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
        // run_worker_first が /auth/* と /api/* だけなので通常ここには来ない。
        // 設定を変えたときや、アセットに無いパスが回ってきたときの受け皿として残す。
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
