import type { Institution } from "@shisetsu-viewer/shared";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  recordScrapeRun,
  todayRowsWritten,
  upsertHolidays,
  upsertInstitutions,
  upsertReservations,
} from "../src/db/upsert.ts";

const INST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(async () => {
  await env.DB.exec("DELETE FROM reservations");
  await env.DB.exec("DELETE FROM institutions");
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

  it("1 行だけ変えると 1 行のみ更新、その行の updated_at だけ進む", async () => {
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
    // わずかに時間を進めるため待つ（strftime の %f ミリ秒差を確実にする）
    await new Promise((resolve) => setTimeout(resolve, 5));
    const res = await upsertReservations(env.DB, changed);
    expect(res.rowsWritten).toBe(1);

    const after = await env.DB.prepare(
      `SELECT date, updated_at, is_morning_vacant AS m FROM reservations ORDER BY date`
    ).all<{ date: string; updated_at: string; m: number }>();
    const changedRow = after.results.find((r) => r.date === "2026-08-06")!;
    expect(changedRow.m).toBe(1); // 生成列が追随
    const unchangedBefore = before.results.find((r) => r.date === "2026-08-01")!;
    const unchangedAfter = after.results.find((r) => r.date === "2026-08-01")!;
    expect(unchangedAfter.updated_at).toBe(unchangedBefore.updated_at); // 無変更行は据え置き
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
    // キーの並びを逆にして再送
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

describe("upsertInstitutions", () => {
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
});

describe("holidays / scrape_runs / 予算台帳", () => {
  it("upsertHolidays と recordScrapeRun / todayRowsWritten", async () => {
    await upsertHolidays(env.DB, [{ date: "2026-08-11", name: "山の日" }]);
    const h = await env.DB.prepare(`SELECT name FROM holidays WHERE date = ?`)
      .bind("2026-08-11")
      .first<{ name: string }>();
    expect(h?.name).toBe("山の日");

    await recordScrapeRun(env.DB, "MUNICIPALITY_KOUTOU", "run-1", 100);
    await recordScrapeRun(env.DB, "MUNICIPALITY_KOUTOU", "run-1", 20); // 同 run は加算
    await recordScrapeRun(env.DB, "MUNICIPALITY_BUNKYO", "run-1", 50);
    expect(await todayRowsWritten(env.DB)).toBe(170);
  });
});
