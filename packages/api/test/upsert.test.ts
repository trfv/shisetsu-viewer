import type { Building, Institution } from "@shisetsu-viewer/shared";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { getInstitutionDetail } from "../src/db/queries.ts";
import {
  recordScrapeRun,
  todayRowsWritten,
  upsertBuildings,
  upsertHolidays,
  upsertInstitutions,
  upsertReservations,
} from "../src/db/upsert.ts";

const INST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(async () => {
  await env.DB.exec("DELETE FROM reservations");
  await env.DB.exec("DELETE FROM institutions");
  await env.DB.exec("DELETE FROM buildings");
  await env.DB.exec("DELETE FROM holidays");
  await env.DB.exec("DELETE FROM scrape_runs");
});

function reservationRows(count: number, morning = "RESERVATION_STATUS_STATUS_1") {
  return Array.from({ length: count }, (_, i) => ({
    institution_id: INST_ID,
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    reservation: {
      RESERVATION_DIVISION_MORNING: morning,
      RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
    },
  }));
}

describe("upsertReservations（差分 upsert）", () => {
  it("新規 30 行を insert し、生成列が計算される", async () => {
    const res = await upsertReservations(env.DB, reservationRows(30, "RESERVATION_STATUS_VACANT"));
    expect(res.rowsWritten).toBeGreaterThanOrEqual(30);
    const row = await env.DB.prepare(
      `SELECT is_morning_vacant AS m FROM reservations WHERE institution_id = ? AND date = ?`
    )
      .bind(INST_ID, "2026-08-01")
      .first<{ m: number }>();
    expect(row?.m).toBe(1);
  });

  it("同一データの再 upsert は rows_written = 0（差分ガードの核心）", async () => {
    const rows = reservationRows(30);
    await upsertReservations(env.DB, rows);
    const second = await upsertReservations(env.DB, rows);
    expect(second.rowsWritten).toBe(0);
  });

  it("1 行だけ空きに変えると、その行と vacated_at の索引だけを書き、その行の updated_at だけ進む", async () => {
    const rows = reservationRows(30);
    await upsertReservations(env.DB, rows);
    const before = await env.DB.prepare(
      `SELECT date, updated_at FROM reservations ORDER BY date`
    ).all<{ date: string; updated_at: string }>();

    const changed = rows.map((r, i) =>
      i === 5
        ? {
            ...r,
            reservation: {
              ...r.reservation,
              RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
            },
          }
        : r
    );
    // updated_at に strftime の %f でミリ秒差を出す
    await new Promise((resolve) => setTimeout(resolve, 5));
    const res = await upsertReservations(env.DB, changed);
    expect(res.rowsWritten).toBe(2);

    const after = await env.DB.prepare(
      `SELECT date, updated_at, is_morning_vacant AS m FROM reservations ORDER BY date`
    ).all<{ date: string; updated_at: string; m: number }>();
    const changedRow = after.results.find((r) => r.date === "2026-08-06")!;
    expect(changedRow.m).toBe(1);
    const unchangedBefore = before.results.find((r) => r.date === "2026-08-01")!;
    const unchangedAfter = after.results.find((r) => r.date === "2026-08-01")!;
    expect(unchangedAfter.updated_at).toBe(unchangedBefore.updated_at);
  });

  it("キー順だけ違う再 upsert は無変更（canonicalize の効果）", async () => {
    await upsertReservations(env.DB, [
      {
        institution_id: INST_ID,
        date: "2026-08-01",
        reservation: {
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
        },
      },
    ]);
    const second = await upsertReservations(env.DB, [
      {
        institution_id: INST_ID,
        date: "2026-08-01",
        reservation: {
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        },
      },
    ]);
    expect(second.rowsWritten).toBe(0);
  });
});

const VACANT = "RESERVATION_STATUS_VACANT";
const FILLED = "RESERVATION_STATUS_STATUS_1";
const vacancyRow = (morning: string, evening = FILLED) => ({
  institution_id: INST_ID,
  date: "2026-08-01",
  reservation: { RESERVATION_DIVISION_MORNING: morning, RESERVATION_DIVISION_EVENING: evening },
});
const readVacatedAt = () =>
  env.DB.prepare(
    `SELECT morning_vacated_at AS m, afternoon_vacated_at AS a, evening_vacated_at AS e,
            vacated_at AS v
     FROM reservations WHERE institution_id = ?`
  )
    .bind(INST_ID)
    .first<{ m: string | null; a: string | null; e: string | null; v: string | null }>();

