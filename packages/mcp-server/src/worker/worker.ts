import {
  OAuthProvider,
  AuthorizationError,
  CimdFetchError,
  GrantType,
  authorizationErrorRedirect,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { resolveRole } from "@shisetsu-viewer/api/auth/auth0";

import { createHttpDataSource } from "../data/httpDataSource.ts";
import { createServer } from "../server/createServer.ts";
import {
  type Auth0Env,
  base64url,
  codeChallengeOf,
  exchangeAuth0Code,
  extractJwtSub,
  refreshAuth0Token,
} from "./auth0.ts";
import { renderConsentPage } from "./consentPage.ts";
import { preflight } from "./preflight.ts";

// wrangler types の Env は手元の .env から secret を拾うため CI では型が欠ける。ここで手書きする
interface Env extends Auth0Env {
  API: Fetcher;
  OAUTH_KV: unknown;
  OAUTH_PROVIDER: OAuthHelpers;
}

// Service Binding では host は使われないが、URL の構築に必要である
const API_INTERNAL_ORIGIN = "https://api.internal";

interface UpstreamTokens {
  upstreamAccessToken: string;
  refreshToken: string;
}

interface UpstreamData {
  codeVerifier: string;
}

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

const mcpHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // ロールと DataSource はモジュールスコープに置かない。isolate 内で並行する他リクエストの
    // 認証状態に差し替わり、per-user 権限が破れる。
    const { upstreamAccessToken } = ctx.props as { upstreamAccessToken: string };
    const role = await resolveRole(upstreamAccessToken, env);

    // 利用者の IP は Service Binding では自動で付かない。api の RATE_LIMITER が無認証の要求を IP で数える
    const dataSource = createHttpDataSource(
      API_INTERNAL_ORIGIN,
      {
        bearer: upstreamAccessToken,
        clientIp: request.headers.get("CF-Connecting-IP") ?? undefined,
      },
      (input, init) => env.API.fetch(input, init)
    );
    const handler = createMcpHandler(({ era }) => {
      // legacy が来なくなったのをこのログで確かめてから legacy: "reject" に切り替える
      console.log(JSON.stringify({ mcpEra: era, userAgent: request.headers.get("user-agent") }));
      return createServer({ dataSource, allowReservations: role === "user" });
    });
    return handler.fetch(request);
  },
};

function createOAuthProvider(origin: string) {
  return new OAuthProvider<Env>({
    apiRoute: "/mcp",
    apiHandler: mcpHandler,
    defaultHandler: authHandler,
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/oauth/token",
    // トークンの audience。カスタムドメインと workers.dev のどちらで受けても、その origin に縛る
    resourceMetadata: { resource: `${origin}/mcp` },
    // DCR（clientRegistrationEndpoint）は MCP 2026-07-28 で非推奨のため開けない。
    clientIdMetadataDocumentEnabled: true,
    accessTokenTTL: 82800, // Auth0 のアクセストークン（24h）より先にリフレッシュさせる
    refreshTokenTTL: 2592000,

    tokenExchangeCallback: async ({ grantType, props, env }) => {
      const typedProps = props as UpstreamTokens;

      if (grantType === GrantType.AUTHORIZATION_CODE) {
        return {
          accessTokenProps: { upstreamAccessToken: typedProps.upstreamAccessToken },
        };
      }

      const fresh = await refreshAuth0Token(typedProps.refreshToken, env as Env);
      const rotated = fresh.refresh_token && fresh.refresh_token !== typedProps.refreshToken;
      return {
        accessTokenProps: { upstreamAccessToken: fresh.access_token },
        // ローテーションされたときだけ保存し、KV write を節約する
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const shortCircuit = preflight(request);
    if (shortCircuit) return shortCircuit;

    return createOAuthProvider(new URL(request.url).origin).fetch(request, env, ctx);
  },
};
