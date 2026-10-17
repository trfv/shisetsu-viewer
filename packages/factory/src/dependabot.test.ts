import assert from "node:assert/strict";
import { test } from "node:test";

import { ciFromRollup, classifyDependabotPr } from "./dependabot.ts";
import type { CiConclusion, DependabotPr } from "./types.ts";

function pr(title: string, updates: string[], ci: CiConclusion): DependabotPr {
  const body = [
    "Bumps the testing group with 3 updates in the / directory: [x](https://example.test).",
    "",
    ...updates,
    "<details><summary>Release notes</summary>Migrating from 1.0.0 to 9.0.0</details>",
  ].join("\n");
  return { number: 1, title, body, ci, labels: [] };
}

test("minor 更新で CI 緑なら auto-merge", () => {
  const p = pr(
    "chore(deps-dev): bump smol-toml from 1.7.0 to 1.9.0",
    ["Updates `smol-toml` from 1.7.0 to 1.9.0"],
    "success"
  );
  assert.equal(classifyDependabotPr(p), "auto-merge");
});

test("リリースノート中の from A to B は判定に使わない", () => {
  // 本文の details 内に 1.0.0 → 9.0.0 があるが、Updates 行は patch なので auto-merge
  const p = pr("chore(deps): bump the g group", ["Updates `a` from 2.3.4 to 2.3.5"], "success");
  assert.equal(classifyDependabotPr(p), "auto-merge");
});

test("group 内に major が 1 つでもあれば needs-human", () => {
  const p = pr(
    "chore(deps-dev): bump the testing group across 1 directory with 3 updates",
    ["Updates `a` from 1.2.0 to 1.3.0", "Updates `vitest` from 4.1.10 to 5.0.1"],
    "success"
  );
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("0.x の minor 更新は破壊的とみなす", () => {
  const p = pr("chore(deps): bump x", ["Updates `x` from 0.5.2 to 0.6.0"], "success");
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("Cloudflare ツールチェインを含めば CI 緑でも needs-human", () => {
  for (const name of ["wrangler", "miniflare", "@cloudflare/vitest-plugin"]) {
    const p = pr(
      "chore(deps-dev): bump the build group",
      [`Updates \`${name}\` from 4.40.0 to 4.41.0`],
      "success"
    );
    assert.equal(classifyDependabotPr(p), "needs-human", name);
  }
});

test("バージョンが読めなければ needs-human", () => {
  const p = pr("chore(deps): bump something", [], "success");
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("非破壊で CI 赤なら investigate、未完了なら wait", () => {
  const updates = ["Updates `a` from 1.2.0 to 1.2.1"];
  assert.equal(classifyDependabotPr(pr("chore: bump a", updates, "failure")), "investigate");
  assert.equal(classifyDependabotPr(pr("chore: bump a", updates, "pending")), "wait");
});

test("ciFromRollup は ci-success だけを見る", () => {
  assert.equal(
    ciFromRollup([
      { name: "lint", conclusion: "FAILURE" },
      { name: "ci-success", conclusion: "SUCCESS" },
    ]),
    "success"
  );
  assert.equal(ciFromRollup([{ name: "ci-success", conclusion: "FAILURE" }]), "failure");
  assert.equal(ciFromRollup([{ name: "ci-success", conclusion: null }]), "pending");
  assert.equal(ciFromRollup([{ name: "ci-success", conclusion: "CANCELLED" }]), "pending");
  assert.equal(ciFromRollup([]), "pending");
});

// 2026-10-04〜10-17 に滞留して人間が処理した実際の PR（タイトルと Updates 行を写したもの）。
const REAL_PRS: readonly [number, string, string[], string][] = [
  [
    1719,
    "chore(deps): bump the security-production group across 1 directory with 2 updates",
    [
      "Updates `@modelcontextprotocol/sdk` from 1.30.1 to 1.31.0",
      "Updates `proxy-addr` from 2.0.7 to 2.0.8",
    ],
    "auto-merge",
  ],
  [
    1717,
    "chore(deps): bump the github-actions group across 2 directories with 3 updates",
    [
      "Updates `actions/setup-node` from 7.0.0 to 7.1.0",
      "Updates `actions/upload-artifact` from 7.0.1 to 7.0.2",
      "Updates `actions/download-artifact` from 8.0.1 to 8.0.2",
    ],
    "auto-merge",
  ],
  [
    1710,
    "chore(deps): bump the react group with 4 updates",
    ["Updates `react` from 19.2.8 to 19.3.0", "Updates `react-dom` from 19.2.8 to 19.3.0"],
    "auto-merge",
  ],
  [
    1704,
    "chore(deps): bump the production-dependencies group across 1 directory with 7 updates",
    [
      "Updates `jose` from 6.2.9 to 6.2.12",
      "Updates `@cloudflare/workers-oauth-provider` from 0.10.3 to 0.10.4",
      "Updates `zod` from 4.4.3 to 4.6.5",
    ],
    "auto-merge",
  ],
  [
    1688,
    "chore(deps-dev): bump the build group across 1 directory with 3 updates",
    ["Updates `wrangler` from 4.119.0 to 4.124.0", "Updates `vite` from 8.2.0 to 8.2.2"],
    "needs-human",
  ],
];

test("実例：10 月に滞留した dependabot PR の分類", () => {
  for (const [number, title, updates, expected] of REAL_PRS) {
    assert.equal(classifyDependabotPr(pr(title, updates, "success")), expected, `#${number}`);
  }
});