describe("upsertReservations の vacated_at", () => {
  it("初めて取得した空き枠には付けない", async () => {
    await upsertReservations(env.DB, [vacancyRow(VACANT, VACANT)]);
    expect(await readVacatedAt()).toEqual({ m: null, a: null, e: null, v: null });
  });

  it("空きに変わった区分にだけ付け、vacated_at にも同じ時刻を書く", async () => {
    await upsertReservations(env.DB, [vacancyRow(FILLED)]);
    await upsertReservations(env.DB, [vacancyRow(VACANT)]);
    const got = await readVacatedAt();
    expect(got?.m).not.toBeNull();
    expect(got?.e).toBeNull();
    expect(got?.v).toBe(got?.m);
  });

  it("埋まっても消さず、別の区分が空いたときは元の区分の時刻を保つ", async () => {
    await upsertReservations(env.DB, [vacancyRow(FILLED)]);
    await upsertReservations(env.DB, [vacancyRow(VACANT)]);
    const first = await readVacatedAt();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await upsertReservations(env.DB, [vacancyRow(FILLED, VACANT)]);
    const second = await readVacatedAt();
    expect(second?.m).toBe(first?.m);
    expect(second?.e).not.toBeNull();
    expect(second?.v).toBe(second?.e);
    expect(second!.v! > first!.v!).toBe(true);
  });

  it("空きのまま他の区分だけ変わっても付け直さない", async () => {
    await upsertReservations(env.DB, [vacancyRow(FILLED)]);
    await upsertReservations(env.DB, [vacancyRow(VACANT)]);
    const first = await readVacatedAt();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await upsertReservations(env.DB, [vacancyRow(VACANT, "RESERVATION_STATUS_STATUS_2")]);
    expect(await readVacatedAt()).toEqual(first);
  });
});

const base: Institution = {
  id: INST_ID,
  prefecture: "PREFECTURE_TOKYO",
  municipality: "MUNICIPALITY_KOUTOU",
  building: "館",
  institution: "室",
  building_kana: "かん",
  institution_kana: "しつ",
  building_system_name: "bsys",
  institution_system_name: "isys",
  capacity: 100,
  area: 50.5,
  institution_size: "INSTITUTION_SIZE_LARGE",
  fee_divisions: ["FEE_DIVISION_MORNING"],
  weekday_usage_fee: [{ division: "FEE_DIVISION_MORNING", fee: 1000 }],
  holiday_usage_fee: [],
  address: "東京都",
  is_available_strings: "AVAILABILITY_DIVISION_AVAILABLE",
  is_available_woodwind: "AVAILABILITY_DIVISION_UNKNOWN",
  is_available_brass: "AVAILABILITY_DIVISION_UNKNOWN",
  is_available_percussion: "AVAILABILITY_DIVISION_UNKNOWN",
  is_equipped_music_stand: "EQUIPMENT_DIVISION_UNKNOWN",
  is_equipped_piano: "EQUIPMENT_DIVISION_UNKNOWN",
  website_url: "",
  layout_image_url: "",
  lottery_period: "",
  note: "",
};

describe("upsertInstitutions", () => {
  it("新規 insert 後、同一データ再送は rows_written = 0", async () => {
    const first = await upsertInstitutions(env.DB, [base]);
    expect(first.rowsWritten).toBeGreaterThanOrEqual(1);
    const second = await upsertInstitutions(env.DB, [base]);
    expect(second.rowsWritten).toBe(0);
  });

  it("1 列変えると更新される", async () => {
    await upsertInstitutions(env.DB, [base]);
    const res = await upsertInstitutions(env.DB, [{ ...base, note: "改定" }]);
    expect(res.rowsWritten).toBeGreaterThanOrEqual(1);
    const row = await env.DB.prepare(`SELECT note FROM institutions WHERE id = ?`)
      .bind(INST_ID)
      .first<{ note: string }>();
    expect(row?.note).toBe("改定");
  });

  it("JSON 列（fee_divisions 等）が round-trip する", async () => {
    await upsertInstitutions(env.DB, [base]);
    const row = await env.DB.prepare(
      `SELECT fee_divisions, weekday_usage_fee FROM institutions WHERE id = ?`
    )
      .bind(INST_ID)
      .first<{ fee_divisions: string; weekday_usage_fee: string }>();
    expect(JSON.parse(row!.fee_divisions)).toEqual(["FEE_DIVISION_MORNING"]);
    expect(JSON.parse(row!.weekday_usage_fee)).toEqual([
      { division: "FEE_DIVISION_MORNING", fee: 1000 },
    ]);
  });

  it("division_labels は未指定なら {}、指定すれば詳細 API まで round-trip する", async () => {
    await upsertInstitutions(env.DB, [base]);
    expect((await getInstitutionDetail(env.DB, INST_ID))?.division_labels).toEqual({});

    const labels = { RESERVATION_DIVISION_MORNING: "9:00-11:45" };
    const res = await upsertInstitutions(env.DB, [{ ...base, division_labels: labels }]);
    expect(res.rowsWritten).toBeGreaterThanOrEqual(1);
    expect((await getInstitutionDetail(env.DB, INST_ID))?.division_labels).toEqual(labels);
  });
});

