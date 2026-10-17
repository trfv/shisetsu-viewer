import { OAuthError } from "@cloudflare/workers-oauth-provider";

/** 上流 IdP（Auth0）とのやり取り。MCP クライアントには Auth0 のトークンを渡さず、props に暗号化して持つ。 */

export interface Auth0Env {
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_AUDIENCE: string;
}

export function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function codeChallengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export async function exchangeAuth0Code(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  env: Auth0Env
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
export async function refreshAuth0Token(
  refreshToken: string,
  env: Auth0Env
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
export function extractJwtSub(jwt: string): string {
  const payload = jwt.split(".")[1];
  if (!payload) throw new Error("Invalid JWT format");
  // JWT uses base64url encoding
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(atob(base64)) as { sub: string };
  if (!decoded.sub) throw new Error("JWT missing sub claim");
  return decoded.sub;
}
