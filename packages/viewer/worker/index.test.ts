import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { FetchLike } from "./auth0.ts";
import { createWorker } from "./index.ts";
import { importKeys, seal, unseal, type Session } from "./session.ts";
import { fakeAccessToken } from "./testHelpers.ts";

const APP = "https://app.shisetsudb.com/token/claims";
const USER_TOKEN = fakeAccessToken({ [APP]: { role: "user" } });

interface Call {
  url: string;
  body: Record<string, string>;
}

function fakeAuth0(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (input, init) => {
    const record = {
      url: typeof input === "string" ? input : input.url,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, string>,
    };
    calls.push(record);
    return handler(record);
  };
  return { calls, worker: createWorker({ fetch }) };
}

const unreachable = () => fakeAuth0(() => new Response("unexpected", { status: 599 }));

// miniflare のレート制限はテスト間で状態を共有するため、呼び出しごとに別 IP を名乗らせる。
let clientSeq = 0;
function send(worker: ReturnType<typeof createWorker>, request: Request) {
  clientSeq++;
  const headers = new Headers(request.headers);
  headers.set("CF-Connecting-IP", `203.0.113.${clientSeq % 250}`);
  headers.set("X-Seq", String(clientSeq));
  return worker.fetch(new Request(request, { headers }), env, createExecutionContext());
}

async function keys() {
  return await importKeys(env.SESSION_KEYS);
}

async function sessionCookie(overrides: Partial<Session> = {}) {
  const session: Session = {
    accessToken: USER_TOKEN,
    refreshToken: "rt",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  return `__Host-session=${await seal(await keys(), "__Host-session", session)}`;
}

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function cookieValue(response: Response, name: string): string | undefined {
  for (const cookie of setCookies(response)) {
    if (cookie.startsWith(`${name}=`)) return cookie.slice(name.length + 1).split(";")[0];
  }
  return undefined;
}

describe("/auth/login", () => {
  it("Google へ直接送る authorize URL へ 302 し、state を暗号化 Cookie に置く", async () => {
    const { worker } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/auth/login?redirect=%2Freservation%3Fa%3D1")
    );

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location") ?? "");
    expect(location.origin).toBe("https://auth.shisetsudb.com");
    expect(location.searchParams.get("connection")).toBe("google-oauth2");
    expect(location.searchParams.get("redirect_uri")).toBe("https://app.test/auth/callback");

    const raw = cookieValue(response, "__Host-oauth") ?? "";
    const saved = await unseal<{ state: string; redirect: string }>(
      await keys(),
      "__Host-oauth",
      raw
    );
    expect(saved?.state).toBe(location.searchParams.get("state"));
    expect(saved?.redirect).toBe("/reservation?a=1");
  });

  it.each(["//evil.example/", "https://evil.example/", "/\\evil.example/"])(
    "外部オリジンへの戻り先 %s を / に落とす",
    async (redirect) => {
      const { worker } = unreachable();
      const response = await send(
        worker,
        new Request(`https://app.test/auth/login?redirect=${encodeURIComponent(redirect)}`)
      );
      const raw = cookieValue(response, "__Host-oauth") ?? "";
      const saved = await unseal<{ redirect: string }>(await keys(), "__Host-oauth", raw);

      expect(saved?.redirect).toBe("/");
    }
  );
});

async function startLogin(worker: ReturnType<typeof createWorker>) {
  const response = await send(
    worker,
    new Request("https://app.test/auth/login?redirect=/institution")
  );
  const state = new URL(response.headers.get("Location") ?? "").searchParams.get("state");
  return { state, cookie: `__Host-oauth=${cookieValue(response, "__Host-oauth")}` };
}

