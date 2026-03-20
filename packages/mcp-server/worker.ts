import {
  OAuthProvider,
  GrantType,
  type OAuthHelpers,
  type AuthRequest,
} from "@cloudflare/workers-oauth-provider";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { configureGraphQL } from "./graphqlClient.ts";
import { createServer } from "./server.ts";

// Minimal Cloudflare Workers type declarations (avoids pulling in full @cloudflare/workers-types)
interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface Env {
  GRAPHQL_ENDPOINT: string;
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

// ---------------------------------------------------------------------------
// Auth0 helpers
// ---------------------------------------------------------------------------

async function exchangeAuth0Code(
  code: string,
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

async function refreshAuth0Token(
  refreshToken: string,
  env: Env
): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 token refresh failed: ${response.status} ${text}`);
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
// ---------------------------------------------------------------------------

const authHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") {
      const oauthReq = await env.OAUTH_PROVIDER.parseAuthRequest(request);

      // Encode the MCP auth request into Auth0's state param so we can retrieve it in /callback
      const state = btoa(JSON.stringify(oauthReq));

      const auth0Url = new URL(`https://${env.AUTH0_DOMAIN}/authorize`);
      auth0Url.searchParams.set("response_type", "code");
      auth0Url.searchParams.set("client_id", env.AUTH0_CLIENT_ID);
      auth0Url.searchParams.set("redirect_uri", `${url.origin}/callback`);
      auth0Url.searchParams.set("audience", env.AUTH0_AUDIENCE);
      auth0Url.searchParams.set("scope", "openid offline_access");
      auth0Url.searchParams.set("state", state);

      return Response.redirect(auth0Url.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        return Response.json({ error: "Missing code or state" }, { status: 400 });
      }

      // Restore the original MCP auth request
      const oauthReq = JSON.parse(atob(state)) as AuthRequest;

      // Exchange Auth0 authorization code for tokens
      const tokens = await exchangeAuth0Code(code, `${url.origin}/callback`, env);

      const userId = extractJwtSub(tokens.access_token);

      // Complete the MCP OAuth flow — OAuthProvider issues its own tokens
      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReq,
        userId,
        scope: oauthReq.scope,
        metadata: {},
        props: {
          upstreamAccessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        } satisfies UpstreamTokens,
      });

      return Response.redirect(redirectTo, 302);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ---------------------------------------------------------------------------
// API handler — /mcp (MCP protocol endpoint)
// ---------------------------------------------------------------------------

const mcpHandler = {
  async fetch(
    request: Request,
    env: Env,
    ctx: CloudflareExecutionContext & { props: { upstreamAccessToken: string } }
  ): Promise<Response> {
    configureGraphQL(env.GRAPHQL_ENDPOINT, ctx.props.upstreamAccessToken);

    const server = createServer({ authMode: "auth0" });
    const transport = new WebStandardStreamableHTTPServerTransport({});
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};

// ---------------------------------------------------------------------------
// OAuthProvider factory — per-request so tokenExchangeCallback can close over env
// ---------------------------------------------------------------------------

function createOAuthProvider(env: Env) {
  return new OAuthProvider<Env>({
    apiRoute: "/mcp",
    apiHandler: mcpHandler,
    defaultHandler: authHandler,
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/oauth/token",
    clientRegistrationEndpoint: "/oauth/register",
    accessTokenTTL: 82800, // 23h (Auth0 access token TTL 24h より短く設定し、先にリフレッシュさせる)
    refreshTokenTTL: 2592000, // 30 days

    tokenExchangeCallback: async ({ grantType, props }) => {
      const typedProps = props as UpstreamTokens;

      if (grantType === GrantType.AUTHORIZATION_CODE) {
        // Initial exchange: pass Auth0 access token to the MCP access token
        return {
          accessTokenProps: { upstreamAccessToken: typedProps.upstreamAccessToken },
        };
      }

      // Refresh: obtain a fresh Auth0 access token via refresh token
      const fresh = await refreshAuth0Token(typedProps.refreshToken, env);
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
// Request pre-filtering (prevents unnecessary KV reads from OAuthProvider)
// ---------------------------------------------------------------------------

const ALLOWED_PATHS = new Set([
  "/mcp",
  "/authorize",
  "/callback",
  "/oauth/token",
  "/oauth/register",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
]);

/**
 * OAuthProvider issues tokens in `userId:grantId:hash` format (3 colon-separated parts).
 * Reject tokens that don't match this format before OAuthProvider attempts a KV read.
 */
function hasValidInternalTokenFormat(authHeader: string): boolean {
  if (!authHeader.startsWith("Bearer ")) return true; // no Bearer → let OAuthProvider return 401
  const token = authHeader.substring(7);
  return token.split(":").length === 3;
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env, ctx: CloudflareExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1a. Reject unknown paths before OAuthProvider
    if (!ALLOWED_PATHS.has(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    // 1b. Reject malformed Bearer tokens on /mcp to avoid KV reads
    if (url.pathname === "/mcp") {
      const authHeader = request.headers.get("authorization");
      if (authHeader && !hasValidInternalTokenFormat(authHeader)) {
        return Response.json(
          { error: "invalid_token", error_description: "Invalid token format" },
          {
            status: 401,
            headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
          }
        );
      }
    }

    return createOAuthProvider(env).fetch(request, env, ctx);
  },
};
