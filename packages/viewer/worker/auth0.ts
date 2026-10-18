import { readClaims } from "@shisetsu-viewer/shared";

import { fromBase64Url, type Session } from "./session.ts";

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

export function auth0Config(env: Cloudflare.Env): Auth0Config {
  return {
    domain: env.AUTH0_DOMAIN,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    audience: env.AUTH0_AUDIENCE,
  };
}

export type FetchLike = (input: Request | string, init?: RequestInit) => Promise<Response>;

// connection を指定すると Auth0 は Universal Login を出さずに Google へ転送する。
// offline_access は refresh token を受け取るために要る。
export function buildAuthorizeUrl(
  config: Auth0Config,
  params: { redirectUri: string; state: string; challenge: string }
): string {
  const url = new URL(`https://${config.domain}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid offline_access");
  url.searchParams.set("audience", config.audience);
  url.searchParams.set("connection", "google-oauth2");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function buildLogoutUrl(config: Auth0Config, returnTo: string): string {
  const url = new URL(`https://${config.domain}/v2/logout`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

// invalid_grant 以外（Auth0 の障害・通信断）は一時的な障害でログアウトさせないよう Cookie を残す。
export class RefreshError extends Error {
  readonly kind: "invalid_grant" | "unavailable";

  constructor(kind: "invalid_grant" | "unavailable") {
    super(`Auth0 refresh failed: ${kind}`);
    this.kind = kind;
  }
}

async function postToken(
  config: Auth0Config,
  body: Record<string, string>,
  fetchImpl: FetchLike
): Promise<Response> {
  return await fetchImpl(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  });
}

function toSession(token: TokenResponse, fallbackRefreshToken: string | undefined): Session {
  const refreshToken = token.refresh_token ?? fallbackRefreshToken;
  if (!refreshToken) throw new Error("Auth0 が refresh token を返しませんでした");
  return {
    accessToken: token.access_token,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + token.expires_in,
  };
}

export async function exchangeCode(
  config: Auth0Config,
  params: { code: string; verifier: string; redirectUri: string },
  fetchImpl: FetchLike
): Promise<Session> {
  const response = await postToken(
    config,
    {
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.verifier,
      redirect_uri: params.redirectUri,
    },
    fetchImpl
  );
  if (!response.ok) {
    throw new Error(`Auth0 code exchange failed: ${response.status} ${await response.text()}`);
  }
  return toSession((await response.json()) as TokenResponse, undefined);
}

// rotation 無効なので通常は新しい refresh token が返らず、手元のものを使い続ける。
export async function refreshSession(
  config: Auth0Config,
  refreshToken: string,
  fetchImpl: FetchLike
): Promise<Session> {
  let response: Response;
  try {
    response = await postToken(
      config,
      { grant_type: "refresh_token", refresh_token: refreshToken },
      fetchImpl
    );
  } catch {
    throw new RefreshError("unavailable");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new RefreshError(body.error === "invalid_grant" ? "invalid_grant" : "unavailable");
  }
  return toSession((await response.json()) as TokenResponse, refreshToken);
}

export async function revokeRefreshToken(
  config: Auth0Config,
  refreshToken: string,
  fetchImpl: FetchLike
): Promise<void> {
  const response = await fetchImpl(`https://${config.domain}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      token: refreshToken,
    }),
  });
  if (!response.ok) throw new Error(`Auth0 revoke failed: ${response.status}`);
}

// 署名は検証しない。トークンエンドポイントから TLS で直接受け取ったものだけを読み、検証は api が行う。
export function readRole(accessToken: string): { anonymous: boolean; trial: boolean } {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) throw new Error("JWT ではありません");
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Record<
      string,
      unknown
    >;
    const { role, trial } = readClaims(claims);
    return { anonymous: role !== "user", trial };
  } catch {
    return { anonymous: true, trial: false };
  }
}
