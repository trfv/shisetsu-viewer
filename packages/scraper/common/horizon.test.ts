import assert from "node:assert/strict";
import { test } from "node:test";

import { daysForHorizon, pagesForHorizon } from "./horizon.ts";
const NOW = new Date(2026, 6, 5);

test("day: 明日から5ヶ月先の月末まで（kita/chuo/ota/edogawa 相当）", () => {
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 5, unit: "day" }, NOW), 179);
});

test("day: 今日から13ヶ月先の月末まで（arakawa 相当）", () => {
  assert.equal(pagesForHorizon({ startOffsetDays: 0, monthsAhead: 13, unit: "day" }, NOW), 423);
});

test("week: 明日から7ヶ月先の月末まで（bunkyo/sumida 相当）", () => {
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 7, unit: "week" }, NOW), 34);
});

test("twoWeeks: 明日から7ヶ月先の月末まで（meguro/toshima 相当）", () => {
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 7, unit: "twoWeeks" }, NOW), 18);
});

test("calendarWeek: 今日から13ヶ月先の月末まで（kawasaki 相当）", () => {
  assert.equal(
    pagesForHorizon({ startOffsetDays: 0, monthsAhead: 13, unit: "calendarWeek" }, NOW),
    61
  );
});

test("month: 明日から3ヶ月先の月末まで（kita-genkiplaza 相当）", () => {
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 3, unit: "month" }, NOW), 4);
});

test("month: 開始オフセットが翌月へまたぐ場合も月数を正しく数える", () => {
  const endOfJuly = new Date(2026, 6, 31);
  assert.equal(
    pagesForHorizon({ startOffsetDays: 1, monthsAhead: 3, unit: "month" }, endOfJuly),
    4
  );
});

test("daysForHorizon: unit に依らず暦日数を返す（day 版 pagesForHorizon と一致）", () => {
  const spec = { startOffsetDays: 1, monthsAhead: 5, unit: "day" } as const;
  assert.equal(daysForHorizon(spec, NOW), 179);
  assert.equal(daysForHorizon(spec, NOW), pagesForHorizon(spec, NOW));
});

test("daysForHorizon: twoWeeks でも暦日数（ページ数ではない）を返す", () => {
  const spec = { startOffsetDays: 1, monthsAhead: 5, unit: "twoWeeks" } as const;
  assert.equal(daysForHorizon(spec, NOW), 179);
});
