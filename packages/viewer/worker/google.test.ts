import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { buildAuthorizeUrl, exchangeCode, verifyIdToken, type FetchImpl } from "./google.ts";

let privateKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "g1";
  pub.alg = "RS256";
  const publicKey = await importJWK(pub, "RS256");
  getKey = (() => publicKey) as unknown as JWTVerifyGetKey;
});

/** 呼び出しを記録しつつ固定応答を返す fetch。実際の通信は起きない。 */
function stubFetch(
  status: number,
  body: unknown,
  capture?: { url?: string; init?: RequestInit }
): FetchImpl {
  return async (url, init) => {
    if (capture) {
      capture.url = url;
      capture.init = init;
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

async function signIdToken(claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "g1" })
    .setIssuer("https://accounts.google.com")
    .setAudience("test-client-id")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);
}

describe("buildAuthorizeUrl", () => {
  it("必要なクエリを全て載せる", () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: "cid",
        redirectUri: "https://app.test/auth/callback",
        state: "st",
        challenge: "ch",
      })
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/auth/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("exchangeCode", () => {
  const PARAMS = {
    clientId: "cid",
    clientSecret: "secret",
    redirectUri: "https://app.test/auth/callback",
    code: "code-1",
    verifier: "verifier-1",
  };

  it("id_token を取り出す", async () => {
    const idToken = await exchangeCode(
      PARAMS,
      stubFetch(200, { id_token: "dummy-id-token", access_token: "ignored" })
    );
    expect(idToken).toBe("dummy-id-token");
  });

  it("token endpoint へ PKCE と client_secret を含む form を POST する", async () => {
    const capture: { url?: string; init?: RequestInit } = {};
    await exchangeCode(PARAMS, stubFetch(200, { id_token: "t" }, capture));

    expect(capture.url).toBe("https://oauth2.googleapis.com/token");
    expect(capture.init?.method).toBe("POST");
    const body = new URLSearchParams(String(capture.init?.body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code-1");
    expect(body.get("code_verifier")).toBe("verifier-1");
    expect(body.get("client_secret")).toBe("secret");
    expect(body.get("redirect_uri")).toBe("https://app.test/auth/callback");
  });

  it("エラー応答なら例外を投げる", async () => {
    await expect(exchangeCode(PARAMS, stubFetch(400, { error: "invalid_grant" }))).rejects.toThrow(
      /invalid_grant/
    );
  });

  it("200 でも id_token が無ければ例外", async () => {
    await expect(
      exchangeCode(PARAMS, stubFetch(200, { access_token: "only-access" }))
    ).rejects.toThrow();
  });
});

describe("verifyIdToken", () => {
  it("sub と email と email_verified を返す", async () => {
    const token = await signIdToken({
      sub: "google-sub-1",
      email: "a@example.com",
      email_verified: true,
    });

    expect(await verifyIdToken(token, "test-client-id", getKey)).toEqual({
      sub: "google-sub-1",
      email: "a@example.com",
      emailVerified: true,
    });
  });

  it("email_verified が無ければ false", async () => {
    const token = await signIdToken({ sub: "s", email: "a@example.com" });
    expect((await verifyIdToken(token, "test-client-id", getKey)).emailVerified).toBe(false);
  });

  it("audience が違えば例外", async () => {
    const token = await signIdToken({ sub: "s", email: "a@example.com", email_verified: true });
    await expect(verifyIdToken(token, "other-client", getKey)).rejects.toThrow();
  });

  it("email が無ければ例外", async () => {
    const token = await signIdToken({ sub: "s", email_verified: true });
    await expect(verifyIdToken(token, "test-client-id", getKey)).rejects.toThrow(/email/);
  });
});
