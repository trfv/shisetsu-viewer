import assert from "node:assert/strict";
import { test } from "node:test";

import type { RawSlot } from "../common/reservation.ts";
import { keepDatesCoveredByAllDivisions, webrGrandHooks } from "./webrGrand.ts";

const DIVISIONS = ["午前", "午後", "夜間"];

function table(division: string, startDay: number, days: number) {
  const dateCells = Array.from({ length: days }, (_, i) => `${startDay + i}\n土`);
  return { division, header: ["2026年10月", "定員", ...dateCells], rows: [] };
}

function slots(division: string, dates: string[]): RawSlot[] {
  return dates.map((date) => ({ roomName: "スタジオＡ", date, division, status: "○" }));
}

test("全区分のパスが同じ日付まで取れていれば、そのまま返す", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const input = DIVISIONS.flatMap((d) => slots(d, ["2026-10-17", "2026-10-18"]));
  const output = keepDatesCoveredByAllDivisions(
    input,
    DIVISIONS.map((d) => table(d, 17, 2)),
    DIVISIONS
  );
  assert.deepEqual(output, input);
  assert.equal(warn.mock.callCount(), 0);
});

test("1 区分だけ途中で切れたら、切れた先の日付は全区分ぶん落とす", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const output = keepDatesCoveredByAllDivisions(
    [
      ...slots("午前", ["2026-10-17", "2026-10-18", "2026-10-19"]),
      ...slots("午後", ["2026-10-17", "2026-10-18", "2026-10-19"]),
      ...slots("夜間", ["2026-10-17"]),
    ],
    [table("午前", 17, 3), table("午後", 17, 3), table("夜間", 17, 1)],
    DIVISIONS
  );
  assert.deepEqual([...new Set(output.map((s) => s.date))], ["2026-10-17"]);
  assert.equal(output.length, 3);
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0]?.arguments[0]), /夜間=1/);
});

test("部屋行が 0 件のパスでも、見出しの日付が揃っていれば落とさない", (t) => {
  t.mock.method(console, "warn", () => {});
  const output = keepDatesCoveredByAllDivisions(
    [...slots("午前", ["2026-10-17"]), ...slots("午後", ["2026-10-17"])],
    DIVISIONS.map((d) => table(d, 17, 1)),
    DIVISIONS
  );
  assert.equal(output.length, 2);
});

test("1 区分のパスが 1 ページも取れなければ、何も返さない（D1 の前回値を残す）", (t) => {
  t.mock.method(console, "warn", () => {});
  const output = keepDatesCoveredByAllDivisions(
    [...slots("午前", ["2026-10-17"]), ...slots("午後", ["2026-10-17"])],
    [table("午前", 17, 1), table("午後", 17, 1)],
    DIVISIONS
  );
  assert.deepEqual(output, []);
});

const hooks = webrGrandHooks({
  baseUrl: "https://example.test/",
  categoryMap: {},
  divisionMap: {
    "": "RESERVATION_DIVISION_INVALID",
    午前: "RESERVATION_DIVISION_MORNING",
    午後: "RESERVATION_DIVISION_AFTERNOON",
    夜間: "RESERVATION_DIVISION_EVENING",
  },
  statusMap: { "": "RESERVATION_STATUS_INVALID", "○": "RESERVATION_STATUS_VACANT" },
});

function roomTables() {
  return DIVISIONS.map((division) => ({
    division,
    header: ["2026年10月", "定員", "17\n土"],
    rows: [
      ["音楽室 定員30", "30", "○"],
      ["和室 定員20", "20", "○"],
    ],
  }));
}

test("rooms を指定すると、その部屋の行だけを返す", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const output = hooks.transform(roomTables(), { facilityName: "館", rooms: ["音楽室"] });
  assert.deepEqual(
    output.map((o) => o.room_name),
    ["音楽室"]
  );
  assert.equal(warn.mock.callCount(), 0);
});

test("rooms を指定しなければ、全部屋の行を返す", () => {
  const output = hooks.transform(roomTables(), { facilityName: "館" });
  assert.deepEqual(output.map((o) => o.room_name).sort(), ["和室", "音楽室"]);
});

test("rooms にある部屋が表に無ければ警告する", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  hooks.transform(roomTables(), { facilityName: "館", rooms: ["音楽室", "練習室"] });
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0]?.arguments[0]), /練習室/);
});
