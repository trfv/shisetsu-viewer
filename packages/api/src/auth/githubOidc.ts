import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
  return jwks;
}

interface OidcEnv {
  GITHUB_REPOSITORY: string;
  OIDC_AUDIENCE: string;
}

/**
 * GitHub Actions OIDC トークンを検証する。
 * ピンするクレーム: iss / aud / repository / ref が refs/heads/* であること。
 *  - ref を特定ブランチに固定しない: retry run・workflow_dispatch・ブランチでの検証実行も通したい
 *  - ただし refs/heads/ 前置は要求する（PR の merge ref = refs/pull/N/merge を弾く）
 *  - fork からの PR はそもそも id-token: write を得られない
 *  - sub は environment 利用で形式が変わるためピンしない
 *
 * getKey はテスト用に注入可能（ローカル JWKS）。
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
      payload["repository"] === env.GITHUB_REPOSITORY &&
      typeof ref === "string" &&
      ref.startsWith("refs/heads/")
    );
  } catch {
    return false;
  }
}
