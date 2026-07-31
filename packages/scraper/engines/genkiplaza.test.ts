import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSlots,
  dedupeConsecutive,
  parseHeading,
  parseRowLabel,
  zipMonthTables,
} from "./genkiplaza.ts";

/** 1 ヶ月分の行を作る。cells は 1 日から順に並べ、31 列に満たない分は空欄で埋める */
function row(label: string, ...cells: string[]): string[] {
  return [label, ...cells, ...Array(31 - cells.length).fill("")];
}

describe("genkiplaza", () => {
  describe("dedupeConsecutive", () => {
    it("連続する重複を 1 つにまとめる", () => {
      assert.deepEqual(dedupeConsecutive(["a", "a", "b", "b", "b", "c"]), ["a", "b", "c"]);
    });

    it("離れた位置の同値は残す", () => {
      assert.deepEqual(dedupeConsecutive(["a", "b", "a"]), ["a", "b", "a"]);
    });

    it("空配列を許容する", () => {
      assert.deepEqual(dedupeConsecutive([]), []);
    });
  });

  describe("parseHeading", () => {
    it("見出しから年月を取り出す", () => {
      assert.deepEqual(parseHeading("2026年7月"), { year: 2026, month: 7 });
    });

    it("年跨ぎの見出しを取り出す", () => {
      assert.deepEqual(parseHeading("2027年1月"), { year: 2027, month: 1 });
    });

    it("形式が違えば undefined を返す", () => {
      assert.equal(parseHeading("令和8年7月"), undefined);
      assert.equal(parseHeading(""), undefined);
    });
  });

  describe("parseRowLabel", () => {
    it("部屋名と区分に分解する", () => {
      assert.deepEqual(parseRowLabel("第一ホール＜午前＞"), {
        roomName: "第一ホール",
        division: "午前",
      });
    });

    it("和室の行も分解する", () => {
      assert.deepEqual(parseRowLabel("第三和室＜夜間＞"), {
        roomName: "第三和室",
        division: "夜間",
      });
    });

    it("区分の括弧が無い行（日付ヘッダー等）は undefined を返す", () => {
      assert.equal(parseRowLabel(""), undefined);
      assert.equal(parseRowLabel("第一ホール"), undefined);
    });
  });

  describe("zipMonthTables", () => {
    it("重複した見出しをまとめてテーブルと対応づける", () => {
      const result = zipMonthTables({
        headings: ["2026年7月", "2026年7月", "2026年8月", "2026年8月", "2026年8月"],
        tables: [[row("第一ホール＜午前＞", "◎")], [row("第一ホール＜午前＞", "×")]],
      });
      assert.equal(result.length, 2);
      assert.equal(result[0]?.heading, "2026年7月");
      assert.equal(result[1]?.heading, "2026年8月");
    });

    it("見出しとテーブルの数が食い違ったら投げる", () => {
      assert.throws(
        () =>
          zipMonthTables({
            headings: ["2026年7月"],
            tables: [[row("第一ホール＜午前＞", "◎")], [row("第一ホール＜午前＞", "×")]],
          }),
        /月見出し/
      );
    });
  });

  describe("buildSlots", () => {
    const rooms = ["第一ホール", "第二ホール"];

    it("部屋 × 日 × 区分の RawSlot を組み立てる", () => {
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎", "×", "－")] }],
        rooms,
        "2026-07-01"
      );
      assert.deepEqual(slots, [
        { roomName: "第一ホール", date: "2026-07-01", division: "午前", status: "◎" },
        { roomName: "第一ホール", date: "2026-07-02", division: "午前", status: "×" },
        { roomName: "第一ホール", date: "2026-07-03", division: "午前", status: "－" },
      ]);
    });

    it("空欄のセルは行にしない（未公開の月）", () => {
      const slots = buildSlots(
        [{ heading: "2026年11月", rows: [row("第一ホール＜午前＞")] }],
        rooms,
        "2026-07-01"
      );
      assert.deepEqual(slots, []);
    });

    it("実在しない日付は捨てる（30 日の月の 31 列目）", () => {
      const cells = Array(31).fill("◎") as string[];
      const slots = buildSlots(
        [{ heading: "2026年9月", rows: [["第一ホール＜午前＞", ...cells]] }],
        rooms,
        "2026-09-01"
      );
      assert.equal(slots.length, 30);
      assert.equal(slots.at(-1)?.date, "2026-09-30");
    });

    it("対象外の部屋の行は捨てる", () => {
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [row("第三和室＜夜間＞", "◎")] }],
        rooms,
        "2026-07-01"
      );
      assert.deepEqual(slots, []);
    });

    it("minDate より前の日付は捨てる", () => {
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎", "◎", "◎")] }],
        rooms,
        "2026-07-03"
      );
      assert.deepEqual(slots, [
        { roomName: "第一ホール", date: "2026-07-03", division: "午前", status: "◎" },
      ]);
    });

    it("日付ヘッダー行を読み飛ばす", () => {
      const header = ["", ...Array.from({ length: 31 }, (_, i) => String(i + 1))];
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [header, row("第一ホール＜午前＞", "◎")] }],
        rooms,
        "2026-07-01"
      );
      assert.equal(slots.length, 1);
      assert.equal(slots[0]?.status, "◎");
    });

    it("見出しが読めなければ投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [{ heading: "", rows: [row("第一ホール＜午前＞", "◎")] }],
            rooms,
            "2026-07-01"
          ),
        /月見出し/
      );
    });

    it("テーブルが連続した月になっていなければ投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [
              { heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎")] },
              { heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎")] },
            ],
            rooms,
            "2026-07-01"
          ),
        /連続した月/
      );
    });

    it("12 月の次が翌年 1 月なら受け入れる", () => {
      const slots = buildSlots(
        [
          { heading: "2026年12月", rows: [row("第一ホール＜午前＞", "◎")] },
          { heading: "2027年1月", rows: [row("第一ホール＜午前＞", "×")] },
        ],
        rooms,
        "2026-12-01"
      );
      assert.deepEqual(slots, [
        { roomName: "第一ホール", date: "2026-12-01", division: "午前", status: "◎" },
        { roomName: "第一ホール", date: "2027-01-01", division: "午前", status: "×" },
      ]);
    });
  });
});
