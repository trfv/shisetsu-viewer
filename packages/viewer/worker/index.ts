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

// binding の定義は wrangler.jsonc から生成した Cloudflare.Env が持つ（Secret は secrets.required から生成される）。
export type Env = Cloudflare.Env;

const SESSION_COOKIE = "__Host-session";
const OAUTH_COOKIE = "__Host-oauth";
// refresh token の Maximum Lifetime（Auth0 側の設定）に揃える。
const SESSION_TTL_SECONDS = 365 * 24 * 60 * 60;
const OAUTH_TTL_SECONDS = 600;
// 失効の直前に api へ渡すと、api に届く頃に切れていることがある。余裕を持って refresh する。
const REFRESH_LEEWAY_SECONDS = 60;

/** レート制限の対象。総当たりの的になるログイン経路だけに絞る。 */
const RATE_LIMITED_PATHS = new Set(["/auth/login", "/auth/callback"]);

interface OauthState {
  state: string;
  verifier: string;
  redirect: string;
}

/**
 * Auth0 への通信の注入口。この pool では vi.mock によるモジュール差し替えが効かないため、
 * テストからは偽の fetch を渡して Auth0 に触らずに各経路を通す。
 */
export interface Deps {
  fetch: FetchLike;
}

const defaultDeps: Deps = { fetch: (input, init) => fetch(input, init) };

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
 * 本番と localhost の両方で同じ Worker が動くため、固定値にすると片方で必ずずれる。
 * Auth0 は Allowed Callback URLs と一致しない URI を拒否するので、導出しても安全性は落ちない。
 */
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

/**
 * 現在のセッションを解決する。必要なら refresh し、そのとき返す Set-Cookie も組み立てる。
 *
 * - session: 有効なセッション。無ければ null（未ログイン）
 * - cookies: 応答に付ける Set-Cookie（refresh した、または壊れた Cookie を消す）
 * - unavailable: Auth0 の一時的な障害で refresh できなかった。Cookie は残す
 */
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

  // 並行する /api/* がそれぞれここに来て同じ refresh token を使う。Auth0 側で
  // rotation を無効にしているので全て成功し、どの応答の Cookie が残っても有効である。
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

  // Cookie は暗号化されているので通常は書き換えられないが、Location に入れる直前に
  // もう一度通す。safeRedirect は冪等なのでコストは無い。
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

/**
 * Auth0 のセッションも消すため、最後に /v2/logout へ遷移させる。消さないと次のログインが
 * 同じ Google アカウントで即座に完了し、アカウントを切り替えられない。
 *
 * POST にしているのは、他サイトからのリンクで強制ログアウトさせられないためである
 * （SameSite=Lax の Cookie はトップレベルの GET には載る）。fetch では別オリジンへの
 * 302 を辿れないので、遷移先は JSON で返し、SPA が location を書き換える。
 */
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
      // revoke に失敗しても Cookie は消すので、このブラウザからは使えなくなる。
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
  // 転送先は読み取り専用の 5 経路だけなので、GET 以外は受ける意味がない。
  // 素通しにすると POST が GET に変換されて 200 を返し、キャッシュにも載る。
  if (request.method !== "GET") {
    return new Response("method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  // 格納するのは api が public と宣言した応答だけで、それはロール非依存の経路
  // （institutions / scrape-runs）に限られる。認証必須の応答には private, no-store が
  // 付くので入らない。したがってログイン中でも読んでよく、むしろ読まないと
  // ログインユーザーだけが毎回 D1 を引くことになる（無料枠の制約は rows read）。
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
        // 総当たり対策なので、対象はログイン開始と受け口の 2 経路だけである。
        // /auth/me を含めるわけにはいかない。全訪問者がページ読み込みごとに叩くため、
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
