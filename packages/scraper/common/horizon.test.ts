import assert from "node:assert/strict";
import { test } from "node:test";

import { daysForHorizon, pagesForHorizon } from "./horizon.ts";

// 2026-07-05 (土) を基準に旧 calculateCount 実装と同値であることを固定する。
const NOW = new Date(2026, 6, 5);

test("day: 明日から5ヶ月先の月末まで（kita/chuo/ota/edogawa 相当）", () => {
  // 明日 = 7/6、終了 = 12/31 → 179日
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 5, unit: "day" }, NOW), 179);
});

test("day: 今日から13ヶ月先の月末まで（arakawa 相当）", () => {
  // 今日 = 7/5、終了 = 翌年8/31 → 423日
  assert.equal(pagesForHorizon({ startOffsetDays: 0, monthsAhead: 13, unit: "day" }, NOW), 423);
});

test("week: 明日から7ヶ月先の月末まで（bunkyo/sumida 相当）", () => {
  // 明日 = 7/6、終了 = 翌年2/28 → 33週 + 1
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 7, unit: "week" }, NOW), 34);
});

test("twoWeeks: 明日から7ヶ月先の月末まで（meguro/toshima 相当）", () => {
  // ceil(33 / 2) + 1 = 18
  assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 7, unit: "twoWeeks" }, NOW), 18);
});

test("calendarWeek: 今日から13ヶ月先の月末まで（kawasaki 相当）", () => {
  assert.equal(
    pagesForHorizon({ startOffsetDays: 0, monthsAhead: 13, unit: "calendarWeek" }, NOW),
    61
  );
});

test("daysForHorizon: unit に依らず暦日数を返す（day 版 pagesForHorizon と一致）", () => {
  // day unit は 1 ページ = 1 日なので pagesForHorizon と暦日数が一致する
  const spec = { startOffsetDays: 1, monthsAhead: 5, unit: "day" } as const;
  assert.equal(daysForHorizon(spec, NOW), 179);
  assert.equal(daysForHorizon(spec, NOW), pagesForHorizon(spec, NOW));
});

test("daysForHorizon: twoWeeks でも暦日数（ページ数ではない）を返す", () => {
  // twoWeeks の pagesForHorizon は約 13 だが、暦日数は day 版と同じ 179
  const spec = { startOffsetDays: 1, monthsAhead: 5, unit: "twoWeeks" } as const;
  assert.equal(daysForHorizon(spec, NOW), 179);
});
