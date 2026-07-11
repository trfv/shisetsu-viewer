import assert from "node:assert/strict";
import { test } from "node:test";
import { isWithinMaintenanceWindow } from "./maintenanceWindow.ts";

// UTC 時刻から JST 時を作るヘルパ（JST = UTC + 9）
function atJstHour(hour: number): Date {
  const utcHour = (hour - 9 + 24) % 24;
  return new Date(Date.UTC(2026, 6, 11, utcHour, 30, 0));
}

test("窓 [2,5): 開始時は含む、終了時は含まない（半開区間）", () => {
  assert.equal(isWithinMaintenanceWindow([2, 5], atJstHour(1)), false);
  assert.equal(isWithinMaintenanceWindow([2, 5], atJstHour(2)), true);
  assert.equal(isWithinMaintenanceWindow([2, 5], atJstHour(3)), true);
  assert.equal(isWithinMaintenanceWindow([2, 5], atJstHour(4)), true);
  assert.equal(isWithinMaintenanceWindow([2, 5], atJstHour(5)), false);
  assert.equal(isWithinMaintenanceWindow([2, 5], atJstHour(13)), false);
});

test("日跨ぎ窓 [22,5): 22時〜翌4時を含む", () => {
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(21)), false);
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(22)), true);
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(23)), true);
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(0)), true);
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(4)), true);
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(5)), false);
  assert.equal(isWithinMaintenanceWindow([22, 5], atJstHour(12)), false);
});

test("UTC→JST 変換が正しい（UTC 17:30 = JST 02:30 は窓内）", () => {
  assert.equal(isWithinMaintenanceWindow([2, 5], new Date(Date.UTC(2026, 6, 11, 17, 30))), true);
  // UTC 04:30 = JST 13:30 は窓外
  assert.equal(isWithinMaintenanceWindow([2, 5], new Date(Date.UTC(2026, 6, 11, 4, 30))), false);
});
