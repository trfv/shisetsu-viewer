import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalizeReservation } from "./reservationJson.ts";

test("キーを辞書順に並べ替えて空白なしで直列化する", () => {
  assert.equal(
    canonicalizeReservation({
      RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
      RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
    }),
    '{"RESERVATION_DIVISION_EVENING":"RESERVATION_STATUS_VACANT","RESERVATION_DIVISION_MORNING":"RESERVATION_STATUS_STATUS_1"}'
  );
});

test("キー順だけが違う 2 つのマップは同一の文字列になる（差分検知の要）", () => {
  const a = canonicalizeReservation({ B: "2", A: "1" });
  const b = canonicalizeReservation({ A: "1", B: "2" });
  assert.equal(a, b);
});

test("空のマップは {} になる", () => {
  assert.equal(canonicalizeReservation({}), "{}");
});
