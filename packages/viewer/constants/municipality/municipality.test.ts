import { RESERVATION_SYSTEMS, ReservationStatus } from "@shisetsu-viewer/shared";
import { describe, it, expect } from "vitest";

const municipalities = Object.values(RESERVATION_SYSTEMS).map((s) => ({
  name: s.label,
  status: s.reservationStatus,
  division: s.reservationDivision,
  fee: s.feeDivision,
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
