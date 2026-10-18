import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, it } from "node:test";

import { APP_CLAIMS, readClaims } from "./auth.ts";

type Action = {
  onExecutePostLogin: (event: unknown, api: unknown) => Promise<void>;
};
const { onExecutePostLogin } = createRequire(import.meta.url)("./auth0PostLogin.cjs") as Action;

type Options = {
  loginsCount?: number;
  appMetadata?: Record<string, unknown>;
  refresh?: boolean;
};

async function run({ loginsCount = 5, appMetadata = {}, refresh = false }: Options) {
  const appMetadataSet: Record<string, unknown> = {};
  const accessToken: Record<string, unknown> = {};
  const idToken: Record<string, unknown> = {};
  const event = {
    stats: { logins_count: loginsCount },
    transaction: { protocol: refresh ? "oauth2-refresh-token" : "oidc-basic-profile" },
    user: {
      user_id: "google-oauth2|1",
      given_name: "Taro",
      family_name: "Yamada",
      app_metadata: appMetadata,
    },
    secrets: { TOKEN: "test-token", CHANNEL: "C0" },
  };
  const api = {
    user: { setAppMetadata: (k: string, v: unknown) => (appMetadataSet[k] = v) },
    accessToken: { setCustomClaim: (k: string, v: unknown) => (accessToken[k] = v) },
    idToken: { setCustomClaim: (k: string, v: unknown) => (idToken[k] = v) },
  };
  await onExecutePostLogin(event, api);
  return { appMetadataSet, accessToken, idToken };
}

let notified: number;
let slackResponse: () => Promise<Response>;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  notified = 0;
  slackResponse = async () => Response.json({ ok: true });
  globalThis.fetch = async () => {
    notified++;
    return slackResponse();
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("auth0PostLogin", () => {
  it("初回ログインは user かつ trial にし、Slack に通知する", async () => {
    const { appMetadataSet, accessToken } = await run({ loginsCount: 1 });

    assert.deepEqual(appMetadataSet, { role: "user", trial: true });
    assert.deepEqual(readClaims(accessToken), { role: "user", trial: true });
    assert.equal(notified, 1);
  });

  it("app_metadata の role と trial をアクセストークンに載せる", async () => {
    const { accessToken, idToken } = await run({ appMetadata: { role: "user", trial: false } });

    assert.deepEqual(readClaims(accessToken), { role: "user", trial: false });
    assert.deepEqual(idToken, {});
    assert.equal(notified, 0);
  });

  it("role が未設定なら anonymous にして通知する", async () => {
    const { accessToken } = await run({});

    assert.equal(readClaims(accessToken).role, "anonymous");
    assert.equal(notified, 1);
  });

  it("refresh では通知せず、初回ログインの扱いもしない", async () => {
    const { appMetadataSet, accessToken } = await run({
      loginsCount: 1,
      refresh: true,
      appMetadata: { role: "user", trial: true },
    });

    assert.deepEqual(appMetadataSet, {});
    assert.deepEqual(accessToken[APP_CLAIMS], { role: "user", trial: true });
    assert.equal(notified, 0);
  });

  it("Slack が失敗してもログインを止めない", async () => {
    slackResponse = async () => {
      throw new TypeError("network");
    };
    const { accessToken } = await run({ loginsCount: 1 });
    assert.equal(readClaims(accessToken).role, "user");

    slackResponse = async () => Response.json({ ok: false, error: "channel_not_found" });
    await run({ loginsCount: 1 });
  });
});
