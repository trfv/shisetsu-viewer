import {
  getInstitutionDetail,
  listInstitutionReservations,
  listInstitutions,
  loadHolidays,
  searchReservations,
} from "@shisetsu-viewer/api/db/queries";
import type { ReservationDto } from "@shisetsu-viewer/shared";

import { type DataSource, RESERVATIONS_HARD_CAP } from "./dataSource.ts";

/**
 * Worker 用 DataSource。api の純関数（queries.ts）へ D1 binding で委譲するだけの薄いラッパ。
 * クロージャで db を保持するのみでモジュール状態を持たない。
 */
export function createD1DataSource(db: D1Database): DataSource {
  return {
    listInstitutions: (params) => listInstitutions(db, params),
    getInstitutionDetail: (id) => getInstitutionDetail(db, id),
    async getInstitutionReservations(id, range) {
      // is_holiday はクエリ時導出。祝日集合は 1 回だけ読む。
      const holidays = await loadHolidays(db);
      const items: ReservationDto[] = [];
      let cursor: string | undefined;
      do {
        const page = await listInstitutionReservations(
          db,
          id,
          { startDate: range.startDate, endDate: range.endDate, limit: 100, cursor },
          holidays
        );
        items.push(...page.items);
        cursor = page.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? undefined) : undefined;
      } while (cursor && items.length < RESERVATIONS_HARD_CAP);
      return items.slice(0, RESERVATIONS_HARD_CAP);
    },
    async searchReservations(params) {
      const holidays = await loadHolidays(db);
      return searchReservations(db, params, holidays);
    },
  };
}
