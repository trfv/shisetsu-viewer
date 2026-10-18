import { readClaims, type Role } from "@shisetsu-viewer/shared";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type { Role };

// JWKS はユーザー非依存のためモジュールレベルのキャッシュで良い（可変シングルトン禁止の対象外）。
let jwks: JWTVerifyGetKey | null = null;

function getJwks(domain: string): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  return jwks;
}

interface Auth0Env {
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
}

export interface Principal {
  // Auth0 の access token には常にあるが、ロールの判定はこれに依存させない
  sub: string | undefined;
  role: Role;
}

/**
 * Auth0 access token を検証し、利用者（sub）とロールを返す。検証失敗・トークン無しは null。
 * クレームの解釈は shared の readClaims（viewer の BFF と共有）。
 *
 * getKey はテスト用に注入可能（ローカル JWKS）。省略時はテナントの JWKS を使う。
 */
export async function verifyAccessToken(
  token: string | undefined,
  env: Auth0Env,
  getKey?: JWTVerifyGetKey
): Promise<Principal | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey ?? getJwks(env.AUTH0_DOMAIN), {
      // issuer は末尾スラッシュ必須。alg は実 JWKS（trfv.jp.auth0.com）が RS256。
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      audience: env.AUTH0_AUDIENCE,
      algorithms: ["RS256"],
    });
    return { sub: payload.sub, role: readClaims(payload).role };
  } catch {
    return null;
  }
}

/** Auth0 access token からロールを解決する。検証失敗・トークン無しは anonymous。 */
export async function resolveRole(
  token: string | undefined,
  env: Auth0Env,
  getKey?: JWTVerifyGetKey
): Promise<Role> {
  return (await verifyAccessToken(token, env, getKey))?.role ?? "anonymous";
}