function legacyColumns(id = INST_ID) {
  return env.DB.prepare(
    `SELECT building_id, prefecture, municipality, building, building_kana, building_system_name, address
     FROM institutions WHERE id = ?`
  )
    .bind(id)
    .first();
}

describe("upsertBuildings", () => {
  const BUILDING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const building: Building = {
    id: BUILDING_ID,
    prefecture: "PREFECTURE_TOKYO",
    municipality: "MUNICIPALITY_KITA",
    name: "赤羽会館",
    kana: "アカバネカイカン",
    system_name: "赤羽会館",
    address: "北区赤羽南1丁目13−1",
    reservation_system: "tokyo-kita",
  };
  it("新規 insert 後、同一データ再送は rows_written = 0", async () => {
    const first = await upsertBuildings(env.DB, [building]);
    expect(first.rowsWritten).toBeGreaterThanOrEqual(1);
    const second = await upsertBuildings(env.DB, [building]);
    expect(second.rowsWritten).toBe(0);
  });

  it("予約システムの無い手動登録の建物は reservation_system が NULL で入る", async () => {
    await upsertBuildings(env.DB, [{ ...building, reservation_system: null }]);
    const row = await env.DB.prepare(`SELECT reservation_system FROM buildings WHERE id = ?`)
      .bind(BUILDING_ID)
      .first<{ reservation_system: string | null }>();
    expect(row?.reservation_system).toBeNull();
  });

  it("同じ予約システムで system_name が同じ別の建物を受け付ける", async () => {
    await upsertBuildings(env.DB, [building]);
    const annex = { ...building, id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "赤羽会館別館" };
    const res = await upsertBuildings(env.DB, [annex]);
    expect(res.rowsWritten).toBeGreaterThanOrEqual(1);
  });

  it("building_id だけを持つ部屋は、建物の欄を buildings から写して入る", async () => {
    await upsertBuildings(env.DB, [building]);
    const {
      prefecture: _p,
      municipality: _m,
      building: _b,
      building_kana: _bk,
      building_system_name: _bs,
      address: _a,
      ...room
    } = base;
    await upsertInstitutions(env.DB, [{ ...room, building_id: BUILDING_ID } as Institution]);
    expect(await legacyColumns()).toEqual({
      building_id: BUILDING_ID,
      prefecture: "PREFECTURE_TOKYO",
      municipality: "MUNICIPALITY_KITA",
      building: "赤羽会館",
      building_kana: "アカバネカイカン",
      building_system_name: "赤羽会館",
      address: "北区赤羽南1丁目13−1",
    });
    expect((await getInstitutionDetail(env.DB, INST_ID))?.building_id).toBe(BUILDING_ID);
  });

  it("building_id を持つ部屋は、送られた建物の欄より buildings を優先する", async () => {
    await upsertBuildings(env.DB, [building]);
    await upsertInstitutions(env.DB, [{ ...base, building_id: BUILDING_ID }]);
    expect(await legacyColumns()).toMatchObject({
      building: "赤羽会館",
      address: building.address,
    });
  });

  it("建物を更新すると、その建物の部屋の写しも更新される", async () => {
    await upsertBuildings(env.DB, [building]);
    await upsertInstitutions(env.DB, [{ ...base, building_id: BUILDING_ID }]);
    const res = await upsertBuildings(env.DB, [{ ...building, address: "北区赤羽南1-13-1" }]);
    expect(res.rowsWritten).toBeGreaterThanOrEqual(2);
    expect(await legacyColumns()).toMatchObject({ address: "北区赤羽南1-13-1" });
  });

  it("building_id を送らない旧形式の再送で、入っている building_id を消さない", async () => {
    await upsertBuildings(env.DB, [building]);
    await upsertInstitutions(env.DB, [{ ...base, building_id: BUILDING_ID }]);
    await upsertInstitutions(env.DB, [{ ...base, note: "改定" }]);
    expect(await legacyColumns()).toMatchObject({ building_id: BUILDING_ID });
  });

  it("旧形式の部屋に後から building_id を足すと更新される", async () => {
    await upsertBuildings(env.DB, [building]);
    await upsertInstitutions(env.DB, [base]);
    const res = await upsertInstitutions(env.DB, [{ ...base, building_id: BUILDING_ID }]);
    expect(res.rowsWritten).toBeGreaterThanOrEqual(1);
    expect(await legacyColumns()).toMatchObject({ building_id: BUILDING_ID });
  });

  it("存在しない building_id を指す部屋は外部キーで拒否される", async () => {
    await expect(
      upsertInstitutions(env.DB, [{ ...base, building_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }])
    ).rejects.toThrow();
  });
});

