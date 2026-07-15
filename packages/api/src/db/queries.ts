import type {
  InstitutionDetail,
  InstitutionSummary,
  InstitutionsQueryParams,
  Page,
  ReservationDto,
  ReservationSearchHit,
  ReservationSearchQueryParams,
  ScrapeRun,
  UsageFeeEntry,
} from "@shisetsu-viewer/shared";
import { decodeCursor, encodeCursor } from "./cursor.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const AVAILABLE = "AVAILABILITY_DIVISION_AVAILABLE";

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

/** SQLite の 0/1 を boolean に */
function toBool(value: unknown): boolean {
  return value === 1 || value === "1" || value === true;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// ---- institutions ----

interface InstitutionRow {
  id: string;
  prefecture: string;
  municipality: string;
  building: string;
  institution: string;
  building_kana: string;
  institution_kana: string;
  building_system_name: string;
  institution_system_name: string;
  capacity: number | null;
  area: number | null;
  institution_size: string;
  fee_divisions: string;
  weekday_usage_fee: string;
  holiday_usage_fee: string;
  address: string;
  is_available_strings: string;
  is_available_woodwind: string;
  is_available_brass: string;
  is_available_percussion: string;
  is_equipped_music_stand: string;
  is_equipped_piano: string;
  website_url: string;
  layout_image_url: string;
  lottery_period: string;
  note: string;
  updated_at: string;
}

function toInstitutionDetail(row: InstitutionRow): InstitutionDetail {
  return {
    id: row.id,
    prefecture: row.prefecture,
    municipality: row.municipality,
    building: row.building,
    institution: row.institution,
    building_kana: row.building_kana,
    institution_kana: row.institution_kana,
    building_system_name: row.building_system_name,
    institution_system_name: row.institution_system_name,
    capacity: row.capacity,
    area: row.area,
    institution_size: row.institution_size,
    fee_divisions: parseJsonArray<string>(row.fee_divisions),
    weekday_usage_fee: parseJsonArray<UsageFeeEntry>(row.weekday_usage_fee),
    holiday_usage_fee: parseJsonArray<UsageFeeEntry>(row.holiday_usage_fee),
    address: row.address,
    is_available_strings: row.is_available_strings,
    is_available_woodwind: row.is_available_woodwind,
    is_available_brass: row.is_available_brass,
    is_available_percussion: row.is_available_percussion,
    is_equipped_music_stand: row.is_equipped_music_stand,
    is_equipped_piano: row.is_equipped_piano,
    website_url: row.website_url,
    layout_image_url: row.layout_image_url,
    lottery_period: row.lottery_period,
    note: row.note,
    updated_at: row.updated_at,
  };
}

function toInstitutionSummary(row: InstitutionRow): InstitutionSummary {
  return {
    id: row.id,
    municipality: row.municipality,
    building: row.building,
    institution: row.institution,
    institution_size: row.institution_size,
    is_available_strings: row.is_available_strings,
    is_available_woodwind: row.is_available_woodwind,
    is_available_brass: row.is_available_brass,
    is_available_percussion: row.is_available_percussion,
    is_equipped_music_stand: row.is_equipped_music_stand,
    is_equipped_piano: row.is_equipped_piano,
    updated_at: row.updated_at,
  };
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

export async function listInstitutions(
  db: D1Database,
  params: InstitutionsQueryParams
): Promise<Page<InstitutionSummary>> {
  const limit = clampLimit(params.limit);
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (params.municipality && params.municipality.length > 0) {
    conditions.push(`municipality IN (${placeholders(params.municipality.length)})`);
    args.push(...params.municipality);
  }
  const availabilityFilters: [boolean | undefined, string][] = [
    [params.isAvailableStrings, "is_available_strings"],
    [params.isAvailableWoodwind, "is_available_woodwind"],
    [params.isAvailableBrass, "is_available_brass"],
    [params.isAvailablePercussion, "is_available_percussion"],
  ];
  for (const [flag, column] of availabilityFilters) {
    if (flag === true) {
      conditions.push(`${column} = ?`);
      args.push(AVAILABLE);
    }
  }
  if (params.institutionSizes && params.institutionSizes.length > 0) {
    conditions.push(`institution_size IN (${placeholders(params.institutionSizes.length)})`);
    args.push(...params.institutionSizes);
  }
  if (params.cursor) {
    const c = decodeCursor(params.cursor);
    if (c) {
      conditions.push(`(municipality, building_kana, institution_kana, id) > (?, ?, ?, ?)`);
      args.push(c["municipality"], c["building_kana"], c["institution_kana"], c["id"]);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT * FROM institutions
    ${where}
    ORDER BY municipality, building_kana, institution_kana, id
    LIMIT ?`;
  args.push(limit + 1);

  const { results } = await db
    .prepare(sql)
    .bind(...args)
    .all<InstitutionRow>();
  const hasNextPage = results.length > limit;
  const page = hasNextPage ? results.slice(0, limit) : results;
  const last = page.at(-1);
  return {
    items: page.map(toInstitutionSummary),
    pageInfo: {
      hasNextPage,
      endCursor:
        hasNextPage && last
          ? encodeCursor({
              municipality: last.municipality,
              building_kana: last.building_kana,
              institution_kana: last.institution_kana,
              id: last.id,
            })
          : null,
    },
  };
}

export async function getInstitutionDetail(
  db: D1Database,
  id: string
): Promise<InstitutionDetail | null> {
  const row = await db
    .prepare(`SELECT * FROM institutions WHERE id = ?`)
    .bind(id)
    .first<InstitutionRow>();
  return row ? toInstitutionDetail(row) : null;
}

// ---- reservations ----

interface ReservationRow {
  institution_id: string;
  date: string;
  reservation: string;
  is_holiday: number;
  is_morning_vacant: number;
  is_afternoon_vacant: number;
  is_evening_vacant: number;
  updated_at: string;
}

function toReservationDto(row: ReservationRow): ReservationDto {
  return {
    institution_id: row.institution_id,
    date: row.date,
    reservation: parseReservation(row.reservation),
    is_holiday: toBool(row.is_holiday),
    is_morning_vacant: toBool(row.is_morning_vacant),
    is_afternoon_vacant: toBool(row.is_afternoon_vacant),
    is_evening_vacant: toBool(row.is_evening_vacant),
    updated_at: row.updated_at,
  };
}

function parseReservation(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** is_holiday のクエリ時導出に使う祝日集合。~100 行。 */
export async function loadHolidays(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare(`SELECT date FROM holidays`).all<{ date: string }>();
  return results.map((r) => r.date);
}

/** 土日 OR 祝日リスト（json_each でバインド）を is_holiday として導出する SQL 断片 */
const IS_HOLIDAY_EXPR = (dateCol: string) =>
  `(strftime('%w', ${dateCol}) IN ('0', '6') OR ${dateCol} IN (SELECT value FROM json_each(?)))`;

export async function listInstitutionReservations(
  db: D1Database,
  id: string,
  params: {
    startDate?: string | undefined;
    endDate?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
  },
  holidays: string[]
): Promise<Page<ReservationDto>> {
  const limit = clampLimit(params.limit);
  const conditions: string[] = [`institution_id = ?`];
  const args: unknown[] = [JSON.stringify(holidays), id];
  if (params.startDate) {
    conditions.push(`date >= ?`);
    args.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push(`date <= ?`);
    args.push(params.endDate);
  }
  if (params.cursor) {
    const c = decodeCursor(params.cursor);
    if (c) {
      conditions.push(`date > ?`);
      args.push(c["date"]);
    }
  }
  const sql = `
    SELECT institution_id, date, reservation,
           is_morning_vacant, is_afternoon_vacant, is_evening_vacant, updated_at,
           ${IS_HOLIDAY_EXPR("date")} AS is_holiday
    FROM reservations
    WHERE ${conditions.join(" AND ")}
    ORDER BY date
    LIMIT ?`;
  args.push(limit + 1);

  const { results } = await db
    .prepare(sql)
    .bind(...args)
    .all<ReservationRow>();
  const hasNextPage = results.length > limit;
  const rows = hasNextPage ? results.slice(0, limit) : results;
  const last = rows.at(-1);
  return {
    items: rows.map(toReservationDto),
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage && last ? encodeCursor({ date: last.date }) : null,
    },
  };
}

interface SearchRow extends ReservationRow {
  i_id: string;
  i_municipality: string;
  i_building: string;
  i_institution: string;
  i_institution_size: string;
}

export async function searchReservations(
  db: D1Database,
  params: ReservationSearchQueryParams,
  holidays: string[]
): Promise<Page<ReservationSearchHit>> {
  const limit = clampLimit(params.limit);
  const conditions: string[] = [`r.date >= ?`, `r.date <= ?`];
  // ?1 = 祝日配列（is_holiday SELECT 式で使用）、その後に date 範囲
  const args: unknown[] = [JSON.stringify(holidays), params.startDate, params.endDate];

  if (params.municipality && params.municipality.length > 0) {
    conditions.push(`i.municipality IN (${placeholders(params.municipality.length)})`);
    args.push(...params.municipality);
  }
  if (params.isHoliday === true) {
    conditions.push(IS_HOLIDAY_EXPR("r.date"));
    args.push(JSON.stringify(holidays));
  }
  const vacancyFilters: [boolean | undefined, string][] = [
    [params.isMorningVacant, "r.is_morning_vacant"],
    [params.isAfternoonVacant, "r.is_afternoon_vacant"],
    [params.isEveningVacant, "r.is_evening_vacant"],
  ];
  for (const [flag, column] of vacancyFilters) {
    if (flag === true) {
      conditions.push(`${column} = 1`);
    }
  }
  const availabilityFilters: [boolean | undefined, string][] = [
    [params.isAvailableStrings, "i.is_available_strings"],
    [params.isAvailableWoodwind, "i.is_available_woodwind"],
    [params.isAvailableBrass, "i.is_available_brass"],
    [params.isAvailablePercussion, "i.is_available_percussion"],
  ];
  for (const [flag, column] of availabilityFilters) {
    if (flag === true) {
      conditions.push(`${column} = ?`);
      args.push(AVAILABLE);
    }
  }
  if (params.institutionSizes && params.institutionSizes.length > 0) {
    conditions.push(`i.institution_size IN (${placeholders(params.institutionSizes.length)})`);
    args.push(...params.institutionSizes);
  }
  if (params.cursor) {
    const c = decodeCursor(params.cursor);
    if (c) {
      conditions.push(`(r.date, r.institution_id) > (?, ?)`);
      args.push(c["date"], c["institution_id"]);
    }
  }

  const sql = `
    SELECT r.institution_id, r.date, r.reservation, r.updated_at,
           r.is_morning_vacant, r.is_afternoon_vacant, r.is_evening_vacant,
           ${IS_HOLIDAY_EXPR("r.date")} AS is_holiday,
           i.id AS i_id, i.municipality AS i_municipality, i.building AS i_building,
           i.institution AS i_institution, i.institution_size AS i_institution_size
    FROM reservations r
    JOIN institutions i ON i.id = r.institution_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY r.date, r.institution_id
    LIMIT ?`;
  args.push(limit + 1);

  const { results } = await db
    .prepare(sql)
    .bind(...args)
    .all<SearchRow>();
  const hasNextPage = results.length > limit;
  const rows = hasNextPage ? results.slice(0, limit) : results;
  const last = rows.at(-1);
  return {
    items: rows.map((row) => ({
      reservation: toReservationDto(row),
      institution: {
        id: row.i_id,
        municipality: row.i_municipality,
        building: row.i_building,
        institution: row.i_institution,
        institution_size: row.i_institution_size,
      },
    })),
    pageInfo: {
      hasNextPage,
      endCursor:
        hasNextPage && last
          ? encodeCursor({ date: last.date, institution_id: last.institution_id })
          : null,
    },
  };
}

export async function listScrapeRuns(db: D1Database): Promise<ScrapeRun[]> {
  const { results } = await db
    .prepare(
      `SELECT municipality, MAX(fetched_at) AS fetched_at FROM scrape_runs GROUP BY municipality`
    )
    .all<{ municipality: string; fetched_at: string }>();
  return results.map((r) => ({ municipality: r.municipality, fetched_at: r.fetched_at }));
}
