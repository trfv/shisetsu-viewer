import assert from "node:assert/strict";
import { test } from "node:test";

import { LABELS, reconcile, type ReconcileInput } from "./reconcile.ts";
import type { DependabotPr, ItemState, MunicipalityStatus, RunSummary, WorkItem } from "./types.ts";
import { renderBody } from "./workItem.ts";

function summary(runId: number, entries: Record<string, MunicipalityStatus>): RunSummary {
  return {
    runId,
    runUrl: `https://example.test/runs/${runId}`,
    createdAt: "2026-10-03T08:23:00Z",
    municipalities: Object.entries(entries).map(([municipality, status]) => ({
      municipality,
      status,
      failedFacilities: status === "ok" ? [] : ["つつじホール"],
    })),
  };
}

function input(partial: Partial<ReconcileInput>): ReconcileInput {
  return { summaries: [], masterCi: null, dependabotPrs: [], items: [], ...partial };
}

function item(
  number: number,
  key: string,
  labels: string[],
  state: ItemState = { consecutive: 2, lastRunId: 300 }
): WorkItem {
  return { number, key, labels, state };
}

test("2026-09 の停止の再現：kita が 3 回連続 structural なら修復項目を queued で作る", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(300, { "tokyo-kita": "structural", "tokyo-ota": "ok" }),
        summary(299, { "tokyo-kita": "structural", "tokyo-ota": "transient" }),
        summary(298, { "tokyo-kita": "structural", "tokyo-ota": "ok" }),
      ],
    })
  );
  assert.equal(ops.length, 1);
  const op = ops[0];
  assert.ok(op?.type === "create");
  assert.equal(op.key, "scraper-repair:tokyo-kita");
  assert.deepEqual(op.labels, [LABELS.base, LABELS.queued]);
  assert.equal(op.assignOwner, false);
  assert.ok(op.body.includes('"consecutive":3'));
  assert.ok(op.body.includes("つつじホール"));
});

test("1 回だけの structural では作らない", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(300, { "tokyo-kita": "structural" }),
        summary(299, { "tokyo-kita": "ok" }),
      ],
    })
  );
  assert.deepEqual(ops, []);
});

test("unknown も修復の連続に数える", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(300, { "tokyo-chuo": "unknown" }),
        summary(299, { "tokyo-chuo": "structural" }),
      ],
    })
  );
  assert.equal(ops[0]?.type, "create");
});

test("infra が 2 回続けば needs-human で作り、所有者を assign する", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(300, { "tokyo-sumida": "infra" }),
        summary(299, { "tokyo-sumida": "infra" }),
      ],
    })
  );
  const op = ops[0];
  assert.ok(op?.type === "create");
  assert.equal(op.key, "infra:tokyo-sumida");
  assert.deepEqual(op.labels, [LABELS.base, LABELS.needsHuman]);
  assert.equal(op.assignOwner, true);
});

test("最新で ok に戻れば既存項目をクローズする", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.equal(ops.length, 1);
  assert.ok(ops[0]?.type === "close");
  assert.equal(ops[0].number, 10);
});

test("hold は解消してもクローズしない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued, LABELS.hold])],
    })
  );
  assert.deepEqual(ops, []);
});

test("hold は失敗が続いても編集しない", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(301, { "tokyo-kita": "structural" }),
        summary(300, { "tokyo-kita": "structural" }),
      ],
      items: [
        item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.hold], {
          consecutive: 9,
          lastRunId: 1,
        }),
      ],
    })
  );
  assert.deepEqual(ops, []);
});

test("最新サマリに自治体が無ければ触らない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-ota": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.deepEqual(ops, []);
});

test("サマリが 1 件も無ければ scraper 系の項目に触らない", () => {
  const ops = reconcile(
    input({ items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])] })
  );
  assert.deepEqual(ops, []);
});

test("transient では既存項目を閉じも更新もしない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "transient" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.deepEqual(ops, []);
});

test("state もラベルも同じなら何もしない（冪等）", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(300, { "tokyo-kita": "structural" }),
        summary(299, { "tokyo-kita": "structural" }),
      ],
      items: [
        item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued], {
          consecutive: 2,
          lastRunId: 300,
        }),
      ],
    })
  );
  assert.deepEqual(ops, []);
});

test("連続回数が増えれば本文だけ更新する", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(301, { "tokyo-kita": "structural" }),
        summary(300, { "tokyo-kita": "structural" }),
        summary(299, { "tokyo-kita": "structural" }),
      ],
      items: [
        item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued], {
          consecutive: 2,
          lastRunId: 300,
        }),
      ],
    })
  );
  const op = ops[0];
  assert.ok(op?.type === "edit");
  assert.ok(op.body?.includes('"consecutive":3'));
  assert.deepEqual(op.addLabels, []);
  assert.deepEqual(op.removeLabels, []);
});

