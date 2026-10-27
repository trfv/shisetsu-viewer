import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { defineScraper } from "../common/defineScraper.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

// 5 コマを午後・夜間の 1/2 に分けるのは、両方空いた日を「午後空き」「夜間空き」の検索に載せるため。実時刻は施設 JSON の division_labels で出す
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:30-11:30": "RESERVATION_DIVISION_MORNING",
  "12:00-14:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "14:30-16:30": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "17:00-19:00": "RESERVATION_DIVISION_EVENING_ONE",
  "19:30-21:30": "RESERVATION_DIVISION_EVENING_TWO",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  〇: "RESERVATION_STATUS_VACANT",
  "✕": "RESERVATION_STATUS_STATUS_1",
  休館日: "RESERVATION_STATUS_STATUS_2",
};

const BASE_URL = "https://theatre1010.com/Client/ReservationCalendar.aspx";
const START_OFFSET_DAYS = 1;

interface Theatre1010Target {
  facilityName: string;
  roomName: string;
}

interface MonthPage {
  /** ddlYearMonth の値。YYYY/MM/01 */
  yearMonth: string;
  divisions: string[];
  rows: { date: string; statuses: string[] }[];
}

const targets: Theatre1010Target[] = [
  { facilityName: "シアター1010", roomName: "音楽練習室 1" },
  { facilityName: "シアター1010", roomName: "音楽練習室 2" },
];

async function waitForMonth(page: Page, value: string): Promise<void> {
  const label = await page.locator(`#ddlYearMonth option[value="${value}"]`).textContent();
  await page.waitForFunction(
    (expected) => document.getElementById("lblYearMonth")?.textContent?.trim() === expected,
    (label ?? "").trim()
  );
}

async function selectMonth(page: Page, value: string): Promise<void> {
  const current = await page.locator("#ddlYearMonth").inputValue();
  if (current === value) return;
  await page.selectOption("#ddlYearMonth", value);
  await waitForMonth(page, value);
}

async function readMonthPage(page: Page): Promise<MonthPage> {
  return page.evaluate(() => {
    const select = document.getElementById("ddlYearMonth");
    const yearMonth = select instanceof HTMLSelectElement ? select.value : "";
    const divisions = [...document.querySelectorAll("#calendar thead th")]
      .slice(1)
      .map((th) => (th.textContent ?? "").trim());
    const rows = [...document.querySelectorAll("#calendar tbody tr")].map((tr) => {
      const cells = [...tr.querySelectorAll("td")].map((td) => (td.textContent ?? "").trim());
      return { date: cells[0] ?? "", statuses: cells.slice(1) };
    });
    return { yearMonth, divisions, rows };
  });
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toSlots(pages: readonly MonthPage[], roomName: string, minDate: string): RawSlot[] {
  const slots: RawSlot[] = [];
  for (const { yearMonth, divisions, rows } of pages) {
    const [year, month] = yearMonth.split("/").map(Number);
    for (const row of rows) {
      const match = row.date.match(/^(\d{1,2})\/(\d{1,2})/);
      // 日付セルに年が無いので、月がずれていれば別の月のテーブルを読んでいる
      if (!match || Number(match[1]) !== month) {
        throw new Error(`theatre1010: ${yearMonth} の表に "${row.date}" の行があります`);
      }
      const date = `${year}-${pad2(month ?? 0)}-${pad2(Number(match[2]))}`;
      if (date < minDate) continue;
      row.statuses.forEach((status, i) => {
        slots.push({
          roomName,
          date,
          division: (divisions[i] ?? "").replace("～", "-"),
          status,
        });
      });
    }
  }
  return slots;
}

export const scraper = defineScraper({
  municipality: "tokyo-adachi-1010",
  targets,
  // 当月から 6 ヶ月先の月までがドロップダウンに出る
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 6, unit: "month" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],

  async prepare(page, target) {
    await page.goto(BASE_URL);
    const tab = page.locator(".tab_button_group a", { hasText: target.roomName });
    await tab.click();
    await page.waitForFunction(
      (roomName) =>
        document.querySelector(".tab_button_group a.active")?.textContent?.trim() === roomName,
      target.roomName
    );
    return page;
  },

  async extract(page, target, pageCount) {
    await selectMonth(page, format(addDays(new Date(), START_OFFSET_DAYS), "yyyy/MM/01"));
    return collectPaginated<MonthPage>({
      maxPages: pageCount,
      label: `tokyo-adachi-1010 ${target.roomName}`,
      async extractPage() {
        const monthPage = await readMonthPage(page);
        if (monthPage.rows.length === 0) {
          throw new Error(`theatre1010: ${monthPage.yearMonth} の表に行がありません`);
        }
        return [monthPage];
      },
      async goNext() {
        const values = await page
          .locator("#ddlYearMonth option")
          .evaluateAll((options) => options.map((o) => o.getAttribute("value") ?? ""));
        const current = await page.locator("#ddlYearMonth").inputValue();
        const next = values[values.indexOf(current) + 1];
        if (next === undefined) return false;
        await selectMonth(page, next);
        return true;
      },
    });
  },

  transform(extracted, target) {
    const minDate = format(addDays(new Date(), START_OFFSET_DAYS), "yyyy-MM-dd");
    return rawSlotsToOutput(toSlots(extracted, target.roomName, minDate), DIVISION_MAP, STATUS_MAP);
  },
});
