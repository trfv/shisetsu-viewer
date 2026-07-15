import { canonicalizeReservation, type Institution } from "@shisetsu-viewer/shared";

export interface UpsertResult {
  rowsWritten: number;
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

function rowsWritten(result: D1Response): number {
  return result.meta.rows_written ?? result.meta.changes ?? 0;
}

// ---- reservations（差分 upsert）----

/**
 * 予約行を差分 upsert する。reservation は canonicalize してから格納するので、
 * キー順の揺れで無変更行が UPDATE されない（＝ D1 の書き込み枠を浪費しない）。
 * 空き 3 フラグは生成列が自動計算するため SET に現れず、差分ガードは reservation 1 列で済む。
 */
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
         updated_at  = ${NOW}
       WHERE reservations.reservation IS NOT excluded.reservation`
    )
    .bind(payload)
    .run();
  return { rowsWritten: rowsWritten(result) };
}

// ---- institutions（差分 upsert。25 列を programmatic に列挙）----

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
] as const;

// JSON 配列を持つ列。payload では文字列化して格納する（列は TEXT）
const JSON_COLUMNS = new Set(["fee_divisions", "weekday_usage_fee", "holiday_usage_fee"]);

const INSTITUTION_UPSERT_SQL = (() => {
  const insertCols = ["id", ...INSTITUTION_COLUMNS];
  const selectExprs = insertCols.map((c) => `je.value ->> '$.${c}'`);
  const setClause = INSTITUTION_COLUMNS.map((c) => `${c} = excluded.${c}`).join(",\n         ");
  const changeGuard = INSTITUTION_COLUMNS.map((c) => `institutions.${c} IS NOT excluded.${c}`).join(
    "\n          OR "
  );
  return `INSERT INTO institutions (${insertCols.join(", ")})
       SELECT ${selectExprs.join(", ")}
       FROM json_each(?1) AS je
       WHERE TRUE
       ON CONFLICT (id) DO UPDATE SET
         ${setClause},
         updated_at = ${NOW}
       WHERE ${changeGuard}`;
})();

export async function upsertInstitutions(
  db: D1Database,
  rows: Institution[]
): Promise<UpsertResult> {
  if (rows.length === 0) return { rowsWritten: 0 };
  const payload = JSON.stringify(
    rows.map((row) => {
      const record: Record<string, unknown> = { id: row.id };
      for (const c of INSTITUTION_COLUMNS) {
        const value = (row as Record<string, unknown>)[c];
        record[c] = JSON_COLUMNS.has(c) ? JSON.stringify(value ?? []) : (value ?? null);
      }
      return record;
    })
  );
  const result = await db.prepare(INSTITUTION_UPSERT_SQL).bind(payload).run();
  return { rowsWritten: rowsWritten(result) };
}

// ---- holidays ----

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

// ---- scrape_runs（取得時刻の記録 + 日次書き込み予算の台帳）----

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
    // 台帳は放置すると無限成長し、todayRowsWritten と /v1/scrape-runs の全表スキャンが
    // 線形に太る。予算集計は当日、最終取得時刻の表示は直近しか見ないため 35 日で剪定する。
    db.prepare(`DELETE FROM scrape_runs WHERE run_date < date('now', '-35 days')`),
  ]);
}

/** 当日（UTC）の rows_written 概算。書き込み予算ガードに使う。 */
export async function todayRowsWritten(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(rows_written), 0) AS total FROM scrape_runs WHERE run_date = date('now')`
    )
    .first<{ total: number }>();
  return row?.total ?? 0;
}
