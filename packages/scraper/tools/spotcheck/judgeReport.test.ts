import assert from "node:assert/strict";
import { test } from "node:test";

import { judgeSample, needsInvestigation } from "./judgeReport.ts";
import type { ExpectedSample, ObservedSample, PlanSample } from "./judgeReport.ts";

const PLAN: PlanSample = {
  id: "tokyo-koutou:d1a12a0c-aaaa-bbbb-cccc-000000000001:2026-12-01",
  target: "tokyo-koutou",
  institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000001",
  date: "2026-12-01",
  buildingSystemName: "豊洲文化センター",
  institutionSystemName: "音楽練習室",
  divisionLabels: ["午前", "午後", "夜間", "①", "②", "③", "④", "⑤", "⑥"],
};

function observed(overrides: Partial<ObservedSample>): ObservedSample {
  return {
    id: PLAN.id,
    reached: true,
    dateDisplayed: true,
    outOfWindow: false,
    cells: [],
    legend: null,
    url: "https://example.test/",
    screenshotPath: "screenshots/1.png",
    note: "",
    ...overrides,
  };
}

const EXPECTED_VACANT: ExpectedSample = {
  id: PLAN.id,
  reservation: {
    RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
    RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1", // koutou では「予約あり」
  },
};

test("全区分のカテゴリが一致すれば MATCH", () => {
  const result = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({
      cells: [
        { divisionLabel: "午前", symbol: "○" },
        { divisionLabel: "午後", symbol: "×" },
      ],
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("カテゴリが食い違えば MISMATCH で区分と両値を detail に載せる", () => {
  const result = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({
      cells: [
        { divisionLabel: "午前", symbol: "×" }, // D1 は VACANT
        { divisionLabel: "午後", symbol: "×" },
      ],
    })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /午前/);
  assert.match(result.detail, /RESERVATION_STATUS_VACANT/);
});

test("サイトに表示があり D1 に行が無ければ SITE_HAS_DATA_D1_MISSING", () => {
  const result = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: null },
    observed({ cells: [{ divisionLabel: "午前", symbol: "○" }] })
  );
  assert.equal(result.verdict, "SITE_HAS_DATA_D1_MISSING");
});

test("サイトにも D1 にも無ければ SITE_NO_DATA、D1 にだけあれば SITE_NO_DATA_D1_STALE", () => {
  const none = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: null },
    observed({ dateDisplayed: false })
  );
  assert.equal(none.verdict, "SITE_NO_DATA");
  const stale = judgeSample(PLAN, EXPECTED_VACANT, observed({ dateDisplayed: false }));
  assert.equal(stale.verdict, "SITE_NO_DATA_D1_STALE");
});

test("受付期間外は OUT_OF_WINDOW、未到達は UNREACHABLE、記録なしも UNREACHABLE", () => {
  const window = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: null },
    observed({ dateDisplayed: false, outOfWindow: true })
  );
  assert.equal(window.verdict, "OUT_OF_WINDOW");
  assert.equal(
    judgeSample(PLAN, EXPECTED_VACANT, observed({ reached: false })).verdict,
    "UNREACHABLE"
  );
  assert.equal(judgeSample(PLAN, EXPECTED_VACANT, undefined).verdict, "UNREACHABLE");
});

test("未知の記号・未知の区分ラベルは UNMAPPED", () => {
  const symbol = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({ cells: [{ divisionLabel: "午前", symbol: "☆" }] })
  );
  assert.equal(symbol.verdict, "UNMAPPED");
  const division = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({ cells: [{ divisionLabel: "深夜", symbol: "○" }] })
  );
  assert.equal(division.verdict, "UNMAPPED");
});

test("凡例があれば記号表より優先される", () => {
  // 凡例が △=抽選申込あり（埋まり系）と言うサイトでは、D1 の STATUS_1（予約あり）と一致する
  const result = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1" } },
    observed({
      cells: [{ divisionLabel: "午前", symbol: "△" }],
      legend: { "△": "抽選申込あり" },
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("registry のラベルが記号そのものでも期待側を categorizeSymbol でカテゴリ化して MATCH になる（C1）", () => {
  // tokyo-kita は reservationStatus に記号そのものを格納している（VACANT: "○"）。
  // categorizeLabel だけでは UNKNOWN になっていたが、categorizeSymbol は記号表にフォールバックする。
  const plan: PlanSample = {
    id: "tokyo-kita:4c79dcb5-e7f1-18fd-8f9a-000000000003:2026-08-01",
    target: "tokyo-kita",
    institutionId: "4c79dcb5-e7f1-18fd-8f9a-000000000003",
    date: "2026-08-01",
    buildingSystemName: "北区某会館",
    institutionSystemName: "音楽室",
    divisionLabels: ["9:00-12:00", "13:00-17:00", "18:00-22:00"],
  };
  const result = judgeSample(
    plan,
    { id: plan.id, reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" } },
    observed({
      id: plan.id,
      cells: [{ divisionLabel: "9:00-12:00", symbol: "○" }],
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("区分ラベルの表記ゆれ（全角/半角、範囲記号）を正規化して同一視する（I2）", () => {
  // kanagawa-kawasaki の registry は「午後１」（全角数字）。サイト観測が半角「午後1」でも一致させる。
  const plan: PlanSample = {
    id: "kanagawa-kawasaki:d1a12a0c-aaaa-bbbb-cccc-000000000099:2026-08-01",
    target: "kanagawa-kawasaki",
    institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000099",
    date: "2026-08-01",
    buildingSystemName: "川崎市某会館",
    institutionSystemName: "音楽室",
    divisionLabels: ["午前", "午後", "午後１", "午後２", "夜間"],
  };
  const result = judgeSample(
    plan,
    {
      id: plan.id,
      reservation: { RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_VACANT" },
    },
    observed({
      id: plan.id,
      cells: [{ divisionLabel: "午後1", symbol: "○" }],
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("needsInvestigation は要調査の判定だけ true", () => {
  assert.equal(needsInvestigation("MATCH"), false);
  assert.equal(needsInvestigation("SITE_NO_DATA"), false);
  assert.equal(needsInvestigation("OUT_OF_WINDOW"), false);
  assert.equal(needsInvestigation("MISMATCH"), true);
  assert.equal(needsInvestigation("SITE_HAS_DATA_D1_MISSING"), true);
  assert.equal(needsInvestigation("SITE_NO_DATA_D1_STALE"), true);
  assert.equal(needsInvestigation("UNREACHABLE"), true);
  assert.equal(needsInvestigation("UNMAPPED"), true);
});
