import { describe, expect, it } from "vitest";

import {
  buildAuthorizeUrl,
  buildLogoutUrl,
  exchangeCode,
  readRole,
  RefreshError,
  refreshSession,
  type Auth0Config,
  type FetchLike,
} from "./auth0.ts";
import { fakeAccessToken } from "./testHelpers.ts";

const config: Auth0Config = {
  domain: "auth.test",
  clientId: "client",
  clientSecret: "secret",
  audience: "https://api.test/",
};

function respond(status: number, body: unknown): FetchLike {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("buildAuthorizeUrl", () => {
  it("Universal Login を飛ばして Google へ直接送り、refresh token を要求する", () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        redirectUri: "https://app.test/auth/callback",
        state: "st",
        challenge: "ch",
      })
    );

    expect(url.origin).toBe("https://auth.test");
    expect(url.pathname).toBe("/authorize");
    expect(url.searchParams.get("connection")).toBe("google-oauth2");
    expect(url.searchParams.get("scope")).toBe("openid offline_access");
    expect(url.searchParams.get("audience")).toBe("https://api.test/");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/auth/callback");
  });
});

describe("buildLogoutUrl", () => {
  it("Auth0 のセッションを消してから戻り先へ返す", () => {
    const url = new URL(buildLogoutUrl(config, "https://app.test/"));

    expect(url.pathname).toBe("/v2/logout");
    expect(url.searchParams.get("client_id")).toBe("client");
    expect(url.searchParams.get("returnTo")).toBe("https://app.test/");
  });
});

describe("exchangeCode", () => {
  it("client secret と PKCE の verifier を付けて交換する", async () => {
    let sent: Record<string, string> = {};
    const fetchImpl: FetchLike = async (_input, init) => {
      sent = JSON.parse(String(init?.body)) as Record<string, string>;
      return new Response(
        JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3600 })
      );
    };

    const session = await exchangeCode(
      config,
      { code: "c", verifier: "v", redirectUri: "https://app.test/auth/callback" },
      fetchImpl
    );

    expect(sent).toMatchObject({
      grant_type: "authorization_code",
      client_secret: "secret",
      code_verifier: "v",
    });
    expect(session.accessToken).toBe("at");
    expect(session.refreshToken).toBe("rt");
    expect(session.expiresAt).toBeGreaterThan(Date.now() / 1000 + 3500);
  });

  it("refresh token が返らなければ失敗にする（offline_access の付け忘れを検出する）", async () => {
    await expect(
      exchangeCode(
        config,
        { code: "c", verifier: "v", redirectUri: "r" },
        respond(200, { access_token: "at", expires_in: 3600 })
      )
    ).rejects.toThrow();
  });
});

describe("refreshSession", () => {
  it("rotation 無効で refresh token が返らなければ、手元のものを使い続ける", async () => {
    const session = await refreshSession(
      config,
      "rt-old",
      respond(200, { access_token: "at-new", expires_in: 3600 })
    );

    expect(session).toMatchObject({ accessToken: "at-new", refreshToken: "rt-old" });
  });

  it("invalid_grant を区別する", async () => {
    const error = await refreshSession(
      config,
      "rt",
      respond(403, { error: "invalid_grant" })
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RefreshError);
    expect((error as RefreshError).kind).toBe("invalid_grant");
  });

  it("Auth0 の障害は unavailable にする", async () => {
    const error = await refreshSession(config, "rt", respond(500, {})).catch((e: unknown) => e);

    expect((error as RefreshError).kind).toBe("unavailable");
  });

  it("通信断も unavailable にする", async () => {
    const error = await refreshSession(config, "rt", async () => {
      throw new TypeError("network");
    }).catch((e: unknown) => e);

    expect((error as RefreshError).kind).toBe("unavailable");
  });
});

describe("readRole", () => {
  const APP = "https://app.shisetsudb.com/token/claims";

  it("role が user なら anonymous ではない", () => {
    expect(readRole(fakeAccessToken({ [APP]: { role: "user" } }))).toEqual({
      anonymous: false,
      trial: false,
    });
  });

  it("role が anonymous なら anonymous", () => {
    expect(readRole(fakeAccessToken({ [APP]: { role: "anonymous" } })).anonymous).toBe(true);
  });

  it("trial を UI 向けに別に返す", () => {
    expect(readRole(fakeAccessToken({ [APP]: { role: "anonymous", trial: true } }))).toEqual({
      anonymous: true,
      trial: true,
    });
  });

  it("カスタムクレームが無ければ Hasura の既定ロールを見る（api の resolveRole と同じ順序）", () => {
    const hasura = "https://hasura.io/jwt/claims";
    expect(
      readRole(fakeAccessToken({ [hasura]: { "x-hasura-default-role": "user" } })).anonymous
    ).toBe(false);
    expect(readRole(fakeAccessToken({})).anonymous).toBe(true);
  });

  it("JWT として読めなければ anonymous に倒す", () => {
    expect(readRole("not-a-jwt")).toEqual({ anonymous: true, trial: false });
  });
});
