import { canonicalizeReservation } from "@shisetsu-viewer/shared";
import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import { encodeCursor } from "../src/db/cursor.ts";
import {
  getBuildingDetail,
  getInstitutionDetail,
  listBuildings,
  listHolidays,
  listInstitutionReservations,
  listInstitutions,
  listScrapeRuns,
  loadHolidays,
  searchReservations,
} from "../src/db/queries.ts";
import { BUILDINGS, INSTITUTIONS, seed } from "./fixtures.ts";

beforeAll(async () => {
  await seed(env.DB);
});

describe("listInstitutions", () => {
  it("建物の municipality / kana / id、部屋の institution_kana / id の順で返す", async () => {
    const page = await listInstitutions(env.DB, {});
    expect(page.items.map((i) => i.id)).toEqual([
      INSTITUTIONS[0].id,
      INSTITUTIONS[1].id,
      INSTITUTIONS[2].id,
    ]);
  });

  it("limit + cursor で重複・欠落なくページングする", async () => {
    const first = await listInstitutions(env.DB, { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.pageInfo.hasNextPage).toBe(true);
    const second = await listInstitutions(env.DB, { limit: 2, cursor: first.pageInfo.endCursor! });
    expect(second.items.map((i) => i.id)).toEqual([INSTITUTIONS[2].id]);
    expect(second.pageInfo.hasNextPage).toBe(false);
  });

  it("municipality フィルタ", async () => {
    const page = await listInstitutions(env.DB, { municipality: ["MUNICIPALITY_TOSHIMA"] });
    expect(page.items.map((i) => i.id)).toEqual([INSTITUTIONS[2].id]);
  });

  it("institutionSizes フィルタ", async () => {
    const page = await listInstitutions(env.DB, {
      institutionSizes: ["INSTITUTION_SIZE_LARGE"],
    });
    expect(page.items.map((i) => i.id)).toEqual([INSTITUTIONS[0].id]);
  });

  it("isAvailableBrass フィルタ（AVAILABLE のみ）", async () => {
    const page = await listInstitutions(env.DB, { isAvailableBrass: true });
    expect(page.items.map((i) => i.id).sort()).toEqual([INSTITUTIONS[0].id, INSTITUTIONS[2].id]);
  });

  it("建物の欄を部屋の行の写しではなく buildings から返す", async () => {
    const page = await listInstitutions(env.DB, { detail: true });
    expect(page.items[0]).toMatchObject({
      building_id: BUILDINGS[0].id,
      municipality: "MUNICIPALITY_KOUTOU",
      building: "会館A",
      building_kana: "かいかんA",
      building_system_name: "kaikan-a",
      address: "江東区1-1",
    });
  });

  it("buildingId フィルタ", async () => {
    const page = await listInstitutions(env.DB, { buildingId: BUILDINGS[1].id });
    expect(page.items.map((i) => i.id)).toEqual([INSTITUTIONS[2].id]);
  });

  it("reservationSystem フィルタ", async () => {
    const page = await listInstitutions(env.DB, { reservationSystem: ["tokyo-koutou"] });
    expect(page.items.map((i) => i.id)).toEqual([INSTITUTIONS[0].id, INSTITUTIONS[1].id]);
  });

  it("building_id を持たない旧形式のカーソルは先頭ページとして扱う", async () => {
    const legacy = encodeCursor({
      municipality: "MUNICIPALITY_KOUTOU",
      building_kana: "かいかんA",
      institution_kana: "ほーる",
      id: INSTITUTIONS[1].id,
    });
    const page = await listInstitutions(env.DB, { cursor: legacy });
    expect(page.items.map((i) => i.id)).toEqual(INSTITUTIONS.map((i) => i.id));
  });
});

describe("listBuildings", () => {
  it("municipality / kana / id 順で返す", async () => {
    const page = await listBuildings(env.DB, {});
    expect(page.items.map((b) => b.id)).toEqual([BUILDINGS[0].id, BUILDINGS[1].id]);
    expect(page.items[0]).toMatchObject({ name: "会館A", reservation_system: "tokyo-koutou" });
  });

  it("limit + cursor でページングする", async () => {
    const first = await listBuildings(env.DB, { limit: 1 });
    expect(first.pageInfo.hasNextPage).toBe(true);
    const second = await listBuildings(env.DB, { limit: 1, cursor: first.pageInfo.endCursor! });
    expect(second.items.map((b) => b.id)).toEqual([BUILDINGS[1].id]);
    expect(second.pageInfo.hasNextPage).toBe(false);
  });

  it("municipality と reservationSystem で絞る", async () => {
    const byMunicipality = await listBuildings(env.DB, { municipality: ["MUNICIPALITY_TOSHIMA"] });
    expect(byMunicipality.items.map((b) => b.id)).toEqual([BUILDINGS[1].id]);
    const bySystem = await listBuildings(env.DB, { reservationSystem: ["tokyo-koutou"] });
    expect(bySystem.items.map((b) => b.id)).toEqual([BUILDINGS[0].id]);
  });
});

describe("getBuildingDetail", () => {
  it("建物と部屋の一覧を返す", async () => {
    const detail = await getBuildingDetail(env.DB, BUILDINGS[0].id);
    expect(detail?.name).toBe("会館A");
    expect(detail?.institutions.map((i) => [i.id, i.building])).toEqual([
      [INSTITUTIONS[0].id, "会館A"],
      [INSTITUTIONS[1].id, "会館A"],
    ]);
  });

  it("存在しない ID は null", async () => {
    expect(await getBuildingDetail(env.DB, "99999999-9999-4999-8999-999999999999")).toBeNull();
  });
});

describe("getInstitutionDetail", () => {
  it("非 RFC UUID の施設も引ける", async () => {
    const detail = await getInstitutionDetail(env.DB, INSTITUTIONS[2].id);
    expect(detail?.building).toBe("非RFC館");
    expect(detail?.fee_divisions).toEqual([]);
    expect(detail?.division_labels).toEqual({});
  });

  it("存在しない ID は null", async () => {
    const detail = await getInstitutionDetail(env.DB, "99999999-9999-4999-8999-999999999999");
    expect(detail).toBeNull();
  });
});

describe("listInstitutionReservations", () => {
  it("日付範囲でフィルタし date 順で返す", async () => {
    const holidays = await loadHolidays(env.DB);
    const page = await listInstitutionReservations(
      env.DB,
      INSTITUTIONS[0].id,
      { startDate: "2026-08-01", endDate: "2026-08-05" },
      holidays
    );
    expect(page.items.map((r) => r.date)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ]);
  });

  it("cursor で続きから取得（重複なし）", async () => {
    const holidays = await loadHolidays(env.DB);
    const first = await listInstitutionReservations(
      env.DB,
      INSTITUTIONS[0].id,
      { startDate: "2026-08-01", limit: 3 },
      holidays
    );
    expect(first.items.map((r) => r.date)).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
    const second = await listInstitutionReservations(
      env.DB,
      INSTITUTIONS[0].id,
      { startDate: "2026-08-01", limit: 3, cursor: first.pageInfo.endCursor! },
      holidays
    );
    expect(second.items[0]?.date).toBe("2026-08-04");
  });
});