test("needs-human は queued に戻さない", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(301, { "tokyo-kita": "structural" }),
        summary(300, { "tokyo-kita": "structural" }),
      ],
      items: [
        item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.needsHuman], {
          consecutive: 2,
          lastRunId: 300,
        }),
      ],
    })
  );
  const op = ops[0];
  assert.ok(op?.type === "edit");
  assert.deepEqual(op.addLabels, []);
  assert.deepEqual(op.removeLabels, []);
});

test("state が壊れた既存項目は作り直さず edit する", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(301, { "tokyo-kita": "structural" }),
        summary(300, { "tokyo-kita": "structural" }),
      ],
      items: [
        {
          number: 10,
          key: "scraper-repair:tokyo-kita",
          labels: [LABELS.base, LABELS.queued],
          state: null,
        },
      ],
    })
  );
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.type, "edit");
});

test("前方一致する別スクレイパーの ok で項目を閉じない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita-cocokita": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.deepEqual(ops, []);
});

test("master の CI が赤なら master-red を作り、緑に戻ればクローズする", () => {
  const red = reconcile(
    input({ masterCi: { conclusion: "failure", url: "https://example.test/ci/1" } })
  );
  assert.ok(red[0]?.type === "create");
  assert.equal(red[0].key, "master-red");

  const green = reconcile(
    input({
      masterCi: { conclusion: "success", url: "https://example.test/ci/2" },
      items: [
        item(20, "master-red", [LABELS.base, LABELS.queued], { consecutive: 1, lastRunId: null }),
      ],
    })
  );
  assert.ok(green[0]?.type === "close");
  assert.equal(green[0].number, 20);
});

test("dependabot：自動マージ可なら factory と queued を付けてコメントする", () => {
  const pr: DependabotPr = {
    number: 1696,
    title: "chore(deps-dev): bump smol-toml from 1.7.0 to 1.9.0",
    body: "Updates `smol-toml` from 1.7.0 to 1.9.0",
    ci: "success",
    labels: ["dependencies"],
  };
  const op = reconcile(input({ dependabotPrs: [pr] }))[0];
  assert.ok(op?.type === "edit");
  assert.equal(op.number, 1696);
  assert.equal(op.body, null);
  assert.deepEqual(op.addLabels, [LABELS.base, LABELS.queued]);
  assert.ok(op.comment?.includes("auto-merge"));
});

test("dependabot：既に同じラベルなら何もしない、CI 待ちなら何もしない", () => {
  const base = {
    number: 1,
    title: "bump a from 1.0.0 to 1.0.1",
    body: "",
    ci: "success" as const,
  };
  assert.deepEqual(
    reconcile(input({ dependabotPrs: [{ ...base, labels: [LABELS.base, LABELS.queued] }] })),
    []
  );
  assert.deepEqual(
    reconcile(input({ dependabotPrs: [{ ...base, ci: "pending", labels: [] }] })),
    []
  );
});

test("dependabot：major は needs-human にして assign する", () => {
  const pr: DependabotPr = {
    number: 1709,
    title: "chore(deps-dev): bump the testing group across 1 directory with 3 updates",
    body: "Updates `vitest` from 4.1.10 to 5.0.1",
    ci: "failure",
    labels: [],
  };
  const op = reconcile(input({ dependabotPrs: [pr] }))[0];
  assert.ok(op?.type === "edit");
  assert.deepEqual(op.addLabels, [LABELS.base, LABELS.needsHuman]);
  assert.equal(op.assignOwner, true);
});

test("renderBody と組み合わせても key がずれない", () => {
  assert.ok(
    renderBody("master-red", { consecutive: 1, lastRunId: null }, "x").includes(
      "factory:key master-red"
    )
  );
});

test("実例 2026-10-09〜10：sumida の preflight 530 が 2 回続いた時点で needs-human を立てる", () => {
  const first = reconcile(
    input({ summaries: [summary(37864920682, { "tokyo-sumida": "infra" })] })
  );
  assert.deepEqual(first, []);

  const second = reconcile(
    input({
      summaries: [
        summary(37951114191, { "tokyo-sumida": "infra" }),
        summary(37864920682, { "tokyo-sumida": "infra" }),
      ],
    })
  );
  assert.ok(second[0]?.type === "create");
  assert.equal(second[0].key, "infra:tokyo-sumida");
  // proxy 断はエージェントで直せないので修復項目は作らない
  assert.equal(second.length, 1);
});

test("実例 2026-10-13：kawasaki の単発の structural（#1714）では何も起動しない", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(38335269203, { "kanagawa-kawasaki": "structural", "tokyo-sumida": "ok" }),
        summary(38288092570, { "kanagawa-kawasaki": "ok", "tokyo-sumida": "ok" }),
      ],
    })
  );
  assert.deepEqual(ops, []);
});
