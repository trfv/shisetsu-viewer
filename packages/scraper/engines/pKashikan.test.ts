import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSlots, formatKomaTime, parseHeading, type PKashikanRawPage } from "./pKashikan.ts";

const target = {
  facilityName: "ココキタ",
  roomName: "スタジオ1",
  komas: ["9:00-11:45", "12:00-14:45", "15:00-17:45", "18:00-20:45"],
};

/** 実サイトの見出し（全角チルダ・NBSP・タブを含む） */
const HEADING = "2026(令和 8)年12月30日 (水)～  スタジオ1 (80人)";

function page(rows: PKashikanRawPage["rows"]): PKashikanRawPage {
  return { heading: HEADING, rows };
}

function cells(...texts: string[]): { text: string; time: string }[] {
  return texts.map((text) => ({ text, time: "" }));
}

describe("p-kashikan", () => {
  describe("parseHeading", () => {
    it("先頭日と室場名を取り出す", () => {
      assert.deepEqual(parseHeading(HEADING), { startDate: "2026-12-30", roomName: "スタジオ1" });
    });

    it("1 桁の月日と、室場名の前方一致を区別する", () => {
      assert.deepEqual(parseHeading("2027(令和 9)年 1月 5日 (火)～  音楽スタジオ1 (8人)"), {
        startDate: "2027-01-05",
        roomName: "音楽スタジオ1",
      });
    });

    it("形式が違えば undefined", () => {
      assert.equal(parseHeading("ココキタ 施設詳細"), undefined);
    });
  });

  describe("formatKomaTime", () => {
    it("先頭ゼロを落として区切る", () => {
      assert.equal(formatKomaTime("09001145"), "9:00-11:45");
      assert.equal(formatKomaTime("19002045"), "19:00-20:45");
    });

    it("8 桁でなければ undefined", () => {
      assert.equal(formatKomaTime("0900"), undefined);
    });
  });

  describe("buildSlots", () => {
    it("行の位置から日付を、セルの位置からコマを決める（年跨ぎを含む）", () => {
      const slots = buildSlots(
        [
          page([
            {
              label: "12/30 (水)",
              cells: [{ text: "○", time: "09001145" }, ...cells("×", "×", "-")],
            },
            { label: "12/31 (木)", cells: cells("×", "×", "×", "×") },
            { label: "1/1 (金)", cells: cells("×", "×", "×", "×") },
          ]),
        ],
        target,
        "2026-12-30",
        "2027-01-01"
      );
      assert.equal(slots.length, 12);
      assert.deepEqual(slots[0], {
        roomName: "スタジオ1",
        date: "2026-12-30",
        division: "9:00-11:45",
        status: "○",
      });
      assert.deepEqual(slots[3]?.division, "18:00-20:45");
      assert.equal(slots[11]?.date, "2027-01-01");
    });

    it("休館の 1 セル行は全コマを休館にする", () => {
      const slots = buildSlots(
        [page([{ label: "12/30 (水)", cells: cells("休館") }])],
        target,
        "2026-12-30",
        "2026-12-30"
      );
      assert.deepEqual(
        slots.map((s) => [s.division, s.status]),
        target.komas.map((k) => [k, "休館"])
      );
    });

    it("保守の 1 セル行も全コマに広げる", () => {
      const slots = buildSlots(
        [page([{ label: "12/30 (水)", cells: cells("保守") }])],
        target,
        "2026-12-30",
        "2026-12-30"
      );
      assert.deepEqual(
        slots.map((s) => s.status),
        target.komas.map(() => "保守")
      );
    });

    it("[minDate, maxDate] の外は捨てる", () => {
      const slots = buildSlots(
        [
          page([
            { label: "12/30 (水)", cells: cells("×", "×", "×", "×") },
            { label: "12/31 (木)", cells: cells("×", "×", "×", "×") },
            { label: "1/1 (金)", cells: cells("-", "-", "-", "-") },
          ]),
        ],
        target,
        "2026-12-31",
        "2026-12-31"
      );
      assert.deepEqual([...new Set(slots.map((s) => s.date))], ["2026-12-31"]);
    });

    it("行の日付表示が連番とずれたら投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [page([{ label: "12/31 (木)", cells: cells("×", "×", "×", "×") }])],
            target,
            "2026-12-30",
            "2026-12-31"
          ),
        /日付表示/
      );
    });

    it("コマ数が想定と違えば投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [page([{ label: "12/30 (水)", cells: cells("×", "×", "×") }])],
            target,
            "2026-12-30",
            "2026-12-30"
          ),
        /コマ数/
      );
    });

    it("○ セルの時刻がコマ表と違えば投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [
              page([
                {
                  label: "12/30 (水)",
                  cells: [...cells("×"), { text: "○", time: "13001545" }, ...cells("×", "×")],
                },
              ]),
            ],
            target,
            "2026-12-30",
            "2026-12-30"
          ),
        /2 コマ目の時刻/
      );
    });

    it("表示中の室場が対象と違えば投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [{ heading: HEADING.replace("スタジオ1", "音楽スタジオ1"), rows: [] }],
            target,
            "2026-12-30",
            "2026-12-30"
          ),
        /室場/
      );
    });
  });
});
