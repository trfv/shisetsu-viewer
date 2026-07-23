import type { Page } from "@playwright/test";

import { toISODateString } from "../common/dateUtils.ts";
import { defineScraper } from "../common/defineScraper.ts";
import { MaintenanceWindowError, TargetNotFoundError } from "../common/errors.ts";
import { collectPaginated } from "../common/paginate.ts";
import { getCellValue } from "../common/playwrightUtils.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

const BASE_URL = "https://www.yoyaku.city.ota.tokyo.jp/eshisetsu/menu/Welcome.cgi";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  // 集会室系 (午前/午後/夜間)
  "09:00 - 12:00": "RESERVATION_DIVISION_MORNING",
  "13:00 - 17:00": "RESERVATION_DIVISION_AFTERNOON",
  "18:00 - 22:00": "RESERVATION_DIVISION_EVENING",
  // スタジオ系 (2時間コマ)
  "09:30 - 11:30": "RESERVATION_DIVISION_MORNING",
  "12:00 - 14:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "14:30 - 16:30": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "17:00 - 19:00": "RESERVATION_DIVISION_EVENING_ONE",
  "19:30 - 21:30": "RESERVATION_DIVISION_EVENING_TWO",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "../img/std/common/icn_scche_ok.png": "RESERVATION_STATUS_VACANT",
  "../img/std/common/icn_scche_noset.png": "RESERVATION_STATUS_STATUS_1",
  "../img/std/common/icn_scche_out.png": "RESERVATION_STATUS_STATUS_2",
  "../img/std/common/icn_scche_rest.png": "RESERVATION_STATUS_STATUS_3",
  "../img/std/common/icn_scche_hoshu.png": "RESERVATION_STATUS_STATUS_4",
  "../img/std/common/icn_scche_uten.png": "RESERVATION_STATUS_STATUS_5",
  "../img/std/common/icn_scche_haifun.png": "RESERVATION_STATUS_STATUS_7",
};

interface OtaTarget {
  facilityName: string;
  roomName: string;
  category: string;
  buildingName: string;
  /** サイト上の表記が roomName と異なる場合（全角英字等）に指定 */
  siteRoomName?: string;
}

const targets: OtaTarget[] = [
  // 集会室・会議室
  {
    facilityName: "池上文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "池上文化センター",
  },
  {
    facilityName: "糀谷文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "糀谷文化センター",
  },
  {
    facilityName: "萩中文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "萩中文化センター",
  },
  {
    facilityName: "嶺町文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "嶺町文化センター",
  },
  {
    facilityName: "嶺町文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "嶺町文化センター",
  },
  {
    facilityName: "雪谷文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "雪谷文化センター",
  },
  {
    facilityName: "雪谷文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "雪谷文化センター",
  },
  // 音楽室
  {
    facilityName: "大田区民ホール・アプリコ",
    roomName: "Aスタジオ",
    siteRoomName: "Ａスタジオ",
    category: "音楽室",
    buildingName: "大田区民ホール・アプリコ",
  },
  {
    facilityName: "大田区民ホール・アプリコ",
    roomName: "Bスタジオ",
    siteRoomName: "Ｂスタジオ",
    category: "音楽室",
    buildingName: "大田区民ホール・アプリコ",
  },
  {
    facilityName: "大田文化の森",
    roomName: "第一音楽スタジオ",
    category: "音楽室",
    buildingName: "大田文化の森",
  },
  {
    facilityName: "大田文化の森",
    roomName: "第二音楽スタジオ",
    category: "音楽室",
    buildingName: "大田文化の森",
  },
  {
    facilityName: "大田文化の森",
    roomName: "第三音楽スタジオ",
    category: "音楽室",
    buildingName: "大田文化の森",
  },
  // スタジオ
  {
    facilityName: "大田区民プラザ",
    roomName: "第一音楽スタジオ",
    category: "スタジオ",
    buildingName: "大田区民プラザ",
  },
  {
    facilityName: "大田区民プラザ",
    roomName: "第二音楽スタジオ",
    category: "スタジオ",
    buildingName: "大田区民プラザ",
  },
  // リハーサル室
  {
    facilityName: "大田区民プラザ",
    roomName: "リハーサル室",
    category: "リハーサル室",
    buildingName: "大田区民プラザ",
  },
  // ホール
  {
    facilityName: "大田区民ホール・アプリコ",
    roomName: "小ホール",
    category: "ホール",
    buildingName: "大田区民ホール・アプリコ",
  },
  {
    facilityName: "大田文化の森",
    roomName: "ホール",
    category: "ホール",
    buildingName: "大田文化の森",
  },
  {
    facilityName: "新蒲田区民活動施設",
    roomName: "多目的室（大）",
    category: "ホール",
    buildingName: "新蒲田区民活動施設",
  },
  // 多目的室
  {
    facilityName: "田園調布せせらぎ館",
    roomName: "第一多目的室A",
    siteRoomName: "第一多目的室Ａ",
    category: "多目的室",
    buildingName: "田園調布せせらぎ館",
  },
  {
    facilityName: "田園調布せせらぎ館",
    roomName: "第一多目的室B",
    siteRoomName: "第一多目的室Ｂ",
    category: "多目的室",
    buildingName: "田園調布せせらぎ館",
  },
  {
    facilityName: "田園調布せせらぎ館",
    roomName: "第二多目的室",
    category: "多目的室",
    buildingName: "田園調布せせらぎ館",
  },
  // 和室
  {
    facilityName: "雪谷文化センター",
    roomName: "和室",
    category: "和室",
    buildingName: "雪谷文化センター",
  },
];

