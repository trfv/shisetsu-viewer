import assert from "node:assert/strict";
import { test } from "node:test";

import { selectSamples, type SampleKey } from "./sampling.ts";

const KEYS: SampleKey[] = [
  {
    target: "tokyo-koutou",
    institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000001",
    date: "2026-12-01",
  },
  {
    target: "tokyo-koutou",
    institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000002",
    date: "2026-12-02",
  },
  {
    target: "tokyo-kita",
    institutionId: "4c79dcb5-e7f1-18fd-8f9a-000000000003",
    date: "2026-08-01",
  },
];

test("selectSamples は自治体ラウンドロビンで cap まで詰める", () => {
  const picked = selectSamples({ explicitKeys: KEYS, cap: 2 });
  // 1 巡目で koutou と kita から 1 件ずつ取り、cap=2 で打ち切る
  assert.equal(picked.length, 2);
  assert.deepEqual(new Set(picked.map((k) => k.target)), new Set(["tokyo-koutou", "tokyo-kita"]));
});

test("selectSamples は municipalityFilter で絞り、cap は 12 を超えない", () => {
  const filtered = selectSamples({ explicitKeys: KEYS, municipalityFilter: "tokyo-kita" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.target, "tokyo-kita");

  const many = Array.from({ length: 30 }, (_, i) => ({
    target: "tokyo-koutou",
    institutionId: `id-${String(i).padStart(2, "0")}`,
    date: "2026-08-01",
  }));
  assert.equal(selectSamples({ explicitKeys: many, cap: 99 }).length, 12);
});

test("selectSamples は入力順によらず決定論的に選ぶ", () => {
  const a = selectSamples({ explicitKeys: KEYS, cap: 3 });
  const b = selectSamples({ explicitKeys: [...KEYS].reverse(), cap: 3 });
  assert.deepEqual(a, b);
});
