import {
  createLocalJWKSet,
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";

import type { Role } from "./roles.ts";

// Role の定義は roles.ts に移した。mcp-server が auth0 経由で import しているため再輸出する。
export type { Role } from "./roles.ts";

const HASURA_CLAIMS = "https://hasura.io/jwt/claims";
const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";

/** BFF が発行する JWT の issuer と audience */
export const SELF_ISSUER = "https://app.shisetsudb.com/";
export const SELF_AUDIENCE = "shisetsu-api";

// JWKS はユーザー非依存のためモジュールレベルのキャッシュで良い（可変シングルトン禁止の対象外）。
let auth0Jwks: JWTVerifyGetKey | null = null;

// 自前 JWKS は env の文字列から組み立てるため、その文字列をキーにする。
// キーを持たないキャッシュにすると、SELF_JWKS_JSON を差し替えても暖まった isolate が
// 古い鍵で検証し続ける（鍵ローテーション時に旧鍵しか見なくなる）。
let selfJwks: { source: string; getKey: JWTVerifyGetKey } | null = null;

function getAuth0Jwks(domain: string): JWTVerifyGetKey {
  auth0Jwks ??= createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  return auth0Jwks;
}

function getSelfJwks(jwksJson: string): JWTVerifyGetKey {
  if (selfJwks?.source !== jwksJson) {
    selfJwks = { source: jwksJson, getKey: createLocalJWKSet(JSON.parse(jwksJson)) };
  }
  return selfJwks.getKey;
}

interface AuthEnv {
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  SELF_JWKS_JSON?: string;
}

// exactOptionalPropertyTypes の下では、テストから明示的に undefined を渡せるよう
// 省略可能に加えて undefined も型に含める必要がある。
interface KeyOverrides {
  auth0?: JWTVerifyGetKey | undefined;
  self?: JWTVerifyGetKey | undefined;
}

/**
 * access token からロールを解決する。検証失敗・トークン無し・未知の issuer は anonymous。
 * 署名検証の前に読むのは iss だけで、他のクレームは検証後にしか参照しない。
 *
 * overrides はテスト用の鍵注入である。省略時は Auth0 のリモート JWKS と
 * env.SELF_JWKS_JSON のローカル JWKS を使う。
 */
export async function resolveRole(
  token: string | undefined,
  env: AuthEnv,
  overrides?: KeyOverrides
): Promise<Role> {
  if (!token) return "anonymous";

  let issuer: string | undefined;
  try {
    issuer = decodeJwt(token).iss;
  } catch {
    return "anonymous";
  }

  const auth0Issuer = `https://${env.AUTH0_DOMAIN}/`;

  if (issuer === auth0Issuer) {
    const getKey = overrides?.auth0 ?? getAuth0Jwks(env.AUTH0_DOMAIN);
    return await verifyAndResolve(token, getKey, auth0Issuer, env.AUTH0_AUDIENCE, ["RS256"]);
  }

  if (issuer === SELF_ISSUER) {
    const getKey =
      overrides?.self ?? (env.SELF_JWKS_JSON ? getSelfJwks(env.SELF_JWKS_JSON) : undefined);
    if (!getKey) return "anonymous";
    return await verifyAndResolve(token, getKey, SELF_ISSUER, SELF_AUDIENCE, ["ES256"]);
  }

  return "anonymous";
}

async function verifyAndResolve(
  token: string,
  getKey: JWTVerifyGetKey,
  issuer: string,
  audience: string,
  algorithms: string[]
): Promise<Role> {
  try {
    const { payload } = await jwtVerify(token, getKey, { issuer, audience, algorithms });
    const app = payload[APP_CLAIMS] as { role?: string; trial?: boolean } | undefined;
    if (app?.trial === true) return "anonymous";
    if (app?.role && app.role !== "anonymous") return "user";
    const hasura = payload[HASURA_CLAIMS] as Record<string, unknown> | undefined;
    return hasura?.["x-hasura-default-role"] === "user" ? "user" : "anonymous";
  } catch {
    return "anonymous";
  }
}
