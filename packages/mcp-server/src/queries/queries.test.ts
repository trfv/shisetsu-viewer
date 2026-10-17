import type { ReservationDto } from "@shisetsu-viewer/shared";
import { describe, expect, it, vi } from "vitest";

import type { DataSource } from "../data/dataSource.ts";
import {
  executeGetInstitutionReservations,
  getInstitutionReservationsInput,
} from "./getInstitutionReservations.ts";
import { executeListInstitutions, listInstitutionsInput } from "./listInstitutions.ts";
import { executeSearchReservations, searchReservationsInput } from "./searchReservations.ts";

const INSTITUTION_ID = "00000000-0000-0000-0000-000000000001";

const reservation: ReservationDto = {
  institution_id: INSTITUTION_ID,
  date: "2026-11-01",
  reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" },
  is_holiday: true,
  is_morning_vacant: true,
  is_afternoon_vacant: false,
  is_evening_vacant: false,
  updated_at: "2026-10-01T00:00:00Z",
};

const emptyPage = { items: [], pageInfo: { hasNextPage: false, endCursor: null } };

function fakeDataSource(overrides: Partial<DataSource>): DataSource {
  return {
    listInstitutions: vi.fn(async () => emptyPage),
    getInstitutionDetail: vi.fn(async () => null),
    getInstitutionReservations: vi.fn(async () => []),
    searchReservations: vi.fn(async () => emptyPage),
    ...overrides,
  };
}

describe("楽器フィルタ", () => {
  it('true と文字列の "true" はフィルタとして送り、false は送らない', async () => {
    const ds = fakeDataSource({});
    await executeListInstitutions(
      listInstitutionsInput.parse({
        isAvailableStrings: "true",
        isAvailableBrass: true,
        isAvailableWoodwind: false,
      }),
      ds
    );
    expect(ds.listInstitutions).toHaveBeenCalledWith(
      expect.objectContaining({
        isAvailableStrings: true,
        isAvailableBrass: true,
        isAvailableWoodwind: undefined,
        isAvailablePercussion: undefined,
        limit: 20,
      })
    );
  });

  it("真偽値として読めない文字列は弾く", () => {
    expect(() => listInstitutionsInput.parse({ isAvailableStrings: "maybe" })).toThrow();
  });
});

describe("fields", () => {
  it("予約は DTO に無いフィールドを選べない", () => {
    expect(() =>
      getInstitutionReservationsInput.parse({
        institutionId: INSTITUTION_ID,
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        fields: ["id"],
      })
    ).toThrow();
  });

  it("省略すると選べるフィールドをすべて返す", async () => {
    const ds = fakeDataSource({ getInstitutionReservations: vi.fn(async () => [reservation]) });
    const result = await executeGetInstitutionReservations(
      getInstitutionReservationsInput.parse({
        institutionId: INSTITUTION_ID,
        startDate: "2026-11-01",
        endDate: "2026-11-30",
      }),
      ds
    );
    expect(result).toEqual({
      reservations: [
        {
          date: reservation.date,
          reservation: reservation.reservation,
          updated_at: reservation.updated_at,
        },
      ],
      count: 1,
    });
  });
});

describe("search_reservations", () => {
  it("時間帯フィルタを API の引数に写し、予約と施設を fields で絞る", async () => {
    const ds = fakeDataSource({
      searchReservations: vi.fn(async () => ({
        items: [
          {
            reservation,
            institution: {
              id: INSTITUTION_ID,
              municipality: "MUNICIPALITY_KOUTOU",
              building: "建物",
              institution: "施設",
              institution_size: "INSTITUTION_SIZE_LARGE",
              division_labels: {},
            },
          },
        ],
        pageInfo: { hasNextPage: true, endCursor: "c1" },
      })),
    });
    const result = await executeSearchReservations(
      searchReservationsInput.parse({
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        isEveningVacant: true,
        isHoliday: false,
        fields: { reservation: ["date"], institution: ["building"] },
        first: 5,
        after: "c0",
      }),
      ds
    );
    expect(ds.searchReservations).toHaveBeenCalledWith(
      expect.objectContaining({
        isEveningVacant: true,
        isHoliday: undefined,
        limit: 5,
        cursor: "c0",
      })
    );
    expect(result).toEqual({
      reservations: [{ reservation: { date: "2026-11-01" }, institution: { building: "建物" } }],
      pageInfo: { hasNextPage: true, endCursor: "c1" },
      count: 1,
    });
  });
});