describe("searchReservations", () => {
  it("isMorningVacant で空き行だけ返す（JOIN 形状）", async () => {
    const holidays = await loadHolidays(env.DB);
    const page = await searchReservations(
      env.DB,
      { startDate: "2026-08-01", endDate: "2026-08-04", isMorningVacant: true },
      holidays
    );
    expect(page.items.every((h) => h.reservation.is_morning_vacant)).toBe(true);
    expect(page.items.map((h) => h.reservation.date).sort()).toEqual([
      "2026-08-02",
      "2026-08-02",
      "2026-08-04",
      "2026-08-04",
    ]);
    const hit = page.items[0]!;
    expect(hit.institution.municipality).toBe("MUNICIPALITY_KOUTOU");
    expect(hit.institution.id).toBeDefined();
    expect(hit.institution.division_labels).toEqual({});
  });

  it("buildingId と reservationSystem で絞る", async () => {
    const holidays = await loadHolidays(env.DB);
    const range = { startDate: "2026-08-01", endDate: "2026-08-01" };
    const byBuilding = await searchReservations(
      env.DB,
      { ...range, buildingId: BUILDINGS[0].id },
      holidays
    );
    expect(byBuilding.items.map((h) => h.institution.id)).toEqual([
      INSTITUTIONS[0].id,
      INSTITUTIONS[1].id,
    ]);
    expect(byBuilding.items[0]?.institution).toMatchObject({
      building_id: BUILDINGS[0].id,
      building: "会館A",
    });
    const byOtherBuilding = await searchReservations(
      env.DB,
      { ...range, buildingId: BUILDINGS[1].id },
      holidays
    );
    expect(byOtherBuilding.items).toHaveLength(0);
    const bySystem = await searchReservations(
      env.DB,
      { ...range, reservationSystem: ["tokyo-toshima"] },
      holidays
    );
    expect(bySystem.items).toHaveLength(0);
  });

  it("municipality で絞る（予約データの無い toshima は 0 件）", async () => {
    const holidays = await loadHolidays(env.DB);
    const page = await searchReservations(
      env.DB,
      {
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        municipality: ["MUNICIPALITY_TOSHIMA"],
      },
      holidays
    );
    expect(page.items).toHaveLength(0);
  });
});

