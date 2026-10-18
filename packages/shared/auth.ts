// クレームを作る側は auth0PostLogin.cjs（Auth0 の Post Login Action）

export const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";
// app クレームを載せていないトークンのために残す
export const HASURA_CLAIMS = "https://hasura.io/jwt/claims";

export type Role = "anonymous" | "user";

export type ClaimsInfo = {
  role: Role;
  // 認可には使わない。UI が予約タブを閉じるのに使う
  trial: boolean;
};

/** 署名の検証は呼び出し側の責任 */
export function readClaims(payload: Record<string, unknown>): ClaimsInfo {
  const app = payload[APP_CLAIMS] as { role?: unknown; trial?: unknown } | undefined;
  const hasura = payload[HASURA_CLAIMS] as Record<string, unknown> | undefined;
  const user = app?.role ? app.role !== "anonymous" : hasura?.["x-hasura-default-role"] === "user";
  return { role: user ? "user" : "anonymous", trial: app?.trial === true };
}
