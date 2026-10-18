import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { APP_CLAIMS, HASURA_CLAIMS, readClaims } from "./auth.ts";

describe("readClaims", () => {
  it("app の role が user なら user", () => {
    assert.deepEqual(readClaims({ [APP_CLAIMS]: { role: "user" } }), {
      role: "user",
      trial: false,
    });
  });

  it("app の role が anonymous なら、Hasura が user でも anonymous", () => {
    assert.equal(
      readClaims({
        [APP_CLAIMS]: { role: "anonymous" },
        [HASURA_CLAIMS]: { "x-hasura-default-role": "user" },
      }).role,
      "anonymous"
    );
  });

  it("trial はロールに影響しない", () => {
    assert.deepEqual(readClaims({ [APP_CLAIMS]: { role: "user", trial: true } }), {
      role: "user",
      trial: true,
    });
  });

  it("app クレームが無ければ Hasura の既定ロールを見る", () => {
    assert.equal(readClaims({ [HASURA_CLAIMS]: { "x-hasura-default-role": "user" } }).role, "user");
    assert.equal(
      readClaims({ [HASURA_CLAIMS]: { "x-hasura-default-role": "anonymous" } }).role,
      "anonymous"
    );
  });

  it("クレームが無ければ anonymous", () => {
    assert.deepEqual(readClaims({}), { role: "anonymous", trial: false });
  });
});
