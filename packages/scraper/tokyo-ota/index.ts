import type { Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";
import { toISODateString } from "../common/dateUtils";
import { getCellValue } from "../common/playwrightUtils";

const BASE_URL = "https://www.yoyaku.city.ota.tokyo.jp/eshisetsu/menu/Welcome.cgi";

const DIVISION_MAP: Record<string, Division> = {
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

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "../img/std/common/icn_scche_ok.png": "RESERVATION_STATUS_VACANT",
  "../img/std/common/icn_scche_noset.png": "RESERVATION_STATUS_STATUS_1",
  "../img/std/common/icn_scche_out.png": "RESERVATION_STATUS_STATUS_2",
  "../img/std/common/icn_scche_rest.png": "RESERVATION_STATUS_STATUS_3",
  "../img/std/common/icn_scche_hoshu.png": "RESERVATION_STATUS_STATUS_4",
  "../img/std/common/icn_scche_uten.png": "RESERVATION_STATUS_STATUS_5",
  "../img/std/common/icn_scche_haifun.png": "RESERVATION_STATUS_STATUS_7",
};

type ExtractOutput = { date: string; header: string[]; rows: string[][] }[];

export async function prepare(
  page: Page,
  category: string,
  buildingName: string,
  roomName: string
): Promise<Page> {
  await page.goto(BASE_URL);
  await page.getByRole("link", { name: "ログインせずに空き状況を検索" }).click();
  await page.getByText("カテゴリで検索").click();
  await page.getByText(category, { exact: true }).click();
  await page.getByRole("button", { name: "選択した条件で次へ" }).click();
  await page.waitForLoadState("networkidle");

  // Find and check the target room's checkbox
  const rows = page.locator("tr");
  const count = await rows.count();
  let found = false;
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).textContent();
    if (text && text.includes(buildingName) && text.includes(roomName)) {
      await rows.nth(i).locator('input[type="checkbox"]').click();
      found = true;
      break;
    }
  }
  if (!found) {
    throw new Error(`Room not found: ${buildingName} ${roomName} in category ${category}`);
  }

  await page.getByRole("button", { name: "選択した施設で検索" }).click();
  await page.waitForLoadState("networkidle");
  await page.locator("table.box_calendar").first().waitFor();

  return page;
}

async function _extract(page: Page): Promise<ExtractOutput> {
  const table = page.locator("table.box_calendar").first();
  await table.waitFor();

  const year = await page.locator("#optYear").inputValue();

  // Get date headers from <p class="day"> inside date row TH cells (skip first empty TH)
  const dateThs = await table.locator("tr.date th").all();
  const dates: string[] = [];
  for (const dateTh of dateThs.slice(1)) {
    const dayText = await dateTh.locator("p.day").innerText();
    dates.push(`${year}年${dayText}`);
  }

  // Get data rows (all rows except the date header row)
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
    rows: [statusesByDay[dayIdx] ?? []],
  }));
}

export async function extract(page: Page, maxCount: number): Promise<ExtractOutput> {
  const output: ExtractOutput = [];
  let lastFirstDate = "";

  while (output.length < maxCount) {
    try {
      const o = await _extract(page);
      const firstDate = o[0]?.date ?? "";
      if (firstDate !== "" && firstDate === lastFirstDate) break;
      lastFirstDate = firstDate;
      output.push(...o);
    } catch {
      console.warn(`Failed to extract data at offset ${output.length}, saving current output.`);
      break;
    }

    if (output.length >= maxCount) break;

    const nextLink = page.locator("a").filter({ hasText: "次の7日分" });
    if ((await nextLink.count()) === 0) break;
    try {
      await nextLink.click();
      await page.waitForLoadState("networkidle");
    } catch {
      console.warn(`Failed to navigate to next week at offset ${output.length}.`);
      break;
    }
  }

  return output;
}

export async function transform(
  name: string,
  extractOutput: ExtractOutput
): Promise<TransformOutput> {
  return extractOutput.map(({ date, header, rows }) => {
    const row = rows[0] ?? [];
    return {
      room_name: name,
      date: toISODateString(date),
      reservation: row.reduce<Record<string, Status>>((acc, value, index) => {
        const division = DIVISION_MAP[header[index] ?? ""] as Division;
        const status = STATUS_MAP[value || ""] as Status;
        acc[division] = status;
        return acc;
      }, {}),
    };
  });
}