describe("/auth/callback", () => {
  it("code を交換してセッションを発行し、元のパスへ戻す", async () => {
    const { worker, calls } = fakeAuth0(
      () =>
        new Response(
          JSON.stringify({ access_token: USER_TOKEN, refresh_token: "rt", expires_in: 86400 })
        )
    );
    const { state, cookie } = await startLogin(worker);

    const response = await send(
      worker,
      new Request(`https://app.test/auth/callback?code=c&state=${state}`, {
        headers: { Cookie: cookie },
      })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/institution");
    expect(calls[0]?.url).toBe("https://auth.shisetsudb.com/oauth/token");
    expect(calls[0]?.body["code_verifier"]).toBeTruthy();

    const session = await unseal<Session>(
      await keys(),
      "__Host-session",
      cookieValue(response, "__Host-session") ?? ""
    );
    expect(session?.refreshToken).toBe("rt");
    expect(cookieValue(response, "__Host-oauth")).toBe("");
    expect(setCookies(response).join("\n")).toContain("Max-Age=31536000");
  });

  it("state が一致しなければ交換しない", async () => {
    const { worker, calls } = unreachable();
    const { cookie } = await startLogin(worker);

    const response = await send(
      worker,
      new Request("https://app.test/auth/callback?code=c&state=forged", {
        headers: { Cookie: cookie },
      })
    );

    expect(response.headers.get("Location")).toBe("/?auth_error=state_mismatch");
    expect(calls).toHaveLength(0);
  });

  it("oauth Cookie が無ければ失敗にする", async () => {
    const { worker } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/auth/callback?code=c&state=s")
    );

    expect(response.headers.get("Location")).toBe("/?auth_error=state_missing");
  });

  it("Auth0 がエラーを返したら失敗にする", async () => {
    const { worker } = unreachable();
    const { state, cookie } = await startLogin(worker);
    const response = await send(
      worker,
      new Request(`https://app.test/auth/callback?error=access_denied&state=${state}`, {
        headers: { Cookie: cookie },
      })
    );

    expect(response.headers.get("Location")).toBe("/?auth_error=auth0");
  });

  it("交換に失敗したら失敗にする", async () => {
    const { worker } = fakeAuth0(() => new Response("{}", { status: 401 }));
    const { state, cookie } = await startLogin(worker);
    const response = await send(
      worker,
      new Request(`https://app.test/auth/callback?code=c&state=${state}`, {
        headers: { Cookie: cookie },
      })
    );

    expect(response.headers.get("Location")).toBe("/?auth_error=exchange_failed");
    expect(cookieValue(response, "__Host-session")).toBeUndefined();
  });
});

describe("/auth/me", () => {
  it("Cookie が無ければ未ログイン", async () => {
    const { worker } = unreachable();
    const response = await send(worker, new Request("https://app.test/auth/me"));

    expect(await response.json()).toEqual({ authenticated: false, anonymous: true, trial: false });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("有効なセッションならアクセストークンのクレームからロールを返す", async () => {
    const { worker, calls } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/auth/me", { headers: { Cookie: await sessionCookie() } })
    );

    expect(await response.json()).toEqual({ authenticated: true, anonymous: false, trial: false });
    expect(calls).toHaveLength(0);
  });

  it("壊れた Cookie は消して未ログインにする", async () => {
    const { worker } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/auth/me", { headers: { Cookie: "__Host-session=garbage" } })
    );

    expect((await response.json()) as { authenticated: boolean }).toMatchObject({
      authenticated: false,
    });
    expect(cookieValue(response, "__Host-session")).toBe("");
  });

  it("失効間際なら refresh し、新しい Cookie を返す", async () => {
    const refreshed = fakeAccessToken({ [APP]: { role: "anonymous", trial: true } });
    const { worker, calls } = fakeAuth0(
      () => new Response(JSON.stringify({ access_token: refreshed, expires_in: 86400 }))
    );
    const response = await send(
      worker,
      new Request("https://app.test/auth/me", {
        headers: { Cookie: await sessionCookie({ expiresAt: Math.floor(Date.now() / 1000) + 30 }) },
      })
    );

    expect(calls[0]?.body).toMatchObject({ grant_type: "refresh_token", refresh_token: "rt" });
    expect(await response.json()).toEqual({ authenticated: true, anonymous: true, trial: true });
    const session = await unseal<Session>(
      await keys(),
      "__Host-session",
      cookieValue(response, "__Host-session") ?? ""
    );
    expect(session).toMatchObject({ accessToken: refreshed, refreshToken: "rt" });
  });

  it("invalid_grant なら Cookie を消して未ログインにする", async () => {
    const { worker } = fakeAuth0(
      () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 403 })
    );
    const response = await send(
      worker,
      new Request("https://app.test/auth/me", {
        headers: { Cookie: await sessionCookie({ expiresAt: 0 }) },
      })
    );

    expect((await response.json()) as { authenticated: boolean }).toMatchObject({
      authenticated: false,
    });
    expect(cookieValue(response, "__Host-session")).toBe("");
  });

  it("Auth0 の障害なら 503 にして Cookie を残す", async () => {
    const { worker } = fakeAuth0(() => new Response("{}", { status: 500 }));
    const response = await send(
      worker,
      new Request("https://app.test/auth/me", {
        headers: { Cookie: await sessionCookie({ expiresAt: 0 }) },
      })
    );

    expect(response.status).toBe(503);
    expect(setCookies(response)).toHaveLength(0);
  });

  it("レート制限の対象にしない", async () => {
    const { worker } = unreachable();
    const request = new Request("https://app.test/auth/me", {
      headers: { "CF-Connecting-IP": "198.51.100.1" },
    });
    const statuses = await Promise.all(
      Array.from({ length: 30 }, () => worker.fetch(request.clone(), env, createExecutionContext()))
    ).then((responses) => responses.map((r) => r.status));

    expect(statuses.every((status) => status === 200)).toBe(true);
  });
});

