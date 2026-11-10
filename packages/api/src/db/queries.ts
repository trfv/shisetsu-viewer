import type {
  BuildingDetail,
  BuildingDto,
  BuildingsQueryParams,
  InstitutionDetail,
  InstitutionSummary,
  InstitutionsQueryParams,
  Page,
  ReservationDto,
  ReservationExportRow,
  ReservationSearchHit,
  ReservationSearchQueryParams,
  Holiday,
  ScrapeRun,
  UsageFeeEntry,
} from "@shisetsu-viewer/shared";

import { decodeCursor, encodeCursor } from "./cursor.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
// export だけ上限が大きいのは PK 順の走査でページサイズ分しか読まないため。
// search 系は ORDER BY が全件ソートを誘発しうるので 100 に据え置く
const MAX_EXPORT_LIMIT = 1000;
const AVAILABLE = "AVAILABILITY_DIVISION_AVAILABLE";
const NEWLY_VACANT_WINDOW_MS = 24 * 60 * 60 * 1000;

function newlyVacantSince(): string {
  return new Date(Date.now() - NEWLY_VACANT_WINDOW_MS).toISOString();
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

function toBool(value: unknown): boolean {
  return value === 1 || value === "1" || value === true;
}

function parseJsonObject(value: unknown): Record<string, string> {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
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

interface InstitutionRow {
  id: string;
  building_id: string;
  b_prefecture: string;
  b_municipality: string;
  b_name: string;
  b_kana: string;
  b_system_name: string;
  b_address: string;
  institution: string;
  institution_kana: string;
  institution_system_name: string;
  capacity: number | null;
  area: number | null;
  institution_size: string;
  fee_divisions: string;
  weekday_usage_fee: string;
  holiday_usage_fee: string;
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
  division_labels: string;
  updated_at: string;
}

function toInstitutionDetail(row: InstitutionRow): InstitutionDetail {
  return {
    id: row.id,
    building_id: row.building_id,
    prefecture: row.b_prefecture,
    municipality: row.b_municipality,
    building: row.b_name,
    institution: row.institution,
    building_kana: row.b_kana,
    institution_kana: row.institution_kana,
    building_system_name: row.b_system_name,
    institution_system_name: row.institution_system_name,
    capacity: row.capacity,
    area: row.area,
    institution_size: row.institution_size,
    fee_divisions: parseJsonArray<string>(row.fee_divisions),
    weekday_usage_fee: parseJsonArray<UsageFeeEntry>(row.weekday_usage_fee),
    holiday_usage_fee: parseJsonArray<UsageFeeEntry>(row.holiday_usage_fee),
    address: row.b_address,
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
    division_labels: parseJsonObject(row.division_labels),
    updated_at: row.updated_at,
  };
}

function toInstitutionSummary(row: InstitutionRow): InstitutionSummary {
  return {
    id: row.id,
    building_id: row.building_id,
    municipality: row.b_municipality,
    building: row.b_name,
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

// 鍵が欠けた旧形式のカーソルは null にし、呼び出し側で先頭ページとして扱う
function cursorValues(cursor: string | undefined, keys: readonly string[]): string[] | null {
  if (!cursor) return null;
  const c = decodeCursor(cursor);
  if (!c) return null;
  const values = keys.map((k) => c[k]);
  return values.every((v) => v !== undefined) ? (values as string[]) : null;
}

function pushIn(
  conditions: string[],
  args: unknown[],
  column: string,
  values: string[] | undefined
): void {
  if (values && values.length > 0) {
    conditions.push(`${column} IN (${placeholders(values.length)})`);
    args.push(...values);
  }
}

// 部屋の行にある建物の欄（building / address など）は写しなので読まない。b_ 接頭辞で buildings から引く
const INSTITUTION_COLUMNS = `
  i.*, b.prefecture AS b_prefecture, b.municipality AS b_municipality, b.name AS b_name,
  b.kana AS b_kana, b.system_name AS b_system_name, b.address AS b_address`;

// CROSS JOIN で建物を外側に固定する。統計が無いとプランナーが部屋を外側に選び、全件を並べ替えて LIMIT で止まらない
const INSTITUTION_LIST_FROM = `
  SELECT ${INSTITUTION_COLUMNS}
  FROM buildings b
  CROSS JOIN institutions i ON i.building_id = b.id`;

const INSTITUTION_CURSOR_KEYS = [
  "municipality",
  "building_kana",
  "building_id",
  "institution_kana",
  "id",
] as const;

export async function listInstitutions(
  db: D1Database,
  params: InstitutionsQueryParams
): Promise<Page<InstitutionSummary | InstitutionDetail>> {
  const limit = clampLimit(params.limit);
  const conditions: string[] = [];
  const args: unknown[] = [];

  pushIn(conditions, args, "b.municipality", params.municipality);
  pushIn(conditions, args, "b.reservation_system", params.reservationSystem);
  if (params.buildingId) {
    conditions.push(`b.id = ?`);
    args.push(params.buildingId);
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
  pushIn(conditions, args, "i.institution_size", params.institutionSizes);
  const c = cursorValues(params.cursor, INSTITUTION_CURSOR_KEYS);
  if (c) {
    conditions.push(`(b.municipality, b.kana, b.id, i.institution_kana, i.id) > (?, ?, ?, ?, ?)`);
    args.push(...c);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    ${INSTITUTION_LIST_FROM}
    ${where}
    ORDER BY b.municipality, b.kana, b.id, i.institution_kana, i.id
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
    items: page.map((row) =>
      params.detail ? toInstitutionDetail(row) : toInstitutionSummary(row)
    ),
    pageInfo: {
      hasNextPage,
      endCursor:
        hasNextPage && last
          ? encodeCursor({
              municipality: last.b_municipality,
              building_kana: last.b_kana,
              building_id: last.building_id,
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
    .prepare(
      `SELECT ${INSTITUTION_COLUMNS}
       FROM institutions i JOIN buildings b ON b.id = i.building_id
       WHERE i.id = ?`
    )
    .bind(id)
    .first<InstitutionRow>();
  return row ? toInstitutionDetail(row) : null;
}

interface BuildingRow {
  id: string;
  prefecture: string;
  municipality: string;
  name: string;
  kana: string;
  system_name: string;
  address: string;
  reservation_system: string | null;
  updated_at: string;
}

function toBuildingDto(row: BuildingRow): BuildingDto {
  return {
    id: row.id,
    prefecture: row.prefecture,
    municipality: row.municipality,
    name: row.name,
    kana: row.kana,
    system_name: row.system_name,
    address: row.address,
    reservation_system: row.reservation_system,
    updated_at: row.updated_at,
  };
}

const BUILDING_CURSOR_KEYS = ["municipality", "kana", "id"] as const;

export async function listBuildings(
  db: D1Database,
  params: BuildingsQueryParams
): Promise<Page<BuildingDto>> {
  const limit = clampLimit(params.limit);
  const conditions: string[] = [];
  const args: unknown[] = [];
  pushIn(conditions, args, "municipality", params.municipality);
  pushIn(conditions, args, "reservation_system", params.reservationSystem);
  const c = cursorValues(params.cursor, BUILDING_CURSOR_KEYS);
  if (c) {
    conditions.push(`(municipality, kana, id) > (?, ?, ?)`);
    args.push(...c);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT * FROM buildings
    ${where}
    ORDER BY municipality, kana, id
    LIMIT ?`;
  args.push(limit + 1);

  const { results } = await db
    .prepare(sql)
    .bind(...args)
    .all<BuildingRow>();
  const hasNextPage = results.length > limit;
  const page = hasNextPage ? results.slice(0, limit) : results;
  const last = page.at(-1);
  return {
    items: page.map(toBuildingDto),
    pageInfo: {
      hasNextPage,
      endCursor:
        hasNextPage && last
          ? encodeCursor({ municipality: last.municipality, kana: last.kana, id: last.id })
          : null,
    },
  };
}

export async function getBuildingDetail(
  db: D1Database,
  id: string
): Promise<BuildingDetail | null> {
  const [building, institutions] = await db.batch([
    db.prepare(`SELECT * FROM buildings WHERE id = ?`).bind(id),
    db
      .prepare(`${INSTITUTION_LIST_FROM} WHERE b.id = ? ORDER BY i.institution_kana, i.id`)
      .bind(id),
  ]);
  const row = (building?.results as BuildingRow[] | undefined)?.[0];
  if (!row) return null;
  return {
    ...toBuildingDto(row),
    institutions: ((institutions?.results ?? []) as InstitutionRow[]).map(toInstitutionSummary),
  };
}

interface ReservationRow {
  institution_id: string;
  date: string;
  reservation: string;
  is_holiday: number;
  is_morning_vacant: number;
  is_afternoon_vacant: number;
  is_evening_vacant: number;
  morning_vacated_at: string | null;
  afternoon_vacated_at: string | null;
  evening_vacated_at: string | null;
  updated_at: string;
}

const isNewlyVacant = (vacant: number, vacatedAt: string | null, since: string) =>
  toBool(vacant) && vacatedAt !== null && vacatedAt >= since;

function toReservationDto(row: ReservationRow, since: string): ReservationDto {
  return {
    institution_id: row.institution_id,
    date: row.date,
    reservation: parseReservation(row.reservation),
    is_holiday: toBool(row.is_holiday),
    is_morning_vacant: toBool(row.is_morning_vacant),
    is_afternoon_vacant: toBool(row.is_afternoon_vacant),
    is_evening_vacant: toBool(row.is_evening_vacant),
    is_morning_newly_vacant: isNewlyVacant(row.is_morning_vacant, row.morning_vacated_at, since),
    is_afternoon_newly_vacant: isNewlyVacant(
      row.is_afternoon_vacant,
      row.afternoon_vacated_at,
      since
    ),
    is_evening_newly_vacant: isNewlyVacant(row.is_evening_vacant, row.evening_vacated_at, since),
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

export async function loadHolidays(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare(`SELECT date FROM holidays`).all<{ date: string }>();
  return results.map((r) => r.date);
}

export async function listHolidays(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<Holiday[]> {
  const { results } = await db
    .prepare(`SELECT date, name FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date`)
    .bind(startDate, endDate)
    .all<Holiday>();
  return results.map((r) => ({ date: r.date, name: r.name }));
}

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
  const since = newlyVacantSince();
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
           morning_vacated_at, afternoon_vacated_at, evening_vacated_at,
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
    items: rows.map((row) => toReservationDto(row, since)),
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage && last ? encodeCursor({ date: last.date }) : null,
    },
  };
}

interface SearchRow extends ReservationRow {
  i_id: string;
  i_building_id: string;
  i_municipality: string;
  i_building: string;
  i_institution: string;
  i_institution_size: string;
  i_division_labels: string;
}

export async function searchReservations(
  db: D1Database,
  params: ReservationSearchQueryParams,
  holidays: string[]
): Promise<Page<ReservationSearchHit>> {
  const limit = clampLimit(params.limit);
  const since = newlyVacantSince();
  const conditions: string[] = [`r.date >= ?`, `r.date <= ?`];
  // 先頭は SELECT 式の IS_HOLIDAY_EXPR が使う祝日配列
  const args: unknown[] = [JSON.stringify(holidays), params.startDate, params.endDate];

  pushIn(conditions, args, "b.municipality", params.municipality);
  pushIn(conditions, args, "b.reservation_system", params.reservationSystem);
  if (params.buildingId) {
    conditions.push(`i.building_id = ?`);
    args.push(params.buildingId);
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
  pushIn(conditions, args, "i.institution_size", params.institutionSizes);
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
           r.morning_vacated_at, r.afternoon_vacated_at, r.evening_vacated_at,
           ${IS_HOLIDAY_EXPR("r.date")} AS is_holiday,
           i.id AS i_id, i.building_id AS i_building_id, b.municipality AS i_municipality,
           b.name AS i_building, i.institution AS i_institution,
           i.institution_size AS i_institution_size, i.division_labels AS i_division_labels
    FROM reservations r
    JOIN institutions i ON i.id = r.institution_id
    JOIN buildings b ON b.id = i.building_id
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
      reservation: toReservationDto(row, since),
      institution: {
        id: row.i_id,
        building_id: row.i_building_id,
        municipality: row.i_municipality,
        building: row.i_building,
        institution: row.i_institution,
        institution_size: row.i_institution_size,
        division_labels: parseJsonObject(row.i_division_labels),
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

/**
 * ORDER BY は searchReservations と同じ (date, institution_id) にせず PK 順に揃える。
 * `WITHOUT ROWID` の物理順と食い違うと SQLite がページごとに全件を一時 B-tree でソートし、
 * コストが O(N^2 / page) に膨らむ（全自治体 1 巡で約 500 万行読み）。
 * municipality で絞らないのも同じ理由（institutions と JOIN すると全件ソートが復活する）。
 */
export async function exportReservations(
  db: D1Database,
  params: { limit?: number | undefined; cursor?: string | undefined }
): Promise<Page<ReservationExportRow>> {
  const requested = params.limit && params.limit > 0 ? params.limit : MAX_EXPORT_LIMIT;
  const limit = Math.min(requested, MAX_EXPORT_LIMIT);
  const args: unknown[] = [];
  let where = "";
  if (params.cursor) {
    const c = decodeCursor(params.cursor);
    if (c) {
      where = `WHERE (institution_id, date) > (?, ?)`;
      args.push(c["institution_id"], c["date"]);
    }
  }
  const sql = `
    SELECT institution_id, date, reservation
    FROM reservations
    ${where}
    ORDER BY institution_id, date
    LIMIT ?`;
  args.push(limit + 1);

  const { results } = await db
    .prepare(sql)
    .bind(...args)
    .all<{ institution_id: string; date: string; reservation: string }>();
  const hasNextPage = results.length > limit;
  const rows = hasNextPage ? results.slice(0, limit) : results;
  const last = rows.at(-1);
  return {
    items: rows.map((row) => ({
      institution_id: row.institution_id,
      date: row.date,
      reservation: parseReservation(row.reservation),
    })),
    pageInfo: {
      hasNextPage,
      endCursor:
        hasNextPage && last
          ? encodeCursor({ institution_id: last.institution_id, date: last.date })
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
