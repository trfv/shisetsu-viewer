import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
  return jwks;
}

interface OidcEnv {
  GITHUB_REPOSITORY_ID: string;
  OIDC_AUDIENCE: string;
}

/**
 * ref を特定ブランチに固定しない（retry run・workflow_dispatch・ブランチでの検証実行を通す）。
 * refs/heads/ 前置は要求して PR の merge ref を弾く。sub は environment 利用で形式が変わるのでピンしない。
 * repository（owner/name）ではなく repository_id で照合する。名前は移転や改名で変わる。
 */
export async function verifyGithubOidc(
  token: string,
  env: OidcEnv,
  getKey?: JWTVerifyGetKey
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getKey ?? getJwks(), {
      issuer: GITHUB_ISSUER,
      audience: env.OIDC_AUDIENCE,
      algorithms: ["RS256"],
    });
    const ref = payload["ref"];
    return (
      payload["repository_id"] === env.GITHUB_REPOSITORY_ID &&
      typeof ref === "string" &&
      ref.startsWith("refs/heads/")
    );
  } catch {
    return false;
  }
}
