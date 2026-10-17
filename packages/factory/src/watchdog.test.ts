import assert from "node:assert/strict";
import { test } from "node:test";

import { LABELS } from "./reconcile.ts";
import type { WorkItem } from "./types.ts";
import { isStale, watchdogOps } from "./watchdog.ts";

const NOW = new Date("2026-10-04T12:00:00Z");

test("26 時間以内なら新鮮、超えれば止まっている", () => {
  assert.equal(isStale("2026-10-03T11:00:00Z", NOW, 26), false);
  assert.equal(isStale("2026-10-03T09:00:00Z", NOW, 26), true);
});

test("一度も走っていなければ止まっているとみなす", () => {
  assert.equal(isStale(null, NOW, 26), true);
});

const base = { key: "watchdog:scraper", workflow: "scraper.yml", now: NOW, maxAgeHours: 26 };
const existing: WorkItem = {
  number: 5,
  key: "watchdog:scraper",
  labels: [LABELS.base, LABELS.needsHuman],
  state: null,
};

test("止まっていて項目が無ければ needs-human で作る", () => {
  const ops = watchdogOps({ ...base, lastRunAt: "2026-10-01T00:00:00Z", existing: null });
  const op = ops[0];
  assert.ok(op?.type === "create");
  assert.equal(op.key, "watchdog:scraper");
  assert.deepEqual(op.labels, [LABELS.base, LABELS.needsHuman]);
  assert.equal(op.assignOwner, true);
});

test("止まっていて項目が既にあれば何もしない", () => {
  assert.deepEqual(watchdogOps({ ...base, lastRunAt: null, existing }), []);
});

test("動いていれば既存項目をクローズする。hold なら残す", () => {
  assert.equal(
    watchdogOps({ ...base, lastRunAt: "2026-10-04T08:00:00Z", existing })[0]?.type,
    "close"
  );
  assert.deepEqual(
    watchdogOps({
      ...base,
      lastRunAt: "2026-10-04T08:00:00Z",
      existing: { ...existing, labels: [...existing.labels, LABELS.hold] },
    }),
    []
  );
});

test("動いていて項目が無ければ何もしない", () => {
  assert.deepEqual(watchdogOps({ ...base, lastRunAt: "2026-10-04T08:00:00Z", existing: null }), []);
});
