import { canonicalizeReservation } from "@shisetsu-viewer/shared";

/** テスト用の施設。1 件は非 RFC UUID（version nibble 不正）を含む。 */
export const INSTITUTIONS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    prefecture: "PREFECTURE_TOKYO",
    municipality: "MUNICIPALITY_KOUTOU",
    building: "会館A",
    institution: "音楽室",
    building_kana: "かいかんA",
    institution_kana: "おんがくしつ",
    institution_size: "INSTITUTION_SIZE_LARGE",
    is_available_brass: "AVAILABILITY_DIVISION_AVAILABLE",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    prefecture: "PREFECTURE_TOKYO",
    municipality: "MUNICIPALITY_KOUTOU",
    building: "会館A",
    institution: "ホール",
    building_kana: "かいかんA",
    institution_kana: "ほーる",
    institution_size: "INSTITUTION_SIZE_MEDIUM",
    is_available_brass: "AVAILABILITY_DIVISION_UNAVAILABLE",
  },
  {
    // 非 RFC UUID（3 番目のグループが 4xxx でない = version nibble 不正）
    id: "f4d8d9d8-8594-b8b4-0000-000000000001",
    prefecture: "PREFECTURE_TOKYO",
    municipality: "MUNICIPALITY_TOSHIMA",
    building: "非RFC館",
    institution: "練習室",
    building_kana: "ひあーるえふかん",
    institution_kana: "れんしゅうしつ",
    institution_size: "INSTITUTION_SIZE_SMALL",
    is_available_brass: "AVAILABILITY_DIVISION_AVAILABLE",
  },
] as const;

/** 2026-08 の連続日を返す（day は 1-origin） */
function augustDate(day: number): string {
  return `2026-08-${String(day).padStart(2, "0")}`;
}

export async function seed(db: D1Database): Promise<void> {
  const stmts: D1PreparedStatement[] = [];

  for (const i of INSTITUTIONS) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO institutions
             (id, prefecture, municipality, building, institution, building_kana, institution_kana,
              institution_size, is_available_brass)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          i.id,
          i.prefecture,
          i.municipality,
          i.building,
          i.institution,
          i.building_kana,
          i.institution_kana,
          i.institution_size,
          i.is_available_brass
        )
    );
  }

  // 2 施設 × 60 日 = 120 行。1 日おきに午前が空き、それ以外は STATUS_1。
  for (const instId of [INSTITUTIONS[0].id, INSTITUTIONS[1].id]) {
    for (let day = 1; day <= 60; day++) {
      const date = day <= 31 ? augustDate(day) : `2026-09-${String(day - 31).padStart(2, "0")}`;
      const morning = day % 2 === 0 ? "RESERVATION_STATUS_VACANT" : "RESERVATION_STATUS_STATUS_1";
      const reservation = canonicalizeReservation({
        RESERVATION_DIVISION_MORNING: morning,
        RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_1",
      });
      stmts.push(
        db
          .prepare(`INSERT INTO reservations (institution_id, date, reservation) VALUES (?, ?, ?)`)
          .bind(instId, date, reservation)
      );
    }
  }

  // 祝日: 2026-08-11（山の日、火曜）
  stmts.push(
    db.prepare(`INSERT INTO holidays (date, name) VALUES (?, ?)`).bind("2026-08-11", "山の日")
  );

  // scrape_runs: koutou は 2 回 run（最新が返るべき）、toshima は 1 回
  stmts.push(
    db
      .prepare(
        `INSERT INTO scrape_runs (municipality, run_id, run_date, fetched_at, rows_written) VALUES (?, ?, ?, ?, ?)`
      )
      .bind("MUNICIPALITY_KOUTOU", "run-1", "2026-08-01", "2026-08-01T05:23:00.000Z", 100)
  );
  stmts.push(
    db
      .prepare(
        `INSERT INTO scrape_runs (municipality, run_id, run_date, fetched_at, rows_written) VALUES (?, ?, ?, ?, ?)`
      )
      .bind("MUNICIPALITY_KOUTOU", "run-2", "2026-08-01", "2026-08-01T17:23:00.000Z", 20)
  );
  stmts.push(
    db
      .prepare(
        `INSERT INTO scrape_runs (municipality, run_id, run_date, fetched_at, rows_written) VALUES (?, ?, ?, ?, ?)`
      )
      .bind("MUNICIPALITY_TOSHIMA", "run-1", "2026-08-01", "2026-08-01T05:25:00.000Z", 50)
  );

  await db.batch(stmts);
}
