import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type Role = "anonymous" | "user";

const HASURA_CLAIMS = "https://hasura.io/jwt/claims";
const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";

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

/**
 * Auth0 access token からロールを解決する。検証失敗・トークン無しは anonymous。
 * クレームの優先順: カスタム namespace（role/trial）→ Hasura namespace（x-hasura-default-role）。
 * trial はロールに影響しない。トライアル利用者は予約検索を使え、詳細ページの予約タブだけを
 * viewer が閉じる（UI の制御であり、api の認可ではない）。
 *
 * getKey はテスト用に注入可能（ローカル JWKS）。省略時はテナントの JWKS を使う。
 */
export async function resolveRole(
  token: string | undefined,
  env: Auth0Env,
  getKey?: JWTVerifyGetKey
): Promise<Role> {
  if (!token) return "anonymous";
  try {
    const { payload } = await jwtVerify(token, getKey ?? getJwks(env.AUTH0_DOMAIN), {
      // issuer は末尾スラッシュ必須。alg は実 JWKS（trfv.jp.auth0.com）が RS256。
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      audience: env.AUTH0_AUDIENCE,
      algorithms: ["RS256"],
    });
    const app = payload[APP_CLAIMS] as { role?: string; trial?: boolean } | undefined;
    if (app?.role && app.role !== "anonymous") return "user";
    const hasura = payload[HASURA_CLAIMS] as Record<string, unknown> | undefined;
    return hasura?.["x-hasura-default-role"] === "user" ? "user" : "anonymous";
  } catch {
    return "anonymous";
  }
}