type OtaDay = { date: string; header: string[]; statuses: string[] };

async function extractWeek(page: Page): Promise<OtaDay[]> {
  const table = page.locator("table.box_calendar").first();
  await table.waitFor();

  const year = await page.locator("#optYear").inputValue();

  // 日付ヘッダーは日付行の TH 内 <p class="day">（先頭の空 TH はスキップ）
  const dateThs = await table.locator("tr.date th").all();
  const dates: string[] = [];
  for (const dateTh of dateThs.slice(1)) {
    const dayText = await dateTh.locator("p.day").innerText();
    dates.push(`${year}年${dayText}`);
  }

  // データ行（日付ヘッダー行以外）: TH = 時間区分、TD = 日ごとのステータス
  const dataRows = await table.locator("tr:not(.date)").all();
  const headers: string[] = [];
  const statusesByDay: string[][] = dates.map(() => []);

  for (const row of dataRows) {
    const th = await row.locator("th").innerText();
    headers.push(th.trim());
    const tds = await row.locator("td").all();
    for (const [dayIdx, td] of tds.entries()) {
      const value = await getCellValue(td);
      statusesByDay[dayIdx]?.push(value.trim());
    }
  }

  return dates.map((date, dayIdx) => ({
    date,
    header: headers,
    statuses: statusesByDay[dayIdx] ?? [],
  }));
}

export const scraper = defineScraper({
  municipality: "tokyo-ota",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 5, unit: "day" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, category: t.category, buildingName: t.buildingName }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],

  async prepare(page, target) {
    await page.goto(BASE_URL);
    // メンテナンス窓（JST 02:00-05:00）自体は registry の maintenanceWindowJst を使って
    // runScrapeTest 側で fast-fail する。ここでは窓の縁で "システム休止" ページが
    // 返ったケースを保険で検出し、transient 分類の型付きエラーで throw する。
    if (await page.getByText("システム休止", { exact: false }).first().isVisible()) {
      throw new MaintenanceWindowError("システム休止: site under maintenance");
    }
    await page.getByRole("link", { name: "ログインせずに空き状況を検索" }).click();
    await page.getByText("カテゴリで検索").click();
    await page.getByText(target.category, { exact: true }).click();
    await page.getByRole("button", { name: "選択した条件で次へ" }).click();
    await page.waitForLoadState("networkidle");

    // 対象部屋のチェックボックスを探してチェックする
    const siteRoomName = target.siteRoomName ?? target.roomName;
    const rows = page.locator("tr");
    const count = await rows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      if (text && text.includes(target.buildingName) && text.includes(siteRoomName)) {
        await rows.nth(i).locator('input[type="checkbox"]').click();
        found = true;
        break;
      }
    }
    if (!found) {
      // 窓内は runScrapeTest の guard が先に fast-fail するため、ここに到達する
      // 「部屋が見つからない」は構造変化（施設一覧の変化）とみなしてよい。
      throw new TargetNotFoundError(
        `Room not found: ${target.buildingName} ${siteRoomName} in category ${target.category}`
      );
    }

    await page.getByRole("button", { name: "選択した施設で検索" }).click();
    await page.waitForLoadState("networkidle");
    await page.locator("table.box_calendar").first().waitFor();
    return page;
  },

  async extract(page, target, pageCount) {
    // 「次の7日分」が末尾で同じ週を再表示するため、先頭日付の重複で終端を検知する
    let lastFirstDate = "";
    return collectPaginated({
      maxPages: pageCount,
      label: `${target.facilityName} ${target.roomName}`,
      extractPage: async () => {
        const days = await extractWeek(page);
        const firstDate = days[0]?.date ?? "";
        if (firstDate !== "" && firstDate === lastFirstDate) return null;
        lastFirstDate = firstDate;
        return days;
      },
      isDone: (collected) => collected.length >= pageCount,
      goNext: async () => {
        const nextLink = page.locator("a").filter({ hasText: "次の7日分" });
        if ((await nextLink.count()) === 0) return false;
        await nextLink.click();
        await page.waitForLoadState("networkidle");
        return true;
      },
    });
  },

  transform(extracted, target) {
    const slots: RawSlot[] = extracted.flatMap(({ date, header, statuses }) =>
      statuses.map((status, index) => ({
        roomName: target.roomName,
        date: toISODateString(date),
        division: header[index] ?? "",
        status,
      }))
    );
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
