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

/** Auth0 のトークンエンドポイントを差し替えるための型。テストから偽の fetch を渡す。 */
export type FetchLike = (input: Request | string, init?: RequestInit) => Promise<Response>;

/**
 * connection を指定すると Auth0 は Universal Login を出さずに Google へ転送する。
 * 接続は Google だけなので、利用者から見るとログインボタンの直後に Google の画面が出る。
 * offline_access は refresh token を受け取るために要る。
 */
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

/**
 * refresh の失敗の分類。invalid_grant（revoke 済み・期限切れ）はセッションを捨てて
 * 再ログインさせ、それ以外（Auth0 の障害・通信断）は Cookie を残して再試行に委ねる。
 * 一時的な障害で利用者をログアウトさせないためである（mcp-server の refreshAuth0Token と同じ基準）。
 */
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

/**
 * rotation を無効にしているので、Auth0 は新しい refresh token を返さない。
 * そのときは手元の refresh token を使い続ける（rotation を有効に戻しても動くよう、返れば差し替える）。
 */
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

/** ログアウト時の後始末。失敗してもログアウト自体は進めるので、呼び出し側で握りつぶしてよい。 */
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

const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";
const HASURA_CLAIMS = "https://hasura.io/jwt/claims";

/**
 * アクセストークンのクレームから UI 向けのロールを読む。署名は検証しない。
 * BFF が読むのはトークンエンドポイントから TLS で直接受け取ったトークンだけであり、
 * 署名の検証は従来どおり api が行う（mcp-server の extractJwtSub と同じ判断）。
 *
 * anonymous の判定は api の resolveRole（packages/api/src/auth/auth0.ts）に揃える。
 * 揃えないと、UI は予約タブを開くのに api が 401 を返す、という食い違いが起きる。
 * trial は api の認可に影響しない。UI が「（トライアル）」の表示と予約タブの制御に使うので別に返す。
 */
export function readRole(accessToken: string): { anonymous: boolean; trial: boolean } {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) throw new Error("JWT ではありません");
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Record<
      string,
      unknown
    >;
    const app = claims[APP_CLAIMS] as { role?: string; trial?: boolean } | undefined;
    const hasura = claims[HASURA_CLAIMS] as Record<string, unknown> | undefined;
    const user = app?.role
      ? app.role !== "anonymous"
      : hasura?.["x-hasura-default-role"] === "user";
    return { anonymous: !user, trial: app?.trial === true };
  } catch {
    return { anonymous: true, trial: false };
  }
}
