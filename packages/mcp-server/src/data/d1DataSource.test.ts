import type { Page, ReservationDto } from "@shisetsu-viewer/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@shisetsu-viewer/api/db/queries", () => ({
  listInstitutions: vi.fn(),
  getInstitutionDetail: vi.fn(),
  listInstitutionReservations: vi.fn(),
  searchReservations: vi.fn(),
  loadHolidays: vi.fn(),
}));

import {
  getInstitutionDetail,
  listInstitutionReservations,
  listInstitutions,
  loadHolidays,
  searchReservations,
} from "@shisetsu-viewer/api/db/queries";

import { createD1DataSource } from "./d1DataSource.ts";

const db = {} as D1Database;

function reservation(date: string): ReservationDto {
  return {
    institution_id: "i1",
    date,
    reservation: {},
    is_holiday: false,
    is_morning_vacant: true,
    is_afternoon_vacant: true,
    is_evening_vacant: true,
    updated_at: "2026-07-01T00:00:00Z",
  };
}

function page<T>(items: T[], endCursor: string | null): Page<T> {
  return { items, pageInfo: { hasNextPage: endCursor !== null, endCursor } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadHolidays).mockResolvedValue([]);
});

describe("createD1DataSource", () => {
  it("delegates listInstitutions to the api query with the same db", async () => {
    const expected = page([{ id: "x" }], null) as never;
    vi.mocked(listInstitutions).mockResolvedValue(expected);
    const ds = createD1DataSource(db);
    const result = await ds.listInstitutions({ limit: 10 });
    expect(listInstitutions).toHaveBeenCalledWith(db, { limit: 10 });
    expect(result).toBe(expected);
  });

  it("delegates getInstitutionDetail", async () => {
    vi.mocked(getInstitutionDetail).mockResolvedValue(null);
    const ds = createD1DataSource(db);
    expect(await ds.getInstitutionDetail("id1")).toBeNull();
    expect(getInstitutionDetail).toHaveBeenCalledWith(db, "id1");
  });

  it("drains all reservation pages and loads holidays once", async () => {
    vi.mocked(listInstitutionReservations)
      .mockResolvedValueOnce(page([reservation("2026-08-01")], "cur1"))
      .mockResolvedValueOnce(page([reservation("2026-08-02")], null));
    const ds = createD1DataSource(db);
    const rows = await ds.getInstitutionReservations("id1", { startDate: "2026-08-01" });
    expect(rows.map((r) => r.date)).toEqual(["2026-08-01", "2026-08-02"]);
    expect(loadHolidays).toHaveBeenCalledTimes(1);
    expect(listInstitutionReservations).toHaveBeenCalledTimes(2);
    // 2 回目はカーソルを引き継ぐ
    expect(vi.mocked(listInstitutionReservations).mock.calls[1]?.[2]).toMatchObject({
      cursor: "cur1",
    });
  });

  it("passes holidays into searchReservations", async () => {
    vi.mocked(loadHolidays).mockResolvedValue(["2026-08-11"]);
    const expected = page([], null) as never;
    vi.mocked(searchReservations).mockResolvedValue(expected);
    const ds = createD1DataSource(db);
    await ds.searchReservations({ startDate: "2026-08-01", endDate: "2026-08-07" });
    expect(searchReservations).toHaveBeenCalledWith(
      db,
      { startDate: "2026-08-01", endDate: "2026-08-07" },
      ["2026-08-11"]
    );
  });
});
