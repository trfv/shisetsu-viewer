import assert from "node:assert/strict";
import { test } from "node:test";

import { parseTrackerSamples, selectSamples } from "./sampling.ts";

const BODY = `<!-- parity-tracker -->

定期実行で Hasura と D1 の予約データに **5 件の乖離** を検出しました。

| 自治体 | Hasura | D1 | MISSING | EXTRA | DIFF | STALE |
|---|---|---|---|---|---|---|
| tokyo-koutou | 5617 | 5576 | 2 | 0 | 0 | 39 |

<details><summary>サンプル（自治体あたり最大 5 件）</summary>

\`\`\`
tokyo-koutou: MISSING in D1: d1a12a0c-aaaa-bbbb-cccc-000000000001 2026-12-01
tokyo-koutou: MISSING in D1: d1a12a0c-aaaa-bbbb-cccc-000000000002 2026-12-02
tokyo-kita: MISSING in D1: 4c79dcb5-e7f1-18fd-8f9a-000000000003 2026-08-01
tokyo-kita: DIFF: 4c79dcb5-e7f1-18fd-8f9a-000000000003 2026-08-02
\`\`\`
</details>
`;

test("parseTrackerSamples は MISSING 行だけを抽出する", () => {
  const keys = parseTrackerSamples(BODY);
  assert.equal(keys.length, 3); // DIFF 行は対象外
  assert.deepEqual(keys[0], {
    target: "tokyo-koutou",
    institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000001",
    date: "2026-12-01",
  });
});

test("selectSamples は自治体ラウンドロビンで cap まで詰める", () => {
  const keys = parseTrackerSamples(BODY);
  const picked = selectSamples({ trackerKeys: keys, explicitKeys: [], cap: 2 });
  // 1 巡目で koutou と kita から 1 件ずつ取り、cap=2 で打ち切る
  assert.equal(picked.length, 2);
  assert.deepEqual(new Set(picked.map((k) => k.target)), new Set(["tokyo-koutou", "tokyo-kita"]));
});

test("selectSamples は明示キーを tracker より優先する", () => {
  const explicit = [
    {
      target: "tokyo-arakawa",
      institutionId: "28bbef1f-aaaa-bbbb-cccc-000000000009",
      date: "2026-07-19",
    },
  ];
  const picked = selectSamples({
    trackerKeys: parseTrackerSamples(BODY),
    explicitKeys: explicit,
  });
  assert.deepEqual(picked, explicit);
});

test("selectSamples は municipalityFilter で絞り、cap は 12 を超えない", () => {
  const keys = parseTrackerSamples(BODY);
  const filtered = selectSamples({
    trackerKeys: keys,
    explicitKeys: [],
    municipalityFilter: "tokyo-kita",
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.target, "tokyo-kita");

  const many = Array.from({ length: 30 }, (_, i) => ({
    target: "tokyo-koutou",
    institutionId: `id-${String(i).padStart(2, "0")}`,
    date: "2026-08-01",
  }));
  assert.equal(selectSamples({ trackerKeys: many, explicitKeys: [], cap: 99 }).length, 12);
});

test("selectSamples は入力順によらず決定論的に選ぶ", () => {
  const keys = parseTrackerSamples(BODY);
  const a = selectSamples({ trackerKeys: keys, explicitKeys: [], cap: 3 });
  const b = selectSamples({ trackerKeys: [...keys].reverse(), explicitKeys: [], cap: 3 });
  assert.deepEqual(a, b);
});