describe("institutions の schema 制約", () => {
  const OTHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("enum 外の値は CHECK 制約で拒否される", async () => {
    await expect(
      upsertInstitutions(env.DB, [{ ...base, institution_size: "INSTITUTION_SIZE_HUGE" }])
    ).rejects.toThrow();
    await expect(
      upsertInstitutions(env.DB, [{ ...base, is_available_brass: "yes" }])
    ).rejects.toThrow();
  });

  it("同一自治体で解決キー（system_name の組）が重複する別 id は UNIQUE で拒否される", async () => {
    await upsertInstitutions(env.DB, [base]);
    await expect(upsertInstitutions(env.DB, [{ ...base, id: OTHER_ID }])).rejects.toThrow();
  });

  it("system_name が空の施設（スクレイプ対象外の手動登録）は重複しても許容される", async () => {
    const manual = { ...base, building_system_name: "", institution_system_name: "" };
    await upsertInstitutions(env.DB, [manual]);
    const res = await upsertInstitutions(env.DB, [{ ...manual, id: OTHER_ID }]);
    expect(res.rowsWritten).toBeGreaterThanOrEqual(1);
  });
});

describe("holidays / scrape_runs / 予算台帳", () => {
  it("upsertHolidays と recordScrapeRun / todayRowsWritten", async () => {
    await upsertHolidays(env.DB, [{ date: "2026-08-11", name: "山の日" }]);
    const h = await env.DB.prepare(`SELECT name FROM holidays WHERE date = ?`)
      .bind("2026-08-11")
      .first<{ name: string }>();
    expect(h?.name).toBe("山の日");

    await recordScrapeRun(env.DB, "MUNICIPALITY_KOUTOU", "run-1", 100);
    await recordScrapeRun(env.DB, "MUNICIPALITY_KOUTOU", "run-1", 20);
    await recordScrapeRun(env.DB, "MUNICIPALITY_BUNKYO", "run-1", 50);
    expect(await todayRowsWritten(env.DB)).toBe(170);
  });

  it("recordScrapeRun は 35 日より古い台帳行を剪定し、新しい行は残す", async () => {
    const insert = `INSERT INTO scrape_runs (municipality, run_id, run_date, fetched_at, rows_written)
                    VALUES (?, ?, ?, ?, ?)`;
    await env.DB.prepare(insert)
      .bind("MUNICIPALITY_KOUTOU", "old-run", "2026-01-01", "2026-01-01T05:00:00.000Z", 10)
      .run();
    await env.DB.prepare(insert)
      .bind(
        "MUNICIPALITY_KOUTOU",
        "recent-run",
        new Date(Date.now() - 10 * 86400_000).toISOString().slice(0, 10),
        "2026-07-05T05:00:00.000Z",
        10
      )
      .run();

    await recordScrapeRun(env.DB, "MUNICIPALITY_KOUTOU", "run-1", 100);

    const { results } = await env.DB.prepare(`SELECT run_id FROM scrape_runs ORDER BY run_id`).all<{
      run_id: string;
    }>();
    expect(results.map((r) => r.run_id)).toEqual(["recent-run", "run-1"]);
  });
});
