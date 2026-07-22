import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareMunicipality,
  reservationWindow,
  resolveParityTargets,
  totalMismatches,
} from "./parityReport.ts";

test("resolveParityTargets は引数なしなら CI 除外を外す", () => {
  const targets = resolveParityTargets({
    allTargets: ["tokyo-kita", "tokyo-sumida", "tokyo-meguro"],
    ciExcludedTargets: ["tokyo-sumida", "tokyo-meguro"],
    forceInclude: [],
  });
  assert.deepEqual(targets, ["tokyo-kita"]);
});

test("resolveParityTargets は forceInclude で CI 除外を個別解除する", () => {
  const targets = resolveParityTargets({
    allTargets: ["tokyo-kita", "tokyo-sumida", "tokyo-meguro"],
    ciExcludedTargets: ["tokyo-sumida", "tokyo-meguro"],
    forceInclude: ["tokyo-sumida"],
  });
  assert.deepEqual(targets, ["tokyo-kita", "tokyo-sumida"]);
});

test("resolveParityTargets は明示引数なら CI 除外でもその 1 件だけ返す", () => {
  const targets = resolveParityTargets({
    allTargets: ["tokyo-kita", "tokyo-sumida", "tokyo-meguro"],
    ciExcludedTargets: ["tokyo-sumida", "tokyo-meguro"],
    forceInclude: [],
    filterArg: "tokyo-sumida",
  });
  assert.deepEqual(targets, ["tokyo-sumida"]);
});

test("reservationWindow は今日を from、その 5 ヶ月後の月末を to にする", () => {
  // 2026-07-18 → to = addMonths(endOfMonth(2026-07-18)=2026-07-31, 5) = 2026-12-31
  const w = reservationWindow(new Date("2026-07-18T09:00:00+09:00"));
  assert.equal(w.from, "2026-07-18");
  assert.equal(w.to, "2026-12-31");
});

test("reservationWindow は年跨ぎでも月末を正しく出す", () => {
  const w = reservationWindow(new Date("2026-08-31T00:00:00Z"));
  assert.equal(w.from, "2026-08-31");
  assert.equal(w.to, "2027-01-31");
});

/** 生存行（dual-write 開始以降に Hasura が更新した行）を組み立てるヘルパ。 */
const live = (reservation: string) => ({ reservation, updatedAt: "2026-07-20T00:00:00" });
/** 遺物（dual-write 開始前で更新が止まった行）。 */
const stale = (reservation: string) => ({ reservation, updatedAt: "2026-02-28T05:06:50" });
const LIVE_SINCE = "2026-07-16";

test("一致していれば乖離ゼロのレポートを返す", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", live('{"M":"VACANT"}')],
    ["id-a 2026-08-02", live('{"M":"OCCUPIED"}')],
  ]);
  const d1 = new Map([
    ["id-a 2026-08-01", '{"M":"VACANT"}'],
    ["id-a 2026-08-02", '{"M":"OCCUPIED"}'],
  ]);
  const report = compareMunicipality("tokyo-kita", hasura, d1, LIVE_SINCE);
  assert.deepEqual(report, {
    target: "tokyo-kita",
    hasuraRows: 2,
    d1Rows: 2,
    missing: 0,
    extra: 0,
    diff: 0,
    stale: 0,
    samples: [],
  });
});

test("MISSING / EXTRA / DIFF をそれぞれ数え、サンプルに載せる", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", live('{"M":"VACANT"}')],
    ["id-a 2026-08-02", live('{"M":"VACANT"}')],
  ]);
  const d1 = new Map([
    ["id-a 2026-08-02", '{"M":"OCCUPIED"}'],
    ["id-b 2026-08-03", '{"M":"VACANT"}'],
  ]);
  const report = compareMunicipality("tokyo-kita", hasura, d1, LIVE_SINCE);
  assert.equal(report.missing, 1);
  assert.equal(report.diff, 1);
  assert.equal(report.extra, 1);
  assert.equal(report.stale, 0);
  assert.deepEqual(report.samples, [
    "MISSING in D1: id-a 2026-08-01",
    "DIFF: id-a 2026-08-02",
    "EXTRA in D1: id-b 2026-08-03",
  ]);
});

test("D1 に無い行でも Hasura の更新が dual-write 開始前なら stale として MISSING から外す", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", stale('{"M":"VACANT"}')],
    ["id-a 2026-08-02", live('{"M":"VACANT"}')],
  ]);
  const report = compareMunicipality("tokyo-kita", hasura, new Map(), LIVE_SINCE);
  assert.equal(report.stale, 1);
  assert.equal(report.missing, 1);
  // 遺物はゲート対象外なのでサンプルにも載せない（本物の乖離を埋もれさせないため）
  assert.deepEqual(report.samples, ["MISSING in D1: id-a 2026-08-02"]);
});

test("stale だけの自治体は totalMismatches に寄与せず合格する", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", stale('{"M":"VACANT"}')],
    ["id-a 2026-08-02", stale('{"M":"VACANT"}')],
  ]);
  const report = compareMunicipality("tokyo-koutou", hasura, new Map(), LIVE_SINCE);
  assert.equal(report.stale, 2);
  assert.equal(report.missing, 0);
  assert.equal(totalMismatches([report]), 0);
});

test("両方にあるが内容が違う行は更新が古くても DIFF として数える", () => {
  // D1 に行が在る = dual-write は届いている。内容差は遺物では説明できない実バグ。
  const hasura = new Map([["id-a 2026-08-01", stale('{"M":"VACANT"}')]]);
  const d1 = new Map([["id-a 2026-08-01", '{"M":"OCCUPIED"}']]);
  const report = compareMunicipality("tokyo-kita", hasura, d1, LIVE_SINCE);
  assert.equal(report.diff, 1);
  assert.equal(report.stale, 0);
});

test("サンプルは 5 件までに切り詰めるが、件数は全件を数える", () => {
  const hasura = new Map(
    Array.from({ length: 8 }, (_, i) => [`id-a 2026-08-0${i + 1}`, live('{"M":"VACANT"}')] as const)
  );
  const report = compareMunicipality("tokyo-kita", hasura, new Map(), LIVE_SINCE);
  assert.equal(report.missing, 8);
  assert.equal(report.samples.length, 5);
});

test("totalMismatches は全自治体の missing/extra/diff を合算し stale は含めない", () => {
  const reports = [
    {
      target: "a",
      hasuraRows: 1,
      d1Rows: 1,
      missing: 1,
      extra: 2,
      diff: 3,
      stale: 99,
      samples: [],
    },
    { target: "b", hasuraRows: 0, d1Rows: 0, missing: 0, extra: 0, diff: 0, stale: 0, samples: [] },
  ];
  assert.equal(totalMismatches(reports), 6);
});
