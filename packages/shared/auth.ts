// Auth0 のアクセストークンに載るクレームの解釈。api（認可）と viewer の BFF（UI 向け）が共有する。
// クレームを作る側は auth0PostLogin.cjs（Auth0 の Post Login Action）。

export const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";
// Hasura 時代の名前空間。app クレームを載せていないトークンのための後方互換。
export const HASURA_CLAIMS = "https://hasura.io/jwt/claims";

export type Role = "anonymous" | "user";

export type ClaimsInfo = {
  role: Role;
  // トライアル利用者。認可には使わず、UI が予約タブを閉じるのに使う。
  trial: boolean;
};

/**
 * トークンのペイロードからロールを読む。署名の検証は呼び出し側の責任。
 * app クレームに role があればそれに従い、無ければ Hasura の既定ロールを見る。
 */
export function readClaims(payload: Record<string, unknown>): ClaimsInfo {
  const app = payload[APP_CLAIMS] as { role?: unknown; trial?: unknown } | undefined;
  const hasura = payload[HASURA_CLAIMS] as Record<string, unknown> | undefined;
  // app の role は anonymous 以外をすべて user とみなす（従来の api と同じ）
  const user = app?.role ? app.role !== "anonymous" : hasura?.["x-hasura-default-role"] === "user";
  return { role: user ? "user" : "anonymous", trial: app?.trial === true };
}
