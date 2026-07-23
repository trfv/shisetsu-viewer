import { SignJWT, exportJWK, generateKeyPair, importJWK, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { resolveRole } from "../src/auth/auth0.ts";

const ENV = { AUTH0_DOMAIN: "trfv.jp.auth0.com", AUTH0_AUDIENCE: "https://api.example/" };
const ISSUER = `https://${ENV.AUTH0_DOMAIN}/`;

let privateKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const pubJwk = await exportJWK(pair.publicKey);
  pubJwk.kid = "test-key";
  pubJwk.alg = "RS256";
  // ローカル JWKS を getKey として注入する（ネットワーク不要）
  const publicKey = await importJWK(pubJwk, "RS256");
  getKey = (() => publicKey) as unknown as JWTVerifyGetKey;
});

async function sign(claims: Record<string, unknown>, opts?: { aud?: string; expired?: boolean }) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(opts?.aud ?? ENV.AUTH0_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(opts?.expired ? now - 60 : now + 3600)
    .sign(privateKey);
}

describe("resolveRole", () => {
  it("x-hasura-default-role: user → user", async () => {
    const token = await sign({
      "https://hasura.io/jwt/claims": { "x-hasura-default-role": "user" },
    });
    expect(await resolveRole(token, ENV, getKey)).toBe("user");
  });

  it("x-hasura-default-role: anonymous → anonymous", async () => {
    const token = await sign({
      "https://hasura.io/jwt/claims": { "x-hasura-default-role": "anonymous" },
    });
    expect(await resolveRole(token, ENV, getKey)).toBe("anonymous");
  });

  it("カスタムクレーム role: user → user", async () => {
    const token = await sign({ "https://app.shisetsudb.com/token/claims": { role: "user" } });
    expect(await resolveRole(token, ENV, getKey)).toBe("user");
  });

  it("trial: true は role より優先して anonymous", async () => {
    const token = await sign({
      "https://app.shisetsudb.com/token/claims": { role: "user", trial: true },
    });
    expect(await resolveRole(token, ENV, getKey)).toBe("anonymous");
  });

  it("audience 不一致 → anonymous", async () => {
    const token = await sign(
      { "https://hasura.io/jwt/claims": { "x-hasura-default-role": "user" } },
      {
        aud: "https://wrong/",
      }
    );
    expect(await resolveRole(token, ENV, getKey)).toBe("anonymous");
  });

  it("期限切れ → anonymous", async () => {
    const token = await sign(
      { "https://hasura.io/jwt/claims": { "x-hasura-default-role": "user" } },
      { expired: true }
    );
    expect(await resolveRole(token, ENV, getKey)).toBe("anonymous");
  });

  it("トークン無し → anonymous", async () => {
    expect(await resolveRole(undefined, ENV, getKey)).toBe("anonymous");
  });

  it("壊れた文字列 → anonymous", async () => {
    expect(await resolveRole("not.a.jwt", ENV, getKey)).toBe("anonymous");
  });
});
