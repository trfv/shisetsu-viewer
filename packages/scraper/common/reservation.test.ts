import assert from "node:assert/strict";
import { test } from "node:test";
import type { Division, Status } from "./types.ts";
import { rawSlotsToOutput } from "./reservation.ts";

const DIVISION_MAP: Record<string, Division> = {
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
};

const STATUS_MAP: Record<string, Status> = {
  "○": "RESERVATION_STATUS_VACANT",
  "×": "RESERVATION_STATUS_STATUS_1",
};

test("部屋 × 日付でグルーピングして時間区分をマージする", () => {
  const output = rawSlotsToOutput(
    [
      { roomName: "音楽室", date: "2026-07-06", division: "午前", status: "○" },
      { roomName: "音楽室", date: "2026-07-06", division: "午後", status: "×" },
      { roomName: "音楽室", date: "2026-07-07", division: "午前", status: "○" },
    ],
    DIVISION_MAP,
    STATUS_MAP
  );
  assert.deepEqual(output, [
    {
      room_name: "音楽室",
      date: "2026-07-06",
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
        RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
      },
    },
    {
      room_name: "音楽室",
      date: "2026-07-07",
      reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" },
    },
  ]);
});

test("マップに無い値は INVALID にフォールバックする（undefined キーを作らない）", () => {
  const output = rawSlotsToOutput(
    [{ roomName: "A", date: "2026-07-06", division: "未知の区分", status: "未知の状態" }],
    DIVISION_MAP,
    STATUS_MAP
  );
  assert.deepEqual(output[0]?.reservation, {
    RESERVATION_DIVISION_INVALID: "RESERVATION_STATUS_INVALID",
  });
  assert.ok(!Object.keys(output[0]?.reservation ?? {}).includes("undefined"));
});

test("部屋名 → 日付で安定ソートされる", () => {
  const output = rawSlotsToOutput(
    [
      { roomName: "B室", date: "2026-07-06", division: "午前", status: "○" },
      { roomName: "A室", date: "2026-07-07", division: "午前", status: "○" },
      { roomName: "A室", date: "2026-07-06", division: "午前", status: "○" },
    ],
    DIVISION_MAP,
    STATUS_MAP
  );
  assert.deepEqual(
    output.map((o) => `${o.room_name} ${o.date}`),
    ["A室 2026-07-06", "A室 2026-07-07", "B室 2026-07-06"]
  );
});
