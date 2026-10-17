import {
  OAuthProvider,
  AuthorizationError,
  CimdFetchError,
  GrantType,
  OAuthError,
  authorizationErrorRedirect,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveRole } from "@shisetsu-viewer/api/auth/auth0";

import { renderConsentPage } from "./consentPage.ts";
import { createD1DataSource } from "./d1DataSource.ts";
import { preflight } from "./preflight.ts";
import { createServer } from "./server.ts";

interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_AUDIENCE: string;
  // KVNamespace — typed as unknown here; OAuthProvider handles it internally
  OAUTH_KV: unknown;
  OAUTH_PROVIDER: OAuthHelpers;
}

interface UpstreamTokens {
  upstreamAccessToken: string;
  refreshToken: string;
}

/** beginUpstream に預け、/callback で取り戻す値。Auth0 には送らない。 */
interface UpstreamData {
  codeVerifier: string;
}

// ---------------------------------------------------------------------------
// Auth0 helpers
// ---------------------------------------------------------------------------

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function codeChallengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

async function exchangeAuth0Code(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  env: Env
): Promise<{ access_token: string; refresh_token: string }> {
  const response = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      audience: env.AUTH0_AUDIENCE,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 token exchange failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<{ access_token: string; refresh_token: string }>;
}

/**
 * Auth0 の refresh。失敗を OAuthError に分類して OAuthProvider に伝える：
 * Auth0 が invalid_grant（失効、ユーザーによる取り消し）なら grant ごと破棄させてクライアントに
 * 再認可を促し、それ以外（Auth0 の障害、通信断）は temporarily_unavailable で再試行を残す。
 */
async function refreshAuth0Token(
  refreshToken: string,
  env: Env
): Promise<{ access_token: string; refresh_token?: string }> {
  let response: Response;
  try {
    response = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: env.AUTH0_CLIENT_ID,
        client_secret: env.AUTH0_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });
  } catch {
    throw new OAuthError("temporarily_unavailable", {
      description: "Auth0 is unreachable",
      statusCode: 503,
    });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (body.error === "invalid_grant") {
      throw new OAuthError("invalid_grant", { description: "Auth0 refresh token was revoked" });
    }
    throw new OAuthError("temporarily_unavailable", {
      description: `Auth0 token refresh failed: ${response.status}`,
      statusCode: 503,
    });
  }

  return response.json() as Promise<{ access_token: string; refresh_token?: string }>;
}

/** Extract `sub` claim from a JWT without signature verification (safe when token comes directly from Auth0) */
function extractJwtSub(jwt: string): string {
  const payload = jwt.split(".")[1];
  if (!payload) throw new Error("Invalid JWT format");
  // JWT uses base64url encoding
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(atob(base64)) as { sub: string };
  if (!decoded.sub) throw new Error("JWT missing sub claim");
  return decoded.sub;
}

// ---------------------------------------------------------------------------
// Default handler — /authorize and /callback (Auth0 integration)
//
// GET /authorize で同意画面を出し、POST /authorize で承認されて初めて Auth0 へ送る。
// Auth0 に渡す state は beginUpstream が作り、ブラウザの __Host- cookie に紐付く。
// 認可リクエストはサーバー側（KV）に置くので、フォームや state から改ざんできない。
// ---------------------------------------------------------------------------

function redirect(location: string, headers: Headers): Response {
  headers.set("Location", location);
  return new Response(null, { status: 302, headers });
}

async function showConsent(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  const authRequest = await oauth.parseAuthRequest(request);
  // describeConsent を先に呼ぶ。CIMD の取得に失敗したとき KV に何も残さないため
  const details = await oauth.describeConsent(authRequest);
  const consent = await oauth.beginConsent(authRequest);
  consent.headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(renderConsentPage(details, consent.handle), { headers: consent.headers });
}

async function submitConsent(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  const form = await request.formData();
  const handle = String(form.get("handle") ?? "");

  if (form.get("decision") !== "approve") {
    const denied = await oauth.denyConsent(request, handle);
    return new Response(null, { status: 302, headers: denied.headers });
  }

  const approved = await oauth.approveConsent(request, handle);
  const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const { state, headers } = await oauth.beginUpstream(approved.request, {
    data: { codeVerifier } satisfies UpstreamData,
    headers: approved.headers,
  });

  const auth0Url = new URL(`https://${env.AUTH0_DOMAIN}/authorize`);
  auth0Url.searchParams.set("response_type", "code");
  auth0Url.searchParams.set("client_id", env.AUTH0_CLIENT_ID);
  auth0Url.searchParams.set("redirect_uri", `${new URL(request.url).origin}/callback`);
  auth0Url.searchParams.set("audience", env.AUTH0_AUDIENCE);
  auth0Url.searchParams.set("scope", "openid offline_access");
  auth0Url.searchParams.set("state", state);
  auth0Url.searchParams.set("code_challenge", await codeChallengeOf(codeVerifier));
  auth0Url.searchParams.set("code_challenge_method", "S256");
  return redirect(auth0Url.toString(), headers);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  const url = new URL(request.url);
  const { request: original, data, headers } = await oauth.finishUpstream<UpstreamData>(request);

  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) {
    return redirect(authorizationErrorRedirect(original, "access_denied"), headers);
  }

  const tokens = await exchangeAuth0Code(code, data.codeVerifier, `${url.origin}/callback`, env);
  const { redirectTo } = await oauth.completeAuthorization({
    request: original,
    userId: extractJwtSub(tokens.access_token),
    scope: original.scope,
    metadata: {},
    props: {
      upstreamAccessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    } satisfies UpstreamTokens,
  });
  return redirect(redirectTo, headers);
}

const authHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/authorize" && request.method === "GET")
        return await showConsent(request, env);
      if (pathname === "/authorize" && request.method === "POST")
        return await submitConsent(request, env);
      if (pathname === "/callback") return await handleCallback(request, env);
    } catch (error) {
      // redirectTo があるのはクライアントと redirect_uri の検証が済んだときだけ。無ければ手元で表示する
      if (error instanceof AuthorizationError && error.redirectTo) {
        return Response.redirect(error.redirectTo, 302);
      }
      if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
        const message =
          error instanceof AuthorizationError
            ? `認可を続けられません（${error.description}）。接続をやり直してください。`
            : "クライアントを確認できませんでした。";
        return new Response(message, {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      throw error;
    }
    return new Response("Not Found", { status: 404 });
  },
};

// ---------------------------------------------------------------------------
// API handler — /mcp (MCP protocol endpoint)
// ---------------------------------------------------------------------------

const mcpHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // ロールと DataSource はこのリクエストのスコープに閉じ込める。モジュールスコープに置くと
    // isolate 内で並行する他リクエストの認証状態に差し替わり、per-user 権限が破れる。
    // reservations 系ツールは user かつ非 trial のときだけ露出する（allowReservations）。
    // props は OAuthProvider が accessToken から復元する（型は unknown なのでここで narrow する）。
    const { upstreamAccessToken } = ctx.props as { upstreamAccessToken: string };
    const role = await resolveRole(upstreamAccessToken, env);

    const server = createServer({
      dataSource: createD1DataSource(env.DB),
      allowReservations: role === "user",
    });
    const transport = new WebStandardStreamableHTTPServerTransport({});
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};

// ---------------------------------------------------------------------------
// OAuthProvider factory — per-request so the resource follows the request's origin
// ---------------------------------------------------------------------------

function createOAuthProvider(origin: string) {
  return new OAuthProvider<Env>({
    apiRoute: "/mcp",
    apiHandler: mcpHandler,
    defaultHandler: authHandler,
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/oauth/token",
    // トークンの audience。カスタムドメインと workers.dev のどちらで受けても、その origin に縛る
    resourceMetadata: { resource: `${origin}/mcp` },
    // クライアント登録は CIMD のみ。DCR（clientRegistrationEndpoint）は MCP 2026-07-28 で非推奨のため開けない。
    // CIMD の取得には wrangler.jsonc の global_fetch_strictly_public が要る
    clientIdMetadataDocumentEnabled: true,
    accessTokenTTL: 82800, // 23h (Auth0 access token TTL 24h より短く設定し、先にリフレッシュさせる)
    refreshTokenTTL: 2592000, // 30 days

    tokenExchangeCallback: async ({ grantType, props, env }) => {
      const typedProps = props as UpstreamTokens;

      if (grantType === GrantType.AUTHORIZATION_CODE) {
        // Initial exchange: pass Auth0 access token to the MCP access token
        return {
          accessTokenProps: { upstreamAccessToken: typedProps.upstreamAccessToken },
        };
      }

      // Refresh: obtain a fresh Auth0 access token via refresh token
      const fresh = await refreshAuth0Token(typedProps.refreshToken, env as Env);
      const rotated = fresh.refresh_token && fresh.refresh_token !== typedProps.refreshToken;
      return {
        accessTokenProps: { upstreamAccessToken: fresh.access_token },
        // Only persist newProps when Auth0 rotated the refresh token (saves a KV write)
        ...(rotated && {
          newProps: {
            upstreamAccessToken: fresh.access_token,
            refreshToken: fresh.refresh_token!,
          } satisfies UpstreamTokens,
        }),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // OAuthProvider はハンドラを呼ぶ前にトークンを KV から引くため、弾けるものは先に弾く
    const shortCircuit = preflight(request);
    if (shortCircuit) return shortCircuit;

    return createOAuthProvider(new URL(request.url).origin).fetch(request, env, ctx);
  },
};
