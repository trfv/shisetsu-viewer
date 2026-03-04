import type { Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";
import { toISODateString } from "../common/dateUtils";
import { stripTrailingEmptyValue } from "../common/arrayUtils";
import { getCellValue } from "../common/playwrightUtils";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-12:00": "RESERVATION_DIVISION_MORNING",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "18:00-22:00": "RESERVATION_DIVISION_EVENING",
  "9:30-11:30": "RESERVATION_DIVISION_DIVISION_1",
  "12:00-14:00": "RESERVATION_DIVISION_DIVISION_2",
  "14:30-16:30": "RESERVATION_DIVISION_DIVISION_3",
  "17:00-19:00": "RESERVATION_DIVISION_DIVISION_4",
  "19:30-21:30": "RESERVATION_DIVISION_DIVISION_5",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "-": "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
  休館日: "RESERVATION_STATUS_STATUS_4",
  なし: "RESERVATION_STATUS_STATUS_5",
  公開対象外: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_7",
  整備: "RESERVATION_STATUS_STATUS_8",
  抽選確認中: "RESERVATION_STATUS_STATUS_9",
  保守: "RESERVATION_STATUS_STATUS_10",
  開放: "RESERVATION_STATUS_STATUS_11",
  使用禁止: "RESERVATION_STATUS_STATUS_12",
};

type ExtractOutput = { date: string; header: string[]; rows: string[][] }[];

export async function prepare(page: Page, links: string[]): Promise<Page> {
  await page.goto("https://kita-yoyaku.openreaf02.jp/");
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

  const allHeaders: string[] = [];
  const allRow: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const h = stripTrailingEmptyValue(
      (await Promise.all((lines[i] || []).map((l) => l.innerText()))).map((v) => v.trim())
    );
    const r = stripTrailingEmptyValue(
      (await Promise.all((lines[i + 1] || []).map((l) => getCellValue(l)))).map((v) => v.trim())
    );
    allHeaders.push(...h);
    allRow.push(...r);
  }
  return [{ date, header: allHeaders, rows: [allRow] }];
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