const [A, B] = [INSTITUTIONS[0].id, INSTITUTIONS[1].id];
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const searchSeptember = async () => {
  const page = await searchReservations(
    env.DB,
    { startDate: "2026-09-01", endDate: "2026-09-05" },
    await loadHolidays(env.DB)
  );
  return page.items;
};

const setColumns = (id: string, date: string, columns: Record<string, string | null>) =>
  env.DB.prepare(
    `UPDATE reservations SET ${Object.keys(columns)
      .map((c) => `${c} = ?`)
      .join(", ")} WHERE institution_id = ? AND date = ?`
  ).bind(...Object.values(columns), id, date);

describe("searchReservations の新しく空いた印", () => {
  beforeAll(async () => {
    const recent = hoursAgo(1);
    const old = hoursAgo(48);
    await env.DB.batch([
      setColumns(A, "2026-09-01", { morning_vacated_at: recent }),
      setColumns(B, "2026-09-01", { morning_vacated_at: old }),
      setColumns(A, "2026-09-02", { morning_vacated_at: recent }),
      setColumns(A, "2026-09-03", { evening_vacated_at: recent }),
      setColumns(B, "2026-09-05", {
        reservation: canonicalizeReservation({
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
        }),
        morning_vacated_at: recent,
      }),
    ]);
  });

  it("24 時間以内に空きに変わり、今も空いている区分にだけ印を付ける", async () => {
    const items = await searchSeptember();
    const flags = (id: string, date: string) => {
      const r = items.find((h) => h.institution.id === id && h.reservation.date === date)!;
      return [
        r.reservation.is_morning_newly_vacant,
        r.reservation.is_afternoon_newly_vacant,
        r.reservation.is_evening_newly_vacant,
      ];
    };
    expect(flags(A, "2026-09-01")).toEqual([true, false, false]);
    expect(flags(B, "2026-09-01")).toEqual([false, false, false]);
    expect(flags(A, "2026-09-02")).toEqual([false, false, false]);
    expect(flags(B, "2026-09-05")).toEqual([true, false, false]);
  });
});

