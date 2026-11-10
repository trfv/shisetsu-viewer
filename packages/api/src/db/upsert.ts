import { canonicalizeReservation, type Building, type Institution } from "@shisetsu-viewer/shared";

export interface UpsertResult {
  rowsWritten: number;
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

const VACATED = (division: "morning" | "afternoon" | "evening") =>
  `(excluded.is_${division}_vacant AND NOT reservations.is_${division}_vacant)`;

function rowsWritten(result: D1Response): number {
  return result.meta.rows_written ?? result.meta.changes ?? 0;
}

// reservation を canonicalize するのは、キー順の揺れで無変更行を UPDATE して D1 の書き込み枠を浪費しないため
export async function upsertReservations(
  db: D1Database,
  rows: { institution_id: string; date: string; reservation: Record<string, string> }[]
): Promise<UpsertResult> {
  if (rows.length === 0) return { rowsWritten: 0 };
  const payload = JSON.stringify(
    rows.map((r) => ({
      institution_id: r.institution_id,
      date: r.date,
      reservation: canonicalizeReservation(r.reservation),
    }))
  );
  const result = await db
    .prepare(
      `INSERT INTO reservations (institution_id, date, reservation)
       SELECT je.value ->> '$.institution_id', je.value ->> '$.date', je.value ->> '$.reservation'
       FROM json_each(?1) AS je
       WHERE TRUE
       ON CONFLICT (institution_id, date) DO UPDATE SET
         reservation = excluded.reservation,
         updated_at  = ${NOW},
         morning_vacated_at   = IIF(${VACATED("morning")}, ${NOW}, reservations.morning_vacated_at),
         afternoon_vacated_at = IIF(${VACATED("afternoon")}, ${NOW}, reservations.afternoon_vacated_at),
         evening_vacated_at   = IIF(${VACATED("evening")}, ${NOW}, reservations.evening_vacated_at)
       WHERE reservations.reservation IS NOT excluded.reservation`
    )
    .bind(payload)
    .run();
  return { rowsWritten: rowsWritten(result) };
}

const BUILDING_COLUMNS = [
  "prefecture",
  "municipality",
  "name",
  "kana",
  "system_name",
  "address",
  "reservation_system",
] as const;

// 部屋の建物の欄は buildings の写し。building_id を持つ行は送られてきた値より buildings を優先する
const COPIED_FROM_BUILDING: Readonly<Record<string, string>> = {
  prefecture: "prefecture",
  municipality: "municipality",
  building: "name",
  building_kana: "kana",
  building_system_name: "system_name",
  address: "address",
};

const INSTITUTION_COLUMNS = [
  "prefecture",
  "municipality",
  "building",
  "institution",
  "building_kana",
  "institution_kana",
  "building_system_name",
  "institution_system_name",
  "capacity",
  "area",
  "institution_size",
  "fee_divisions",
  "weekday_usage_fee",
  "holiday_usage_fee",
  "address",
  "is_available_strings",
  "is_available_woodwind",
  "is_available_brass",
  "is_available_percussion",
  "is_equipped_music_stand",
  "is_equipped_piano",
  "website_url",
  "layout_image_url",
  "lottery_period",
  "note",
  "division_labels",
] as const;

const JSON_COLUMN_DEFAULTS: Readonly<Record<string, unknown>> = {
  fee_divisions: [],
  weekday_usage_fee: [],
  holiday_usage_fee: [],
  division_labels: {},
};

const BUILDING_UPSERT_SQL = (() => {
  const insertCols = ["id", ...BUILDING_COLUMNS];
  const selectExprs = insertCols.map((c) => `je.value ->> '$.${c}'`);
  const setClause = BUILDING_COLUMNS.map((c) => `${c} = excluded.${c}`).join(",\n         ");
  const changeGuard = BUILDING_COLUMNS.map((c) => `buildings.${c} IS NOT excluded.${c}`).join(
    "\n          OR "
  );
  return `INSERT INTO buildings (${insertCols.join(", ")})
       SELECT ${selectExprs.join(", ")}
       FROM json_each(?1) AS je
       WHERE TRUE
       ON CONFLICT (id) DO UPDATE SET
         ${setClause},
         updated_at = ${NOW}
       WHERE ${changeGuard}`;
})();

const SYNC_INSTITUTIONS_FROM_BUILDINGS_SQL = (() => {
  const entries = Object.entries(COPIED_FROM_BUILDING);
  const setClause = entries.map(([i, b]) => `${i} = b.${b}`).join(",\n         ");
  const changeGuard = entries
    .map(([i, b]) => `institutions.${i} IS NOT b.${b}`)
    .join("\n          OR ");
  return `UPDATE institutions SET
         ${setClause},
         updated_at = ${NOW}
       FROM buildings AS b
       WHERE b.id = institutions.building_id
         AND b.id IN (SELECT je.value ->> '$.id' FROM json_each(?1) AS je)
         AND (${changeGuard})`;
})();

const INSTITUTION_UPSERT_SQL = (() => {
  const insertCols = ["id", "building_id", ...INSTITUTION_COLUMNS];
  const selectExprs = insertCols.map((c) => {
    const fromBuilding = COPIED_FROM_BUILDING[c];
    return fromBuilding
      ? `COALESCE(b.${fromBuilding}, je.value ->> '$.${c}')`
      : `je.value ->> '$.${c}'`;
  });
  const setClause = INSTITUTION_COLUMNS.map((c) => `${c} = excluded.${c}`).join(",\n         ");
  const changeGuard = INSTITUTION_COLUMNS.map((c) => `institutions.${c} IS NOT excluded.${c}`).join(
    "\n          OR "
  );
  // building_id を送らない旧形式の行で、入っている building_id を消さない
  return `INSERT INTO institutions (${insertCols.join(", ")})
       SELECT ${selectExprs.join(", ")}
       FROM json_each(?1) AS je
       LEFT JOIN buildings AS b ON b.id = je.value ->> '$.building_id'
       WHERE TRUE
       ON CONFLICT (id) DO UPDATE SET
         ${setClause},
         building_id = COALESCE(excluded.building_id, institutions.building_id),
         updated_at = ${NOW}
       WHERE ${changeGuard}
          OR institutions.building_id IS NOT COALESCE(excluded.building_id, institutions.building_id)`;
})();

export async function upsertBuildings(db: D1Database, rows: Building[]): Promise<UpsertResult> {
  if (rows.length === 0) return { rowsWritten: 0 };
  const payload = JSON.stringify(
    rows.map((row) => {
      const record: Record<string, unknown> = { id: row.id };
      for (const c of BUILDING_COLUMNS) record[c] = row[c] ?? null;
      return record;
    })
  );
  const results = await db.batch([
    db.prepare(BUILDING_UPSERT_SQL).bind(payload),
    db.prepare(SYNC_INSTITUTIONS_FROM_BUILDINGS_SQL).bind(payload),
  ]);
  return { rowsWritten: results.reduce((sum, r) => sum + rowsWritten(r), 0) };
}

export async function upsertInstitutions(
  db: D1Database,
  rows: Institution[]
): Promise<UpsertResult> {
  if (rows.length === 0) return { rowsWritten: 0 };
  const payload = JSON.stringify(
    rows.map((row) => {
      const record: Record<string, unknown> = { id: row.id, building_id: row.building_id ?? null };
      for (const c of INSTITUTION_COLUMNS) {
        const value = (row as Record<string, unknown>)[c];
        record[c] =
          c in JSON_COLUMN_DEFAULTS
            ? JSON.stringify(value ?? JSON_COLUMN_DEFAULTS[c])
            : (value ?? null);
      }
      return record;
    })
  );
  const result = await db.prepare(INSTITUTION_UPSERT_SQL).bind(payload).run();
  return { rowsWritten: rowsWritten(result) };
}

export async function upsertHolidays(
  db: D1Database,
  rows: { date: string; name: string }[]
): Promise<UpsertResult> {
  if (rows.length === 0) return { rowsWritten: 0 };
  const payload = JSON.stringify(rows);
  const result = await db
    .prepare(
      `INSERT INTO holidays (date, name)
       SELECT je.value ->> '$.date', je.value ->> '$.name'
       FROM json_each(?1) AS je
       WHERE TRUE
       ON CONFLICT (date) DO UPDATE SET name = excluded.name
       WHERE holidays.name IS NOT excluded.name`
    )
    .bind(payload)
    .run();
  return { rowsWritten: rowsWritten(result) };
}

export async function recordScrapeRun(
  db: D1Database,
  municipality: string,
  runId: string,
  written: number
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO scrape_runs (municipality, run_id, run_date, fetched_at, rows_written)
       VALUES (?1, ?2, date('now'), ${NOW}, ?3)
       ON CONFLICT (municipality, run_id) DO UPDATE SET
         rows_written = scrape_runs.rows_written + excluded.rows_written,
         fetched_at   = excluded.fetched_at`
      )
      .bind(municipality, runId, written),
    // 剪定しないと todayRowsWritten と /v1/scrape-runs の全表スキャンが線形に太る
    db.prepare(`DELETE FROM scrape_runs WHERE run_date < date('now', '-35 days')`),
  ]);
}

/** 当日は UTC で区切る */
export async function todayRowsWritten(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(rows_written), 0) AS total FROM scrape_runs WHERE run_date = date('now')`
    )
    .first<{ total: number }>();
  return row?.total ?? 0;
}
