import { test } from "node:test";
import assert from "node:assert/strict";
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

test("一致していれば乖離ゼロのレポートを返す", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", '{"M":"VACANT"}'],
    ["id-a 2026-08-02", '{"M":"OCCUPIED"}'],
  ]);
  const d1 = new Map(hasura);
  const report = compareMunicipality("tokyo-kita", hasura, d1);
  assert.deepEqual(report, {
    target: "tokyo-kita",
    hasuraRows: 2,
    d1Rows: 2,
    missing: 0,
    extra: 0,
    diff: 0,
    samples: [],
  });
});

test("MISSING / EXTRA / DIFF をそれぞれ数え、サンプルに載せる", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", '{"M":"VACANT"}'],
    ["id-a 2026-08-02", '{"M":"VACANT"}'],
  ]);
  const d1 = new Map([
    ["id-a 2026-08-02", '{"M":"OCCUPIED"}'],
    ["id-b 2026-08-03", '{"M":"VACANT"}'],
  ]);
  const report = compareMunicipality("tokyo-kita", hasura, d1);
  assert.equal(report.missing, 1);
  assert.equal(report.diff, 1);
  assert.equal(report.extra, 1);
  assert.deepEqual(report.samples, [
    "MISSING in D1: id-a 2026-08-01",
    "DIFF: id-a 2026-08-02",
    "EXTRA in D1: id-b 2026-08-03",
  ]);
});

test("サンプルは 5 件までに切り詰めるが、件数は全件を数える", () => {
  const hasura = new Map(
    Array.from({ length: 8 }, (_, i) => [`id-a 2026-08-0${i + 1}`, '{"M":"VACANT"}'] as const)
  );
  const report = compareMunicipality("tokyo-kita", hasura, new Map());
  assert.equal(report.missing, 8);
  assert.equal(report.samples.length, 5);
});

test("totalMismatches は全自治体の missing/extra/diff を合算する", () => {
  const reports = [
    { target: "a", hasuraRows: 1, d1Rows: 1, missing: 1, extra: 2, diff: 3, samples: [] },
    { target: "b", hasuraRows: 0, d1Rows: 0, missing: 0, extra: 0, diff: 0, samples: [] },
  ];
  assert.equal(totalMismatches(reports), 6);
});
