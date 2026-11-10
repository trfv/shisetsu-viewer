import { canonicalizeReservation } from "@shisetsu-viewer/shared";

export const BUILDINGS = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    prefecture: "PREFECTURE_TOKYO",
    municipality: "MUNICIPALITY_KOUTOU",
    name: "会館A",
    kana: "かいかんA",
    system_name: "kaikan-a",
    address: "江東区1-1",
    reservation_system: "tokyo-koutou",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    prefecture: "PREFECTURE_TOKYO",
    municipality: "MUNICIPALITY_TOSHIMA",
    name: "非RFC館",
    kana: "ひあーるえふかん",
    system_name: "hi-rfc",
    address: "豊島区1-1",
    reservation_system: "tokyo-toshima",
  },
] as const;

export const INSTITUTIONS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    building_id: BUILDINGS[0].id,
    municipality: "MUNICIPALITY_KOUTOU",
    institution: "音楽室",
    institution_kana: "おんがくしつ",
    institution_system_name: "ongakushitsu",
    institution_size: "INSTITUTION_SIZE_LARGE",
    is_available_brass: "AVAILABILITY_DIVISION_AVAILABLE",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    building_id: BUILDINGS[0].id,
    municipality: "MUNICIPALITY_KOUTOU",
    institution: "ホール",
    institution_kana: "ほーる",
    institution_system_name: "hall",
    institution_size: "INSTITUTION_SIZE_MEDIUM",
    is_available_brass: "AVAILABILITY_DIVISION_UNAVAILABLE",
  },
  {
    // 非 RFC UUID（version nibble 不正）
    id: "f4d8d9d8-8594-b8b4-0000-000000000001",
    building_id: BUILDINGS[1].id,
    municipality: "MUNICIPALITY_TOSHIMA",
    institution: "練習室",
    institution_kana: "れんしゅうしつ",
    institution_system_name: "renshuushitsu",
    institution_size: "INSTITUTION_SIZE_SMALL",
    is_available_brass: "AVAILABILITY_DIVISION_AVAILABLE",
  },
] as const;

function augustDate(day: number): string {
  return `2026-08-${String(day).padStart(2, "0")}`;
}

export async function seed(db: D1Database): Promise<void> {
  const stmts: D1PreparedStatement[] = [];

  for (const b of BUILDINGS) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO buildings
             (id, prefecture, municipality, name, kana, system_name, address, reservation_system)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          b.id,
          b.prefecture,
          b.municipality,
          b.name,
          b.kana,
          b.system_name,
          b.address,
          b.reservation_system
        )
    );
  }

  // 部屋の建物の欄（写し）は空のままにし、読み取りが buildings から引いていることを確かめる
  for (const i of INSTITUTIONS) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO institutions
             (id, building_id, prefecture, municipality, institution, institution_kana,
              institution_system_name, institution_size, is_available_brass)
           VALUES (?, ?, 'PREFECTURE_TOKYO', ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          i.id,
          i.building_id,
          i.municipality,
          i.institution,
          i.institution_kana,
          i.institution_system_name,
          i.institution_size,
          i.is_available_brass
        )
    );
  }

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

  stmts.push(
    db.prepare(`INSERT INTO holidays (date, name) VALUES (?, ?)`).bind("2026-08-11", "山の日")
  );

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
