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

// --- band モード（サイトが時間帯レンジ、registry が午前/午後/夜間の自治体） ---

const ARAKAWA_PLAN: PlanSample = {
  id: "tokyo-arakawa:9f0e1d2c-aaaa-bbbb-cccc-000000000001:2026-07-19",
  target: "tokyo-arakawa",
  institutionId: "9f0e1d2c-aaaa-bbbb-cccc-000000000001",
  date: "2026-07-19",
  buildingSystemName: "石浜ふれあい館",
  institutionSystemName: "３階和室１",
  divisionLabels: ["午前", "午後", "午後1", "午後2", "夜間"],
};

// 石浜ふれあい館の実観測（sample-dumps 由来）。4 区分が morning:1 / afternoon:2 / evening:1 に畳まれる。
const ARAKAWA_CELLS = [
  { divisionLabel: "09:00\n～\n12:00", symbol: "Ｘ" },
  { divisionLabel: "12:15\n～\n15:15", symbol: "Ｘ" },
  { divisionLabel: "15:30\n～\n18:30", symbol: "Ｘ" },
  { divisionLabel: "18:45\n～\n21:45", symbol: "○" },
];

test("registry が午前/午後・サイトが時間帯レンジの自治体は band モードで MATCH になる", () => {
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MATCH");
});

test("band が跨るカテゴリの取り違えは band モードでも MISMATCH になる", () => {
  // D1 の夜間だけ「予約あり」に取り違えたケース。サイトは夜間が空き。
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_1",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /evening/);
});

test("band 単位のコマ数の欠落（片側にしか無い band）は MISMATCH になる", () => {
  // D1 に夜間の行が無い＝サイトにある区分が D1 から落ちている silent failure。
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /evening/);
});

test("同一 band 内のコマ数の違いも MISMATCH になる（マルチセット比較）", () => {
  // サイトは afternoon 2 コマだが D1 は 1 コマしかない。
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /afternoon/);
});

test("大田区の表記（半角ハイフン・前後空白）も band モードで MATCH になる", () => {
  const plan: PlanSample = {
    id: "tokyo-ota:9f0e1d2c-aaaa-bbbb-cccc-000000000002:2026-07-19",
    target: "tokyo-ota",
    institutionId: "9f0e1d2c-aaaa-bbbb-cccc-000000000002",
    date: "2026-07-19",
    buildingSystemName: "雪谷文化センター",
    institutionSystemName: "音楽室",
    divisionLabels: ["午前", "午後", "午後1", "午後2", "夜間", "夜間1", "夜間2"],
  };
  const result = judgeSample(
    plan,
    {
      id: plan.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
        RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_1",
      },
    },
    observed({
      id: plan.id,
      cells: [
        { divisionLabel: "09:00 - 12:00", symbol: "空いています" },
        { divisionLabel: "13:00 - 17:00", symbol: "予約済みです" },
        { divisionLabel: "18:00 - 22:00", symbol: "予約済みです" },
      ],
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("band モードで D1 の区分 enum を band に畳めなければ UNMAPPED", () => {
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        // scraper が区分の変換に失敗して INVALID が保存された状態。握り潰さない。
        RESERVATION_DIVISION_INVALID: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "UNMAPPED");
  assert.match(result.detail, /RESERVATION_DIVISION_INVALID/);
});

test("時刻レンジでも registry ラベルでもないセルが混じれば従来どおり UNMAPPED", () => {
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1" },
    },
    observed({
      id: ARAKAWA_PLAN.id,
      cells: [
        { divisionLabel: "09:00\n～\n12:00", symbol: "Ｘ" },
        { divisionLabel: "深夜帯", symbol: "Ｘ" },
      ],
    })
  );
  assert.equal(result.verdict, "UNMAPPED");
});

test("registry ラベルが時刻レンジの自治体は band に落ちず exact モードのまま（粒度維持）", () => {
  // tokyo-kita は registry も時刻レンジ。band に落ちると DIVISION_1..5 が畳めず UNMAPPED になる。
  const plan: PlanSample = {
    id: "tokyo-kita:4c79dcb5-e7f1-18fd-8f9a-000000000009:2026-07-19",
    target: "tokyo-kita",
    institutionId: "4c79dcb5-e7f1-18fd-8f9a-000000000009",
    date: "2026-07-19",
    buildingSystemName: "滝野川会館",
    institutionSystemName: "B201音楽スタジオ",
    divisionLabels: [
      "9:00-12:00",
      "13:00-17:00",
      "18:00-22:00",
      "9:30-11:30",
      "12:00-14:00",
      "14:30-16:30",
      "17:00-19:00",
      "19:30-21:30",
    ],
  };
  const result = judgeSample(
    plan,
    {
      id: plan.id,
      reservation: {
        RESERVATION_DIVISION_DIVISION_1: "RESERVATION_STATUS_STATUS_3",
        RESERVATION_DIVISION_DIVISION_2: "RESERVATION_STATUS_STATUS_2",
        RESERVATION_DIVISION_DIVISION_3: "RESERVATION_STATUS_STATUS_2",
        RESERVATION_DIVISION_DIVISION_4: "RESERVATION_STATUS_VACANT",
        RESERVATION_DIVISION_DIVISION_5: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({
      id: plan.id,
      cells: [
        { divisionLabel: "9:30-11:30", symbol: "-" },
        { divisionLabel: "12:00-14:00", symbol: "×" },
        { divisionLabel: "14:30-16:30", symbol: "×" },
        { divisionLabel: "17:00-19:00", symbol: "○" },
        { divisionLabel: "19:30-21:30", symbol: "○" },
      ],
    })
  );
  assert.equal(result.verdict, "MATCH");
  assert.match(result.detail, /区分一致/); // exact モードの detail であること
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
