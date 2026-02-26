import type { Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";
import { toISODateString } from "../common/dateUtils";
import { stripTrailingEmptyValue } from "../common/arrayUtils";
import { getCellValue, selectAllOptions } from "../common/playwrightUtils";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "09:00\n～\n12:00": "RESERVATION_DIVISION_MORNING",
  "09:30\n～\n11:30": "RESERVATION_DIVISION_DIVISION_1",
  "12:00\n～\n14:00": "RESERVATION_DIVISION_DIVISION_2",
  "13:00\n～\n17:00": "RESERVATION_DIVISION_AFTERNOON",
  "14:30\n～\n16:30": "RESERVATION_DIVISION_DIVISION_3",
  "17:00\n～\n19:00": "RESERVATION_DIVISION_DIVISION_4",
  "18:00\n～\n22:00": "RESERVATION_DIVISION_EVENING",
  "19:30\n～\n21:30": "RESERVATION_DIVISION_DIVISION_5",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "/shisetsu/jsp/images_jp/multi_images/timetable-o.gif": "RESERVATION_STATUS_VACANT",
  Ｘ: "RESERVATION_STATUS_STATUS_1",
  保守: "RESERVATION_STATUS_STATUS_2",
  休館: "RESERVATION_STATUS_STATUS_3",
  問: "RESERVATION_STATUS_STATUS_4",
};

type ExtractOutput = { date: string; header: string[]; rows: string[][] }[];

export async function prepare(page: Page, facilityName: string): Promise<Page> {
  await page.goto("https://yoyaku.city.kita.tokyo.jp/shisetsu/reserve/gin_menu");
  await page.getByRole("button", { name: "多機能操作" }).click();
  await page.getByRole("link", { name: "空き状況の確認" }).click();
  await page
    .locator('select[name="g_bunruicd_1_show"]')
    .selectOption([{ label: "会館" }, { label: "文化センター" }]);
  await page.locator('form[name="selBunrui1"]').getByRole("button", { name: "確定" }).click();
  await page.locator('select[name="riyosmk"]').selectOption({ label: "音楽" });
  await page.locator('form[name="selForm_1"]').getByRole("button", { name: "確定" }).click();
  await page.locator('form[name="futaisetubiform"]').getByRole("button", { name: "確定" }).click();
  await page.locator('select[name="g_basyocd"]').selectOption({ label: facilityName });
  await page.locator('form[name="basyoForm_3"]').getByRole("button", { name: "確定" }).click();
  await selectAllOptions(page.locator('select[name="g_heyacd"]'));
  await page.locator('form[name="heyaform"]').getByRole("button", { name: "確定" }).click();
  await page.getByRole("button", { name: "検索" }).click();

  return page;
}

async function _extract(page: Page): Promise<ExtractOutput> {
  const dateHeader = page.locator('//*[@id="contents"]/div[2]/div/h3');
  await dateHeader.waitFor();
  const date = await dateHeader.innerText();
  const table = page.locator('//*[@id="contents"]/div[2]/div/div/table');
  await table.waitFor();
  const allLines = await Promise.all(await table.locator("tr").all());
  const lines = await Promise.all(allLines.map(async (line) => await line.locator("th,td").all()));
  const lineThCounts = await Promise.all(
    allLines.map(async (line) => await line.locator("th").count())
  );

  const output: ExtractOutput = [];
  const lineGroups: [string[], string[][]] = [[], []];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? [];
    const lineThCount = lineThCounts[i] ?? 0;
    if (lineThCount > 1) {
      const header = stripTrailingEmptyValue(await Promise.all(line.map((l) => l.innerText())));
      if (lineGroups[0].length > 0) {
        output.push({ date, header: lineGroups[0], rows: lineGroups[1] });
        lineGroups[1] = [];
      }
      lineGroups[0] = header;
    } else {
      const row = stripTrailingEmptyValue(await Promise.all(line.map((l) => getCellValue(l))));
      if (row.length > 1) {
        lineGroups[1].push(row);
      }
    }
  }
  output.push({ date, header: lineGroups[0], rows: lineGroups[1] });

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
    const nextLink = page.getByRole("link", { name: "次へ" });
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
  return extractOutput.flatMap(({ date, header, rows }) => {
    const divisions = header.slice(1);
    return rows
      .map((row) => {
        const statuses = row.slice(1);
        return {
          room_name: row[0]?.split("\n")?.[1]?.split("（定員")?.[0] || "",
          date: toISODateString(date),
          reservation: [...new Array(row.length - 1)].reduce((acc, _, index) => {
            const division = DIVISION_MAP[divisions[index] || ""] as Division;
            const status = STATUS_MAP[statuses[index] || ""] as Status;
            acc[division] = status;
            return acc;
          }, {}),
        };
      })
      .filter((entry) => entry.room_name !== "");
  });
}
