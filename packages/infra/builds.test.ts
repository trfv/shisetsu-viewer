import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { diffBuilds, loadState, type BuildsSpec, type TriggerSpec } from "./builds.ts";

const trigger: TriggerSpec = {
  trigger_name: "Deploy default branch",
  branch_includes: ["master"],
  branch_excludes: [],
  path_includes: ["*"],
  path_excludes: [],
  build_command: "npm run build",
  deploy_command: "npm run deploy",
  root_directory: "/",
  build_caching_enabled: true,
  vars: { NODE_VERSION: "24.14.0" },
};

const spec: BuildsSpec = { "shisetsu-viewer": [trigger] };

describe("diffBuilds", () => {
  it("一致すれば空", () => {
    assert.deepEqual(diffBuilds(spec, { "shisetsu-viewer": [trigger] }), []);
  });

  it("項目の違いを宣言の値と並べて示す", () => {
    const lines = diffBuilds(spec, {
      "shisetsu-viewer": [{ ...trigger, deploy_command: "npx wrangler deploy --assets=./dist" }],
    });
    assert.deepEqual(lines, [
      'shisetsu-viewer / Deploy default branch: deploy_command が "npx wrangler deploy --assets=./dist"（宣言は "npm run deploy"）',
    ]);
  });

  it("消し忘れたビルド変数と、足りないビルド変数を見つける", () => {
    const lines = diffBuilds(spec, {
      "shisetsu-viewer": [{ ...trigger, vars: { HUSKY: "0" } }],
    });
    assert.deepEqual(lines, [
      "shisetsu-viewer / Deploy default branch: ビルド変数 NODE_VERSION が本番に無い",
      "shisetsu-viewer / Deploy default branch: ビルド変数 HUSKY が本番にだけある",
    ]);
  });

  it("トリガーの過不足を見つける", () => {
    const lines = diffBuilds(spec, {
      "shisetsu-viewer": [{ ...trigger, trigger_name: "Deploy previews" }],
    });
    assert.deepEqual(lines, [
      "shisetsu-viewer / Deploy default branch: トリガーが本番に無い",
      "shisetsu-viewer / Deploy previews: トリガーが本番にだけある",
    ]);
  });

  it("Worker が無ければそう示す", () => {
    assert.deepEqual(diffBuilds(spec, {}), ["shisetsu-viewer: Worker が本番に無い"]);
  });
});

const failingFetch = async () =>
  Response.json(
    { success: false, errors: [{ code: 10000, message: "Authentication error" }] },
    { status: 403 }
  );

describe("loadState", () => {
  it("Worker 名から tag を引き、トリガーとビルド変数を宣言と同じ形にする", async () => {
    const paths: string[] = [];
    const fetchImpl = async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname.replace("/client/v4/accounts/acc", "");
      paths.push(path);
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer tok");
      const result: Record<string, unknown> = {
        "/workers/scripts": [
          { id: "shisetsu-viewer", tag: "tag1" },
          { id: "unrelated-worker", tag: "tag2" },
        ],
        "/builds/workers/tag1/triggers": [
          {
            ...trigger,
            vars: undefined,
            trigger_uuid: "uuid1",
            build_token_name: "token",
            created_on: "2026-01-01",
          },
        ],
        "/builds/triggers/uuid1/environment_variables": {
          NODE_VERSION: { is_secret: false, value: "24.14.0" },
          TOKEN: { is_secret: true },
        },
      };
      return Response.json({ success: true, errors: [], result: result[path] });
    };

    const state = await loadState(["shisetsu-viewer"], {
      token: "tok",
      accountId: "acc",
      fetch: fetchImpl,
    });

    assert.deepEqual(state, {
      "shisetsu-viewer": [{ ...trigger, vars: { NODE_VERSION: "24.14.0", TOKEN: "(secret)" } }],
    });
    // 宣言に無い Worker には触れない
    assert.equal(
      paths.some((p) => p.includes("tag2")),
      false
    );
  });

  it("API が失敗したら止める", async () => {
    await assert.rejects(
      loadState(["shisetsu-viewer"], { token: "tok", accountId: "acc", fetch: failingFetch }),
      /403/
    );
  });
});

describe("builds.json", () => {
  it("型どおりに書かれている", async () => {
    const parsed = JSON.parse(
      await readFile(new URL("./builds.json", import.meta.url), "utf8")
    ) as BuildsSpec;
    for (const triggers of Object.values(parsed)) {
      for (const t of triggers) {
        assert.deepEqual(Object.keys(t).toSorted(), Object.keys(trigger).toSorted());
      }
    }
  });
});
