import { describe, it, expect } from "vitest";
import { MUNICIPALITIES, ReservationStatus } from "@shisetsu-viewer/shared";

const municipalities = Object.values(MUNICIPALITIES).map((m) => ({
  name: m.label,
  status: m.reservationStatus,
  division: m.reservationDivision,
  fee: m.feeDivision,
}));

describe("municipality constants", () => {
  it.each(municipalities)("$nameの予約ステータスにVACANTが含まれる", ({ status }) => {
    expect(status[ReservationStatus.VACANT]).toBeDefined();
  });

  it.each(municipalities)("$nameの予約区分が空でない", ({ division }) => {
    expect(Object.keys(division).length).toBeGreaterThan(0);
  });

  it.each(municipalities)("$nameの料金区分が空でない", ({ fee }) => {
    expect(Object.keys(fee).length).toBeGreaterThan(0);
  });

  it.each(municipalities)("$nameのステータス値がすべて文字列である", ({ status }) => {
    Object.values(status).forEach((value) => {
      expect(typeof value).toBe("string");
    });
  });
});
