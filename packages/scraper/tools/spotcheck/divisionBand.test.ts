import assert from "node:assert/strict";
import { test } from "node:test";

import { bandFromDivisionEnum, bandFromHour, parseStartHour } from "./divisionBand.ts";

test("parseStartHour は 3 自治体の実表記から開始時を取り出す", () => {
  // tokyo-arakawa（改行込み・全角波ダッシュ）
  assert.equal(parseStartHour("09:00\n～\n12:00"), 9);
  assert.equal(parseStartHour("12:15\n～\n15:15"), 12);
  assert.equal(parseStartHour("15:30\n～\n18:30"), 15);
  assert.equal(parseStartHour("18:45\n～\n21:45"), 18);
  // tokyo-ota（半角ハイフン・前後空白）
  assert.equal(parseStartHour("09:00 - 12:00"), 9);
  assert.equal(parseStartHour("13:00 - 17:00"), 13);
  // tokyo-chuo / tokyo-kita（区切りなし・時が 1 桁）
  assert.equal(parseStartHour("9:00-12:00"), 9);
  assert.equal(parseStartHour("19:30-21:30"), 19);
});

test("parseStartHour は表記ゆれ（全角数字・全角コロン・各種ダッシュ）を吸収する", () => {
  assert.equal(parseStartHour("０９：００〜１２：００"), 9);
  assert.equal(parseStartHour("09:00−12:00"), 9);
  assert.equal(parseStartHour("09:00ー12:00"), 9);
  assert.equal(parseStartHour("  09:00 ～ 12:00  "), 9);
});

test("parseStartHour は時刻レンジでない文字列に null を返す", () => {
  assert.equal(parseStartHour("午前"), null);
  assert.equal(parseStartHour("午後1"), null);
  assert.equal(parseStartHour("①"), null);
  assert.equal(parseStartHour(""), null);
  assert.equal(parseStartHour("9:00"), null); // 片側だけはレンジではない
  assert.equal(parseStartHour("9時-12時"), null);
});

test("parseStartHour は時・分が範囲外なら null を返す", () => {
  assert.equal(parseStartHour("24:00-25:00"), null);
  assert.equal(parseStartHour("09:60-12:00"), null);
});

test("bandFromHour は 12 と 17 を境界にする", () => {
  assert.equal(bandFromHour(0), "morning");
  assert.equal(bandFromHour(9), "morning");
  assert.equal(bandFromHour(11), "morning");
  assert.equal(bandFromHour(12), "afternoon");
  assert.equal(bandFromHour(16), "afternoon");
  assert.equal(bandFromHour(17), "evening");
  assert.equal(bandFromHour(23), "evening");
});

test("bandFromDivisionEnum は registry の区分 enum を band に畳む", () => {
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_MORNING"), "morning");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_MORNING_ONE"), "morning");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_MORNING_TWO"), "morning");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_AFTERNOON"), "afternoon");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_AFTERNOON_ONE"), "afternoon");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_AFTERNOON_TWO"), "afternoon");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_EVENING"), "evening");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_EVENING_ONE"), "evening");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_EVENING_TWO"), "evening");
});

test("bandFromDivisionEnum は畳めない enum に null を返す", () => {
  // 北区の時間帯コマ。band に落とす根拠が名前に無い（exact モードで扱う自治体）。
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_DIVISION_1"), null);
  // scraper が変換に失敗したときの値。握り潰さず UNMAPPED に落とすため null。
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_INVALID"), null);
  assert.equal(bandFromDivisionEnum("MORNING"), null); // 接頭辞なしは想定外
  assert.equal(bandFromDivisionEnum(""), null);
});
