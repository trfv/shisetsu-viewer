import { readClaims, type Role } from "@shisetsu-viewer/shared";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type { Role };

// ユーザー非依存なので、可変シングルトン禁止の例外としてモジュールスコープに置く
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

export async function verifyAccessToken(
  token: string | undefined,
  env: Auth0Env,
  getKey?: JWTVerifyGetKey
): Promise<Principal | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey ?? getJwks(env.AUTH0_DOMAIN), {
      // issuer は末尾スラッシュ必須
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      audience: env.AUTH0_AUDIENCE,
      algorithms: ["RS256"],
    });
    return { sub: payload.sub, role: readClaims(payload).role };
  } catch {
    return null;
  }
}

export async function resolveRole(
  token: string | undefined,
  env: Auth0Env,
  getKey?: JWTVerifyGetKey
): Promise<Role> {
  return (await verifyAccessToken(token, env, getKey))?.role ?? "anonymous";
}
