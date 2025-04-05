import type { Page } from "@playwright/test";
import { toISODateString } from "../common/dateUtils";
import { stripTrailingEmptyValue } from "../common/arrayUtils";
import { selectAllOptions } from "../common/playwrightUtils";

type Division =
  | "RESERVATION_DIVISION_INVALID"
  | "RESERVATION_DIVISION_MORNING"
  | "RESERVATION_DIVISION_AFTERNOON"
  | "RESERVATION_DIVISION_AFTERNOON_ONE"
  | "RESERVATION_DIVISION_AFTERNOON_TWO"
  | "RESERVATION_DIVISION_EVENING";

const DIVISION_MAP: { [key: string]: Division } = {
  "": "RESERVATION_DIVISION_INVALID",
  "09:00\n～\n12:00": "RESERVATION_DIVISION_MORNING",
  "09:00\n～\n12:30": "RESERVATION_DIVISION_MORNING",
  "12:00\n～\n15:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "12:20\n～\n15:20": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "12:15\n～\n15:15": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "12:30\n～\n15:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "13:30\n～\n17:00": "RESERVATION_DIVISION_AFTERNOON",
  "15:00\n～\n18:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "15:30\n～\n18:30": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "15:40\n～\n18:40": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "18:00\n～\n21:00": "RESERVATION_DIVISION_EVENING",
  "18:00\n～\n22:00": "RESERVATION_DIVISION_EVENING",
  "18:45\n～\n21:45": "RESERVATION_DIVISION_EVENING",
  "19:00\n～\n21:30": "RESERVATION_DIVISION_EVENING",
  "19:00\n～\n22:00": "RESERVATION_DIVISION_EVENING",
};

type Status =
  | "RESERVATION_STATUS_INVALID"
  | "RESERVATION_STATUS_VACANT"
  | "RESERVATION_STATUS_STATUS_1"
  | "RESERVATION_STATUS_STATUS_2"
  | "RESERVATION_STATUS_STATUS_3"
  | "RESERVATION_STATUS_STATUS_4";

const STATUS_MAP: { [key: string]: Status } = {
  "": "RESERVATION_STATUS_INVALID",
  "/stagia/jsp/images_jp/multi_images/timetable-o.gif": "RESERVATION_STATUS_VACANT",
  Ｘ: "RESERVATION_STATUS_STATUS_1",
  保守: "RESERVATION_STATUS_STATUS_2",
  休館: "RESERVATION_STATUS_STATUS_3",
  開放: "RESERVATION_STATUS_STATUS_4",
};

type Reservation = { [K in Division]?: Status };

type ExtractOutput = { date: string; header: string[]; rows: string[][] }[];

type TransformOutput = {
  room_name: string;
  date: string;
  reservation: Reservation;
}[];

export async function prepare(page: Page, facilityName: string): Promise<Page> {
  await page.goto("https://shisetsu.city.arakawa.tokyo.jp/stagia/reserve/gin_menu");
  await page.getByRole("button", { name: "多機能操作" }).click();
  await page.getByRole("link", { name: "空き状況の確認" }).click();
  await selectAllOptions(page.locator("#selectBunrui1"));
  await page.locator("#buttonSetBunrui1").click();
  await selectAllOptions(page.locator("#selectBunrui2"));
  await page.locator("#buttonSetBunrui2").click();
  await selectAllOptions(page.locator("#selectBunrui3"));
  await page.locator("#buttonSetBunrui3").click();
  await page.locator("#selectItem").selectOption({ label: "楽器演奏" });
  await page.locator("#buttonSetItem").click();
  await page.locator("#selectShisetsu").selectOption([{ label: facilityName }]);
  await page.locator("#buttonSetShisetsu").click();
  await selectAllOptions(page.locator("#selectRoom"));
  await page.locator("#buttonSetRoom").click();
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
      const row = await Promise.all(
        line.map((l) =>
          l.innerText().then((value) => {
            if (value) {
              return value;
            }
            return l.innerHTML().then((value) => {
              const match = value.match(/src="([^"]+)"/);
              return match?.[1] ?? "";
            });
          })
        )
      );
      lineGroups[1].push(stripTrailingEmptyValue(row));
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
      console.warn(`Failed to extract data from page ${i + 1}, and jump to save current output.`);
      break;
    }
    try {
      await page.getByRole("link", { name: "次へ" }).click();
    } catch {
      break;
    }
    i++;
  }

  return output;
}

export async function transform(extractOutput: ExtractOutput): Promise<TransformOutput> {
  return extractOutput.flatMap(({ date, header, rows }) => {
    const divisions = header.slice(1);
    return rows.map((row) => {
      const statuses = row.slice(1);
      return {
        room_name: row[0]?.split("\n")?.[1] || "",
        date: toISODateString(date),
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
