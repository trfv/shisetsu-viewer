import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import worker from "./worker.ts";

const ORIGIN = "https://mcp.example.com";
const CLIENT_ID = "https://client.example/metadata.json";
const CLIENT_REDIRECT = "https://client.example/cb";

/** OAuthProvider が使う範囲だけを満たす KV */
function createKv() {
  const store = new Map<string, string>();
  return {
    async get(key: string, options?: "json" | "text" | { type?: string }) {
      const value = store.get(key);
      if (value === undefined) return null;
      const type = typeof options === "string" ? options : options?.type;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options: { prefix?: string } = {}) {
      const keys = [...store.keys()]
        .filter((name) => name.startsWith(options.prefix ?? ""))
        .map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");

function fakeJwt(sub: string): string {
  return `${encode({ alg: "none" })}.${encode({ sub })}.sig`;
}

const auth0TokenRequests: Record<string, unknown>[] = [];

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url === CLIENT_ID) {
        return Response.json({
          client_id: CLIENT_ID,
          client_name: "Evil <script>",
          redirect_uris: [CLIENT_REDIRECT],
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
        });
      }
      if (url === "https://auth0.example/oauth/token") {
        auth0TokenRequests.push(JSON.parse(String(init?.body)));
        return Response.json({ access_token: fakeJwt("auth0|user-1"), refresh_token: "rt" });
      }
      throw new Error(`unexpected fetch: ${url}`);
    })
  );
}

const env = () => ({
  DB: {},
  AUTH0_DOMAIN: "auth0.example",
  AUTH0_CLIENT_ID: "auth0-client",
  AUTH0_CLIENT_SECRET: "auth0-secret",
  AUTH0_AUDIENCE: "https://api.example",
  OAUTH_KV: createKv(),
});

const ctx = () => ({ waitUntil() {}, passThroughOnException() {}, props: {} });

/** Set-Cookie を次のリクエストの Cookie ヘッダに積む */
function cookiesFrom(response: Response, jar = new Map<string, string>()) {
  for (const line of response.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const [name, value] = pair!.split("=");
    if (value) jar.set(name!, value);
    else jar.delete(name!);
  }
  return jar;
}
const cookieHeader = (jar: Map<string, string>) =>
  [...jar].map(([name, value]) => `${name}=${value}`).join("; ");

const authorizeUrl = () => {
  const url = new URL(`${ORIGIN}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", CLIENT_REDIRECT);
  url.searchParams.set("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", "client-state");
  url.searchParams.set("resource", `${ORIGIN}/mcp`);
  return url.toString();
};

type TestEnv = ReturnType<typeof env>;
const call = (request: Request, e: TestEnv) =>
  // oxlint-disable-next-line typescript/no-explicit-any
  worker.fetch(request, e as any, ctx() as any);

async function openConsent(e: TestEnv) {
  const response = await call(new Request(authorizeUrl()), e);
  const html = await response.text();
  const handle = /name="handle" value="([^"]+)"/.exec(html)?.[1];
  return { response, html, handle: handle!, jar: cookiesFrom(response) };
}

function postConsent(handle: string, decision: string, jar?: Map<string, string>) {
  return new Request(`${ORIGIN}/authorize`, {
    method: "POST",
    headers: jar ? { Cookie: cookieHeader(jar) } : {},
    body: new URLSearchParams({ handle, decision }),
  });
}

describe("worker の認可フロー", () => {
  beforeEach(() => {
    vi.stubGlobal("Cloudflare", { compatibilityFlags: { global_fetch_strictly_public: true } });
    stubFetch();
    auth0TokenRequests.length = 0;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /authorize は Auth0 へ飛ばさず同意画面を返す", async () => {
    const e = env();
    const { response, html, handle } = await openConsent(e);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.getSetCookie().some((c) => c.startsWith("__Host-"))).toBe(true);
    expect(handle).toBeTruthy();
    // CIMD の発行ドメインと送り先を見せ、クライアントが名乗る名前はエスケープする
    expect(html).toContain("client.example");
    expect(html).toContain("Evil &#60;script&#62;");
    expect(html).not.toContain("<script>");
  });

  it("cookie を持たない POST（別サイトからの送信）は拒否する", async () => {
    const e = env();
    const { handle } = await openConsent(e);
    const response = await call(postConsent(handle, "approve"), e);
    expect(response.status).toBe(400);
  });

  it("拒否するとクライアントへ access_denied を返す", async () => {
    const e = env();
    const { handle, jar } = await openConsent(e);
    const response = await call(postConsent(handle, "deny", jar), e);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location")!);
    expect(location.origin + location.pathname).toBe(CLIENT_REDIRECT);
    expect(location.searchParams.get("error")).toBe("access_denied");
    expect(location.searchParams.get("state")).toBe("client-state");
  });

  it("承認すると PKCE 付きで Auth0 へ送り、callback でクライアントへ code を返す", async () => {
    const e = env();
    const { handle, jar } = await openConsent(e);

    const approved = await call(postConsent(handle, "approve", jar), e);
    expect(approved.status).toBe(302);
    const auth0 = new URL(approved.headers.get("Location")!);
    expect(auth0.origin).toBe("https://auth0.example");
    expect(auth0.searchParams.get("code_challenge_method")).toBe("S256");
    expect(auth0.searchParams.get("code_challenge")).toBeTruthy();
    const state = auth0.searchParams.get("state")!;
    // Auth0 の state は認可リクエストそのものではない
    expect(() => JSON.parse(atob(state))).toThrow();
    cookiesFrom(approved, jar);

    const callbackUrl = `${ORIGIN}/callback?code=auth0-code&state=${encodeURIComponent(state)}`;

    // 別のブラウザ（cookie なし）で callback を踏ませても通らない
    const stolen = await call(new Request(callbackUrl), e);
    expect(stolen.status).toBe(400);

    const done = await call(
      new Request(callbackUrl, { headers: { Cookie: cookieHeader(jar) } }),
      e
    );
    expect(done.status).toBe(302);
    const back = new URL(done.headers.get("Location")!);
    expect(back.origin + back.pathname).toBe(CLIENT_REDIRECT);
    expect(back.searchParams.get("code")).toBeTruthy();
    expect(back.searchParams.get("state")).toBe("client-state");
    expect(back.searchParams.get("iss")).toBe(ORIGIN);
    expect(auth0TokenRequests[0]?.["code_verifier"]).toBeTruthy();
  });

  it("DCR のエンドポイントは開けていない", async () => {
    const response = await call(
      new Request(`${ORIGIN}/oauth/register`, { method: "POST", body: "{}" }),
      env()
    );
    expect(response.status).toBe(404);
  });
});
