import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  importJWK,
  type JWK,
  type JWTVerifyGetKey,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { resolveRole, SELF_AUDIENCE, SELF_ISSUER } from "../src/auth/auth0.ts";

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
    expect(await resolveRole(token, ENV, { auth0: getKey })).toBe("user");
  });

  it("x-hasura-default-role: anonymous → anonymous", async () => {
    const token = await sign({
      "https://hasura.io/jwt/claims": { "x-hasura-default-role": "anonymous" },
    });
    expect(await resolveRole(token, ENV, { auth0: getKey })).toBe("anonymous");
  });

  it("カスタムクレーム role: user → user", async () => {
    const token = await sign({ "https://app.shisetsudb.com/token/claims": { role: "user" } });
    expect(await resolveRole(token, ENV, { auth0: getKey })).toBe("user");
  });

  it("trial: true は role より優先して anonymous", async () => {
    const token = await sign({
      "https://app.shisetsudb.com/token/claims": { role: "user", trial: true },
    });
    expect(await resolveRole(token, ENV, { auth0: getKey })).toBe("anonymous");
  });

  it("audience 不一致 → anonymous", async () => {
    const token = await sign(
      { "https://hasura.io/jwt/claims": { "x-hasura-default-role": "user" } },
      {
        aud: "https://wrong/",
      }
    );
    expect(await resolveRole(token, ENV, { auth0: getKey })).toBe("anonymous");
  });

  it("期限切れ → anonymous", async () => {
    const token = await sign(
      { "https://hasura.io/jwt/claims": { "x-hasura-default-role": "user" } },
      { expired: true }
    );
    expect(await resolveRole(token, ENV, { auth0: getKey })).toBe("anonymous");
  });

  it("トークン無し → anonymous", async () => {
    expect(await resolveRole(undefined, ENV, { auth0: getKey })).toBe("anonymous");
  });

  it("壊れた文字列 → anonymous", async () => {
    expect(await resolveRole("not.a.jwt", ENV, { auth0: getKey })).toBe("anonymous");
  });
});

describe("自前 issuer", () => {
  let selfPrivate: CryptoKey;
  let selfGetKey: JWTVerifyGetKey;
  let selfPublicJwk: JWK;

  beforeAll(async () => {
    const pair = await generateKeyPair("ES256", { extractable: true });
    selfPrivate = pair.privateKey;
    const pubJwk = await exportJWK(pair.publicKey);
    pubJwk.kid = "self-key";
    pubJwk.alg = "ES256";
    selfPublicJwk = pubJwk;
    const publicKey = await importJWK(pubJwk, "ES256");
    selfGetKey = (() => publicKey) as unknown as JWTVerifyGetKey;
  });

  async function signSelf(role: string) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ "https://app.shisetsudb.com/token/claims": { role } })
      .setProtectedHeader({ alg: "ES256", kid: "self-key" })
      .setIssuer(SELF_ISSUER)
      .setAudience(SELF_AUDIENCE)
      .setSubject("u1")
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(selfPrivate);
  }

  it("自前 issuer の role: user → user", async () => {
    const token = await signSelf("user");
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("user");
  });

  it("自前 issuer の role: anonymous → anonymous", async () => {
    const token = await signSelf("anonymous");
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("anonymous");
  });

  it("未知の issuer は anonymous", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: "self-key" })
      .setIssuer("https://evil.example/")
      .setAudience(SELF_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(selfPrivate);
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("anonymous");
  });

  it("JWT として解釈できない文字列は anonymous", async () => {
    expect(await resolveRole("not-a-jwt", ENV, { self: selfGetKey })).toBe("anonymous");
  });

  it("SELF_JWKS_JSON を差し替えると新しい鍵で検証する（キャッシュが env を無視しない）", async () => {
    const otherPair = await generateKeyPair("ES256", { extractable: true });
    const otherPub = await exportJWK(otherPair.publicKey);
    otherPub.kid = "self-key";
    otherPub.alg = "ES256";

    const token = await signSelf("user");
    const correct = { ...ENV, SELF_JWKS_JSON: JSON.stringify({ keys: [selfPublicJwk] }) };
    const wrong = { ...ENV, SELF_JWKS_JSON: JSON.stringify({ keys: [otherPub] }) };

    // 先に正しい鍵で通してキャッシュを暖める
    expect(await resolveRole(token, correct)).toBe("user");
    // 別の鍵に差し替えたら通らなくなる
    expect(await resolveRole(token, wrong)).toBe("anonymous");
    // 戻せばまた通る
    expect(await resolveRole(token, correct)).toBe("user");
  });

  it("自前 issuer なのに Auth0 の鍵で署名されていれば anonymous", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ "https://app.shisetsudb.com/token/claims": { role: "user" } })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(SELF_ISSUER)
      .setAudience(SELF_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey);
    expect(await resolveRole(token, ENV, { self: selfGetKey })).toBe("anonymous");
  });
});