describe("/auth/logout", () => {
  it("refresh token を revoke し、Cookie を消し、Auth0 のログアウト URL を返す", async () => {
    const { worker, calls } = fakeAuth0(() => new Response("", { status: 200 }));
    const response = await send(
      worker,
      new Request("https://app.test/auth/logout", {
        method: "POST",
        headers: { Cookie: await sessionCookie() },
      })
    );

    expect(calls[0]?.url).toBe("https://auth.shisetsudb.com/oauth/revoke");
    expect(calls[0]?.body["token"]).toBe("rt");
    expect(cookieValue(response, "__Host-session")).toBe("");
    const { logoutUrl } = (await response.json()) as { logoutUrl: string };
    expect(new URL(logoutUrl).searchParams.get("returnTo")).toBe("https://app.test/");
  });

  it("revoke に失敗しても Cookie は消す", async () => {
    const { worker } = fakeAuth0(() => new Response("", { status: 500 }));
    const response = await send(
      worker,
      new Request("https://app.test/auth/logout", {
        method: "POST",
        headers: { Cookie: await sessionCookie() },
      })
    );

    expect(response.status).toBe(200);
    expect(cookieValue(response, "__Host-session")).toBe("");
  });

  it("GET では受けない（他サイトのリンクで強制ログアウトさせない）", async () => {
    const { worker } = unreachable();
    const response = await send(worker, new Request("https://app.test/auth/logout"));

    expect(response.status).toBe(404);
  });
});

describe("/api/*", () => {
  it("ログイン中はアクセストークンを付けて api へ転送する", async () => {
    const { worker } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/api/v1/reservations/search", {
        headers: { Cookie: await sessionCookie() },
      })
    );

    expect(await response.json()).toEqual({
      path: "/v1/reservations/search",
      authorization: `Bearer ${USER_TOKEN}`,
    });
  });

  it("未ログインなら Authorization を付けずに転送する", async () => {
    const { worker } = unreachable();
    const response = await send(worker, new Request("https://app.test/api/v1/institutions"));

    expect(((await response.json()) as { authorization: string | null }).authorization).toBeNull();
  });

  it("refresh したら api の応答に新しい Cookie を付ける", async () => {
    const refreshed = fakeAccessToken({ [APP]: { role: "user" } });
    const { worker } = fakeAuth0(
      () => new Response(JSON.stringify({ access_token: refreshed, expires_in: 86400 }))
    );
    const response = await send(
      worker,
      new Request("https://app.test/api/v1/reservations/search", {
        headers: { Cookie: await sessionCookie({ expiresAt: 0 }) },
      })
    );

    expect(((await response.json()) as { authorization: string }).authorization).toBe(
      `Bearer ${refreshed}`
    );
    expect(cookieValue(response, "__Host-session")).toBeTruthy();
  });

  it("Auth0 の障害で refresh できなければ 503 にする", async () => {
    const { worker } = fakeAuth0(() => new Response("{}", { status: 500 }));
    const response = await send(
      worker,
      new Request("https://app.test/api/v1/reservations/search", {
        headers: { Cookie: await sessionCookie({ expiresAt: 0 }) },
      })
    );

    expect(response.status).toBe(503);
  });

  it("SESSION_KEYS が無くても、Cookie を持たない閲覧は通す", async () => {
    const { worker } = unreachable();
    const broken = { ...env, SESSION_KEYS: undefined as unknown as string };
    const response = await worker.fetch(
      new Request("https://app.test/api/v1/institutions"),
      broken,
      createExecutionContext()
    );

    expect(response.status).toBe(200);
  });

  it("許可外のパスは 404", async () => {
    const { worker } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/api/v1/admin/reservations", {
        headers: { Cookie: await sessionCookie() },
      })
    );

    expect(response.status).toBe(404);
  });

  it("GET 以外は 405", async () => {
    const { worker } = unreachable();
    const response = await send(
      worker,
      new Request("https://app.test/api/v1/institutions", { method: "POST" })
    );

    expect(response.status).toBe(405);
  });
});
