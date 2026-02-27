import type { Locator, Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";
import { toISODateString } from "../common/dateUtils";
import { getCellValue } from "../common/playwrightUtils";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
  "①": "RESERVATION_DIVISION_MORNING_ONE",
  "②": "RESERVATION_DIVISION_MORNING_TWO",
  "③": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "④": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "⑤": "RESERVATION_DIVISION_EVENING_ONE",
  "⑥": "RESERVATION_DIVISION_EVENING_TWO",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "image/lw_emptybs.gif": "RESERVATION_STATUS_VACANT",
  "image/lw_finishs.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_closes.gif": "RESERVATION_STATUS_STATUS_2",
  "image/lw_keeps.gif": "RESERVATION_STATUS_STATUS_3",
  "image/lw_kikangais.gif": "RESERVATION_STATUS_STATUS_4",
  "image/lw_sound.gif": "RESERVATION_STATUS_STATUS_5",
};

type ExtractOutput = { header: string[]; rows: string[][] }[];

export async function prepare(
  page: Page,
  facilityName: string,
  startDate: Date,
  monthDiff: number
): Promise<Page> {
  await page.goto("https://www.kcf.or.jp/yoyaku/shisetsu/");
  await page.getByText("利用規約に同意する").click();
  const searchPagePromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "施設を予約する・空き状況を見る" }).click();
  const searchPage = await searchPagePromise;
  await searchPage.getByRole("link", { name: "施設の空き状況" }).click();
  await searchPage.getByRole("link", { name: "複合検索条件" }).click();
  await searchPage.getByRole("link", { name: "利用目的分類" }).click();
  await searchPage.getByRole("link", { name: "音楽講習" }).click();
  await searchPage.getByRole("link", { name: "年月日" }).click();
  if (monthDiff > 0) {
    while (monthDiff > 0) {
      await searchPage.getByRole("link", { name: "次月" }).click();
      monthDiff--;
    }
    await searchPage
      .getByRole("link", { name: startDate.getDate().toString(), exact: true })
      .click();
  }
  await searchPage.getByRole("link", { name: "設定" }).click();
  await searchPage.getByRole("link", { name: "館" }).click();
  await searchPage.getByRole("link", { name: facilityName }).click();
  await searchPage.getByRole("link", { name: "検索を開始する" }).click();

  return searchPage;
}

async function _extract(page: Page): Promise<ExtractOutput> {
  const table = page.locator('//*[@id="disp"]/center/table[3]/tbody[2]/tr[3]/td[2]/center/table');
  await table.waitFor();
  const allLines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("td").all())
  );
  const lineGroups = Object.values(
    Object.groupBy(allLines, (line) => line.length)
  ) as Locator[][][];

  const output: ExtractOutput = [];

  for (const lines of lineGroups) {
    const header = await Promise.all((lines[0] || []).map((l) => l.innerText()));
    const rows: string[][] = [];
    for (const line of lines.slice(1)) {
      const row = await Promise.all(line.map((l) => getCellValue(l)));
      rows.push(row);
    }
    output.push({ header, rows });
  }

  return output;
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
    const nextLink = page.getByRole("link", { name: "翌日" });
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

export async function transform(extractOutput: ExtractOutput): Promise<TransformOutput> {
  return extractOutput.flatMap(({ header, rows }) => {
    const divisions = header.slice(1);
    return rows.map((row) => {
      const statuses = row.slice(1);
      return {
        room_name: row[0] as string,
        date: toISODateString(header[0] as string),
        reservation: [...new Array(row.length - 1)].reduce((acc, _, index) => {
          const division = DIVISION_MAP[divisions[index] || ""] as Division;
          const status = STATUS_MAP[statuses[index] || ""] as Status;
          acc[division] = status;
          return acc;
        }, {}),
      };
    });
  });
}
