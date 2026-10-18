import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deployPostLoginAction, type DeployConfig } from "./auth0Deploy.ts";

type Call = { method: string; path: string; body: Record<string, unknown> | undefined };

type FakeOptions = {
  code?: string;
  runtime?: string;
  allChangesDeployed?: boolean;
  bindings?: number;
  // PATCH 後に GET が返す status の列
  statuses?: string[];
};

// Management API を模す。受けた呼び出しを記録する
function fakeAuth0({
  code = "old",
  runtime = "node22",
  allChangesDeployed = true,
  bindings = 1,
  statuses = ["built"],
}: FakeOptions) {
  const calls: Call[] = [];
  let patched = false;
  const fetchImpl: NonNullable<DeployConfig["fetch"]> = async (input, init) => {
    const url = new URL(input);
    const method = init?.method ?? "GET";
    const body = init?.body
      ? (JSON.parse(String(init.body)) as Record<string, unknown>)
      : undefined;
    calls.push({ method, path: url.pathname, body });

    if (url.pathname === "/oauth/token") return Response.json({ access_token: "mgmt" });
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer mgmt");
    if (url.pathname === "/api/v2/actions/triggers/post-login/bindings") {
      return Response.json({
        bindings: Array.from({ length: bindings }, (_, i) => ({
          action: { id: `act${i}`, name: `action${i}` },
        })),
      });
    }
    if (url.pathname === "/api/v2/actions/actions/act0" && method === "GET") {
      const status = patched ? (statuses.shift() ?? "built") : "built";
      return Response.json({
        id: "act0",
        name: "action0",
        code,
        runtime,
        status,
        all_changes_deployed: allChangesDeployed,
      });
    }
    if (method === "PATCH") {
      patched = true;
      return Response.json({});
    }
    if (method === "POST") return Response.json({});
    return new Response("not found", { status: 404 });
  };
  return { calls, fetchImpl };
}

function config(fetchImpl: NonNullable<DeployConfig["fetch"]>, code = "new"): DeployConfig {
  return {
    tenantDomain: "tenant.test",
    clientId: "id",
    clientSecret: "secret",
    code,
    fetch: fetchImpl,
    pollIntervalMs: 0,
  };
}

const writes = (calls: Call[]) =>
  calls.filter((c) => c.method === "PATCH" || c.path.endsWith("/deploy"));

describe("deployPostLoginAction", () => {
  it("Management API の audience で client credentials のトークンを取る", async () => {
    const { calls, fetchImpl } = fakeAuth0({ code: "new" });
    await deployPostLoginAction(config(fetchImpl));

    assert.deepEqual(calls[0], {
      method: "POST",
      path: "/oauth/token",
      body: {
        grant_type: "client_credentials",
        client_id: "id",
        client_secret: "secret",
        audience: "https://tenant.test/api/v2/",
      },
    });
  });

  it("本番と同じなら何もしない", async () => {
    const { calls, fetchImpl } = fakeAuth0({ code: "new" });

    assert.equal(await deployPostLoginAction(config(fetchImpl)), "unchanged");
    assert.deepEqual(writes(calls), []);
  });

  it("差分があれば secrets を送らずに更新し、ビルドを待って Deploy する", async () => {
    const { calls, fetchImpl } = fakeAuth0({ statuses: ["building", "building", "built"] });

    assert.equal(await deployPostLoginAction(config(fetchImpl)), "deployed");
    const [patch, deploy] = writes(calls);
    assert.deepEqual(patch, {
      method: "PATCH",
      path: "/api/v2/actions/actions/act0",
      body: { code: "new", runtime: "node22", dependencies: [] },
    });
    assert.equal(deploy?.path, "/api/v2/actions/actions/act0/deploy");
  });

  it("コードが同じでも未 Deploy の変更や runtime の違いがあれば更新する", async () => {
    for (const options of [{ allChangesDeployed: false }, { runtime: "node18" }]) {
      const { fetchImpl } = fakeAuth0({ code: "new", ...options });
      assert.equal(await deployPostLoginAction(config(fetchImpl)), "deployed");
    }
  });

  it("--check では書き込まずに drifted を返す", async () => {
    const { calls, fetchImpl } = fakeAuth0({});

    assert.equal(await deployPostLoginAction(config(fetchImpl), { check: true }), "drifted");
    assert.deepEqual(writes(calls), []);
  });

  it("post-login の Action が 1 つでなければ失敗する", async () => {
    const { calls, fetchImpl } = fakeAuth0({ bindings: 2 });

    await assert.rejects(deployPostLoginAction(config(fetchImpl)), /2 個/);
    assert.deepEqual(writes(calls), []);
  });

  it("ビルドに失敗したら Deploy しない", async () => {
    const { calls, fetchImpl } = fakeAuth0({ statuses: ["failed"] });

    await assert.rejects(deployPostLoginAction(config(fetchImpl)), /ビルドに失敗/);
    assert.equal(
      calls.some((c) => c.path.endsWith("/deploy")),
      false
    );
  });
});