describe("is_holiday のクエリ時導出", () => {
  it("土曜(08-01) と 祝日(08-11) は true、平日(08-03) は false", async () => {
    const holidays = await loadHolidays(env.DB);
    const page = await listInstitutionReservations(
      env.DB,
      INSTITUTIONS[0].id,
      { startDate: "2026-08-01", endDate: "2026-08-13" },
      holidays
    );
    const byDate = new Map(page.items.map((r) => [r.date, r.is_holiday]));
    expect(byDate.get("2026-08-01")).toBe(true); // 土
    expect(byDate.get("2026-08-02")).toBe(true); // 日
    expect(byDate.get("2026-08-03")).toBe(false); // 月（平日）
    expect(byDate.get("2026-08-11")).toBe(true); // 山の日（火・祝日）
  });

  it("holidays テーブルに行を足すと reservations を書き直さずに結果が変わる", async () => {
    const before = await loadHolidays(env.DB);
    const pageBefore = await listInstitutionReservations(
      env.DB,
      INSTITUTIONS[0].id,
      { startDate: "2026-08-13", endDate: "2026-08-13" },
      before
    );
    expect(pageBefore.items[0]?.is_holiday).toBe(false); // 木曜、祝日でない

    await env.DB.prepare(`INSERT INTO holidays (date, name) VALUES (?, ?)`)
      .bind("2026-08-13", "臨時休")
      .run();

    const after = await loadHolidays(env.DB);
    const pageAfter = await listInstitutionReservations(
      env.DB,
      INSTITUTIONS[0].id,
      { startDate: "2026-08-13", endDate: "2026-08-13" },
      after
    );
    expect(pageAfter.items[0]?.is_holiday).toBe(true);
  });
});

describe("生成列のセマンティクス（IMMV 同値）", () => {
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  async function flagsFor(reservation: Record<string, string>) {
    const id = INSTITUTIONS[0].id;
    const date = "2027-01-01";
    await env.DB.prepare(
      `INSERT INTO reservations (institution_id, date, reservation) VALUES (?, ?, ?)
       ON CONFLICT (institution_id, date) DO UPDATE SET reservation = excluded.reservation`
    )
      .bind(id, date, canonicalizeReservation(reservation))
      .run();
    const row = await env.DB.prepare(
      `SELECT is_morning_vacant AS m, is_afternoon_vacant AS a, is_evening_vacant AS e
       FROM reservations WHERE institution_id = ? AND date = ?`
    )
      .bind(id, date)
      .first<{ m: number; a: number; e: number }>();
    return { m: row?.m, a: row?.a, e: row?.e };
  }

  it("単一枠 VACANT → その期間だけ vacant", async () => {
    expect(await flagsFor({ RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" })).toEqual({
      m: 1,
      a: 0,
      e: 0,
    });
  });

  it("分割枠は ONE と TWO の両方 VACANT のときだけ vacant", async () => {
    expect(
      (
        await flagsFor({
          RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_VACANT",
          RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_VACANT",
        })
      ).a
    ).toBe(1);
    expect(
      (
        await flagsFor({
          RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_VACANT",
          RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        })
      ).a
    ).toBe(0);
  });

  it("DIVISION_N のみの自治体は常に 0", async () => {
    expect(
      await flagsFor({ RESERVATION_DIVISION_DIVISION_1: "RESERVATION_STATUS_VACANT" })
    ).toEqual({ m: 0, a: 0, e: 0 });
  });

  it("空マップは 0（NULL 伝播が COALESCE で 0）", async () => {
    expect(await flagsFor({})).toEqual({ m: 0, a: 0, e: 0 });
  });
});

describe("listScrapeRuns", () => {
  it("自治体ごとに最新の fetched_at を返す", async () => {
    const runs = await listScrapeRuns(env.DB);
    const byMuni = new Map(runs.map((r) => [r.municipality, r.fetched_at]));
    expect(byMuni.get("MUNICIPALITY_KOUTOU")).toBe("2026-08-01T17:23:00.000Z");
    expect(byMuni.get("MUNICIPALITY_TOSHIMA")).toBe("2026-08-01T05:25:00.000Z");
  });
});

describe("listHolidays", () => {
  it("範囲内の祝日を日付と名前で返す", async () => {
    expect(await listHolidays(env.DB, "2026-08-01", "2026-08-12")).toEqual([
      { date: "2026-08-11", name: "山の日" },
    ]);
  });

  it("範囲外の祝日は返さない", async () => {
    expect(await listHolidays(env.DB, "2026-08-12", "2026-08-12")).toEqual([]);
  });
});
