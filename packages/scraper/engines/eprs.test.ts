import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSlots,
  dayNumberToIso,
  type EprsZone,
  isOutOfPeriodWeek,
  parseWeekResponse,
} from "./eprs.ts";

/** useDay を単純に加算するので月を跨がない範囲で使う */
function zone(tzoneName: string, startDay: number, ...alts: string[]): EprsZone {
  return { tzoneName, timeResult: alts.map((alt, index) => ({ useDay: startDay + index, alt })) };
}

describe("eprs", () => {
  describe("parseWeekResponse", () => {
    it("result の時間帯とセルを取り出し、余計なフィールドは捨てる", () => {
      const json = {
        result: [
          {
            tzoneNo: 10,
            tzoneName: "午前",
            timeResult: [
              { useDay: 20261019, alt: "空き", status: 0, startTime: 900, endTime: 1200 },
            ],
          },
        ],
        nextWeekStartDay: 20261026,
      };
      assert.deepEqual(parseWeekResponse(json), [zone("午前", 20261019, "空き")]);
    });

    it("セッション未初期化の ErrManager は投げる", () => {
      assert.throws(
        () => parseWeekResponse({ ErrManager: { message: "システム異常が発生しました。" } }),
        /サーバがエラーを返しました/
      );
    });

    it("result が無い・セルの型が違う場合は投げる", () => {
      assert.throws(() => parseWeekResponse({}), /result がありません/);
      assert.throws(
        () => parseWeekResponse({ result: [{ tzoneName: "午前", timeResult: [{ useDay: "x" }] }] }),
        /セルの形式/
      );
      assert.throws(() => parseWeekResponse("<!doctype html>"), /JSON オブジェクトではありません/);
    });
  });

  describe("dayNumberToIso", () => {
    it("yyyyMMdd を ISO 日付にする", () => {
      assert.equal(dayNumberToIso(20270102), "2027-01-02");
    });

    it("8 桁でなければ投げる", () => {
      assert.throws(() => dayNumberToIso(2027012), /yyyyMMdd/);
    });
  });

  describe("isOutOfPeriodWeek", () => {
    it("全セルが受付期間外なら true", () => {
      const zones = [zone("午前", 20271201, "受付期間外", "受付期間外")];
      assert.equal(isOutOfPeriodWeek(zones, "受付期間外"), true);
    });

    it("1 セルでも受付期間外以外があれば false（受付期間の末尾を含む週は取り込む）", () => {
      const zones = [
        zone("午前", 20271124, "予約あり", "受付期間外"),
        zone("午後", 20271124, "受付期間外", "受付期間外"),
      ];
      assert.equal(isOutOfPeriodWeek(zones, "受付期間外"), false);
    });

    it("セルが無ければ false（構造変化を打ち切りと取り違えない）", () => {
      assert.equal(isOutOfPeriodWeek([], "受付期間外"), false);
    });
  });

  describe("buildSlots", () => {
    it("時間帯 × 日を RawSlot に平坦化する", () => {
      const weeks = [
        {
          startDay: 20261019,
          zones: [
            zone("午前", 20261019, "空き", "予約あり"),
            zone("夜間", 20261019, "保守日", "空き"),
          ],
        },
      ];
      assert.deepEqual(buildSlots(weeks, "第１スタジオ"), [
        { roomName: "第１スタジオ", date: "2026-10-19", division: "午前", status: "空き" },
        { roomName: "第１スタジオ", date: "2026-10-20", division: "午前", status: "予約あり" },
        { roomName: "第１スタジオ", date: "2026-10-19", division: "夜間", status: "保守日" },
        { roomName: "第１スタジオ", date: "2026-10-20", division: "夜間", status: "空き" },
      ]);
    });

    it("要求した開始日と違う週が返ったら投げる（セッションの表示位置ずれ）", () => {
      const weeks = [{ startDay: 20261019, zones: [zone("午前", 20261026, "空き")] }];
      assert.throws(() => buildSlots(weeks, "第１スタジオ"), /20261019 を要求しましたが 20261026/);
    });
  });
});
