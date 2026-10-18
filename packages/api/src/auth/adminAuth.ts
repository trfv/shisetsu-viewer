import type { JWTVerifyGetKey } from "jose";

import { verifyGithubOidc } from "./githubOidc.ts";

interface AdminEnv {
  GITHUB_REPOSITORY: string;
  OIDC_AUDIENCE: string;
  ADMIN_API_KEY?: string | undefined;
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

// X-Admin-Key は SHA-256 で長さを揃えてから定数時間比較する（長さ差も漏らさない）
export async function authorizeAdmin(
  request: Request,
  env: AdminEnv,
  oidcGetKey?: JWTVerifyGetKey
): Promise<boolean> {
  const adminKey = request.headers.get("X-Admin-Key");
  if (adminKey && env.ADMIN_API_KEY) {
    const [a, b] = await Promise.all([sha256(adminKey), sha256(env.ADMIN_API_KEY)]);
    return crypto.subtle.timingSafeEqual(a, b);
  }
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!bearer) return false;
  return verifyGithubOidc(bearer, env, oidcGetKey);
}
