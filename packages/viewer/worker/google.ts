import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Google は id_token の iss として https 付きと無しの両方を発行しうると自ら文書化している。
// 現行はほぼ https 付きだが、無しを返された場合の症状は「全ユーザーがログイン不能」で、
// しかも exchange_failed に丸められて原因が見えない。両方受け付けておく。
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

// JWKS の取得先は固定 URL のためモジュールレベルのキャッシュで良い。
let jwks: JWTVerifyGetKey | null = null;

function getJwks(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(CERTS_URL));
  return jwks;
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** テストから差し替えるための fetch。既定はグローバルの fetch。 */
export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

/**
 * 認可コードを id_token に交換する。access_token は使わないので捨てる。
 *
 * fetchImpl はテスト用の注入口。@cloudflare/vitest-pool-workers 0.19 の
 * cloudflare:test は fetchMock を export しないため、この seam で外部通信を止める。
 */
export async function exchangeCode(
  params: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    verifier: string;
  },
  fetchImpl: FetchImpl = fetch
): Promise<string> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.verifier,
    grant_type: "authorization_code",
  });

  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json()) as { id_token?: string; error?: string };
  if (!response.ok || !json.id_token) {
    throw new Error(`Google token endpoint error: ${json.error ?? response.status}`);
  }
  return json.id_token;
}

/** getKey はテスト用の鍵注入。省略時は Google の JWKS を使う。 */
export async function verifyIdToken(
  idToken: string,
  clientId: string,
  getKey?: JWTVerifyGetKey
): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, getKey ?? getJwks(), {
    issuer: ISSUERS,
    audience: clientId,
    algorithms: ["RS256"],
  });

  const sub = payload.sub;
  const email = payload["email"];
  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("id_token に sub または email がありません");
  }
  return { sub, email, emailVerified: payload["email_verified"] === true };
}
