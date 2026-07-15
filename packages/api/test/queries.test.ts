import { canonicalizeReservation } from "@shisetsu-viewer/shared";
import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getInstitutionDetail,
  listInstitutionReservations,
  listInstitutions,
  listScrapeRuns,
  loadHolidays,
  searchReservations,
} from "../src/db/queries.ts";
import { INSTITUTIONS, seed } from "./fixtures.ts";

beforeAll(async () => {
  await seed(env.DB);
});

describe("listInstitutions", () => {
  it("municipality / building_kana / institution_kana / id 順で返す", async () => {
    const page = await listInstitutions(env.DB, {});
    expect(page.items.map((i) => i.id)).toEqual([
      INSTITUTIONS[0].id, // KOUTOU 会館A 音楽室
      INSTITUTIONS[1].id, // KOUTOU 会館A ホール
      INSTITUTIONS[2].id, // TOSHIMA
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
});

describe("getInstitutionDetail", () => {
  it("非 RFC UUID の施設も引ける", async () => {
    const detail = await getInstitutionDetail(env.DB, INSTITUTIONS[2].id);
    expect(detail?.building).toBe("非RFC館");
    expect(detail?.fee_divisions).toEqual([]);
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
    // 偶数日が空き: 08-02, 08-04（2 施設ずつ）
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
  });

  it("municipality フィルタ", async () => {
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
    // toshima の施設には予約データを入れていない
    expect(page.items).toHaveLength(0);
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
  // ヘルパ: 1 行だけ入れて空きフラグを読み出す
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
    expect(byMuni.get("MUNICIPALITY_KOUTOU")).toBe("2026-08-01T17:23:00.000Z"); // run-2 が最新
    expect(byMuni.get("MUNICIPALITY_TOSHIMA")).toBe("2026-08-01T05:25:00.000Z");
  });
});
