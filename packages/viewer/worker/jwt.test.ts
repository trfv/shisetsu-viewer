import { resolveRole } from "@shisetsu-viewer/api/auth/auth0";
import { exportJWK, generateKeyPair, importJWK, jwtVerify, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { signApiToken } from "./jwt.ts";

let signingKeysJson: string;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  const priv = await exportJWK(pair.privateKey);
  priv.kid = "k1";
  priv.alg = "ES256";
  signingKeysJson = JSON.stringify([priv]);
  publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = "k1";
  publicJwk.alg = "ES256";
});

describe("signApiToken", () => {
  it("api が検証できる iss / aud / claim を持つ JWT を返す", async () => {
    const token = await signApiToken(signingKeysJson, "u1", "user");
    const key = await importJWK(publicJwk, "ES256");

    const { payload, protectedHeader } = await jwtVerify(token, key, {
      issuer: "https://app.shisetsudb.com/",
      audience: "shisetsu-api",
      algorithms: ["ES256"],
    });

    expect(protectedHeader.kid).toBe("k1");
    expect(payload.sub).toBe("u1");
    expect(payload["https://app.shisetsudb.com/token/claims"]).toEqual({ role: "user" });
  });

  it("anonymous も同じ形で載る", async () => {
    const token = await signApiToken(signingKeysJson, "u2", "anonymous");
    const key = await importJWK(publicJwk, "ES256");
    const { payload } = await jwtVerify(token, key, {
      issuer: "https://app.shisetsudb.com/",
      audience: "shisetsu-api",
    });
    expect(payload["https://app.shisetsudb.com/token/claims"]).toEqual({ role: "anonymous" });
  });

  it("寿命は 60 秒である", async () => {
    const token = await signApiToken(signingKeysJson, "u1", "user");
    const key = await importJWK(publicJwk, "ES256");
    const { payload } = await jwtVerify(token, key, {
      issuer: "https://app.shisetsudb.com/",
      audience: "shisetsu-api",
    });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(60);
  });

  it("鍵配列の先頭で署名する（2 つ目は使わない）", async () => {
    const other = await generateKeyPair("ES256", { extractable: true });
    const otherPriv = await exportJWK(other.privateKey);
    otherPriv.kid = "k2";
    otherPriv.alg = "ES256";
    const twoKeys = JSON.stringify([JSON.parse(signingKeysJson)[0], otherPriv]);

    const token = await signApiToken(twoKeys, "u1", "user");
    const key = await importJWK(publicJwk, "ES256");
    const { protectedHeader } = await jwtVerify(token, key, {
      issuer: "https://app.shisetsudb.com/",
      audience: "shisetsu-api",
    });
    expect(protectedHeader.kid).toBe("k1");
  });

  it("鍵が空なら例外を投げる", async () => {
    await expect(signApiToken("[]", "u1", "user")).rejects.toThrow(/AUTH_SIGNING_KEYS/);
  });

  it("kid の無い鍵は拒否する", async () => {
    const noKid = JSON.parse(signingKeysJson)[0] as JWK;
    delete noKid.kid;
    await expect(signApiToken(JSON.stringify([noKid]), "u1", "user")).rejects.toThrow(/kid/);
  });
});

// BFF が署名したトークンを api の resolveRole がそのまま受理できることを、
// 実際の公開 JWKS 経由で確かめる。ここが両パッケージ間の契約そのものである。
describe("api の resolveRole との往復", () => {
  const ENV = { AUTH0_DOMAIN: "auth.example", AUTH0_AUDIENCE: "https://api.example/" };

  it("role: user の JWT は user と解決される", async () => {
    const token = await signApiToken(signingKeysJson, "u1", "user");
    const env = { ...ENV, SELF_JWKS_JSON: JSON.stringify({ keys: [publicJwk] }) };
    expect(await resolveRole(token, env)).toBe("user");
  });

  it("role: anonymous の JWT は anonymous と解決される", async () => {
    const token = await signApiToken(signingKeysJson, "u2", "anonymous");
    const env = { ...ENV, SELF_JWKS_JSON: JSON.stringify({ keys: [publicJwk] }) };
    expect(await resolveRole(token, env)).toBe("anonymous");
  });

  it("別の鍵の JWKS では anonymous に倒れる", async () => {
    const other = await generateKeyPair("ES256", { extractable: true });
    const otherPub = await exportJWK(other.publicKey);
    otherPub.kid = "k1";
    otherPub.alg = "ES256";

    const token = await signApiToken(signingKeysJson, "u1", "user");
    const env = { ...ENV, SELF_JWKS_JSON: JSON.stringify({ keys: [otherPub] }) };
    expect(await resolveRole(token, env)).toBe("anonymous");
  });
});
