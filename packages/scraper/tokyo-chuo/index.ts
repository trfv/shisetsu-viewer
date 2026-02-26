import type { Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";
import { toISODateString } from "../common/dateUtils";
import { stripTrailingEmptyValue } from "../common/arrayUtils";
import { getCellValue } from "../common/playwrightUtils";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-12:00": "RESERVATION_DIVISION_MORNING",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "18:00-21:00": "RESERVATION_DIVISION_EVENING",
  // "9:00-10:00": "RESERVATION_DIVISION_DIVISION_1",
  // "10:00-11:00": "RESERVATION_DIVISION_DIVISION_2",
  // "11:00-12:00": "RESERVATION_DIVISION_DIVISION_3",
  // "12:00-13:00": "RESERVATION_DIVISION_DIVISION_4",
  // "13:00-14:00": "RESERVATION_DIVISION_DIVISION_5",
  // "14:00-15:00": "RESERVATION_DIVISION_DIVISION_6",
  // "15:00-16:00": "RESERVATION_DIVISION_DIVISION_7",
  // "16:00-17:00": "RESERVATION_DIVISION_DIVISION_8",
  // "17:00-18:00": "RESERVATION_DIVISION_DIVISION_9",
  // "18:00-19:00": "RESERVATION_DIVISION_DIVISION_10",
  // "19:00-20:00": "RESERVATION_DIVISION_DIVISION_11",
  // "20:00-21:00": "RESERVATION_DIVISION_DIVISION_12",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "-": "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
  なし: "RESERVATION_STATUS_STATUS_5",
  公開対象外: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_7",
  整備: "RESERVATION_STATUS_STATUS_8",
  抽選確認中: "RESERVATION_STATUS_STATUS_9",
};

type ExtractOutput = { date: string; header: string[]; rows: string[][] }[];

export async function prepare(page: Page, links: string[]): Promise<Page> {
  await page.goto("https://chuo-yoyaku.openreaf02.jp/");
  await page.getByRole("link", { name: "空き状況の確認" }).click();
  await page.getByRole("link", { name: "施設で確認" }).click();
  for (const link of links) {
    await page.getByRole("link", { name: link, exact: true }).click();
  }
  while (true) {
    if ((await page.locator("table.calendar a").count()) > 0) {
      break;
    }
    await page.locator("a.day-next").click();
  }
  await page.locator("table.calendar a").nth(0).click();

  return page;
}

async function _extract(page: Page): Promise<ExtractOutput> {
  const caption = page.locator('//*[@id="right"]/form/table[1]');
  await caption.waitFor();
  const date = await caption.locator("th").innerText();
  const table = page.locator('//*[@id="right"]/form/table[2]');
  await table.waitFor();
  const lines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("th,td").all())
  );

  const header = stripTrailingEmptyValue(
    (await Promise.all((lines[0] || []).map((l) => l.innerText()))).map((v) => v.trim())
  );
  const row = stripTrailingEmptyValue(
    (await Promise.all((lines[1] || []).map((l) => getCellValue(l)))).map((v) => v.trim())
  );
  return [{ date, header, rows: [row] }];
}

export async function extract(page: Page, maxCount: number): Promise<ExtractOutput> {
  const output: ExtractOutput = [];

  let i = 0;
  while (i < maxCount) {
    try {
      const o = await _extract(page);
      output.push(...o);
    } catch {
      console.warn(`Failed to extract data from page ${i + 1}, saving current output.`);
      break;
    }
    const nextLink = page.locator("a.day-next");
    if ((await nextLink.count()) === 0) break;
    try {
      await nextLink.click();
    } catch {
      console.warn(`Failed to navigate to next page at page ${i + 1}.`);
      break;
    }
    i++;
  }

  return output;
}

export async function transform(
  name: string,
  extractOutput: ExtractOutput
): Promise<TransformOutput> {
  return extractOutput.flatMap(({ date, header, rows }) => {
    return rows.map((row) => {
      return {
        room_name: name,
        date: toISODateString(date),
        reservation: [...new Array(row.length)].reduce((acc, _, index) => {
          const division = DIVISION_MAP[header[index] || ""] as Division;
          const status = STATUS_MAP[row[index] || ""] as Status;
          acc[division] = status;
          return acc;
        }, {}),
      };
    });
  });
}
