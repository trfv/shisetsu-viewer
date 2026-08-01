import { SELF_AUDIENCE, SELF_ISSUER } from "@shisetsu-viewer/api/auth/auth0";
import { importJWK, SignJWT, type JWK } from "jose";

const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";

/**
 * api へ渡す寿命 60 秒の JWT を署名する。
 * signingKeysJson は秘密 JWK の配列。先頭が署名鍵で、残りは検証側のローテーション用に存在する。
 *
 * role は実効ロール（anonymous / user）であり、保存ロールではない。
 * トライアル期限の判定は呼び出し側で済ませておく。
 */
export async function signApiToken(
  signingKeysJson: string,
  userId: string,
  role: string
): Promise<string> {
  const keys = JSON.parse(signingKeysJson) as JWK[];
  const jwk = keys[0];
  if (!jwk) throw new Error("AUTH_SIGNING_KEYS が空です");
  // kid が無いとローテーション時に api 側が鍵を選べない。生成時点で必ず付ける。
  if (!jwk.kid) throw new Error("AUTH_SIGNING_KEYS の先頭鍵に kid がありません");

  const key = await importJWK(jwk, "ES256");
  return await new SignJWT({ [APP_CLAIMS]: { role } })
    .setProtectedHeader({ alg: "ES256", kid: jwk.kid })
    .setIssuer(SELF_ISSUER)
    .setAudience(SELF_AUDIENCE)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key);
}
