import type { Page } from "@playwright/test";
import { stripTrailingEmptyValue } from "../common/arrayUtils.ts";
import { defineScraper } from "../common/defineScraper.ts";
import { toISODateString } from "../common/dateUtils.ts";
import { collectPaginated } from "../common/paginate.ts";
import { getCellValue, selectAllOptions } from "../common/playwrightUtils.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

const DIVISION_MAP: Record<string, Division> = {
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

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "/stagia/jsp/images_jp/multi_images/timetable-o.gif": "RESERVATION_STATUS_VACANT",
  Ｘ: "RESERVATION_STATUS_STATUS_1",
  保守: "RESERVATION_STATUS_STATUS_2",
  休館: "RESERVATION_STATUS_STATUS_3",
  開放: "RESERVATION_STATUS_STATUS_4",
};

const FACILITY_NAMES = [
  "三河島ひろば館",
  // "熊野前ひろば館",
  // "宮地ひろば館",
  "石浜ふれあい館",
  "南千住ふれあい館",
  // "南千住駅前ふれあい館",
  "汐入ふれあい館",
  "峡田ふれあい館",
  "荒川山吹ふれあい館",
  "町屋ふれあい館",
  "荒木田ふれあい館",
  "尾久ふれあい館",
  "西尾久ふれあい館",
  "東日暮里ふれあい館",
  "夕やけこやけふれあい館",
  "西日暮里ふれあい館",
  "東尾久本町通りふれあい館",
  "ひぐらしふれあい館",
  "アクト２１",
  "生涯学習センター",
  "町屋文化センター",
  "アクロスあらかわ",
  "ムーブ町屋",
  "日暮里サニーホール",
  "サンパール荒川",
];

interface ArakawaTarget {
  facilityName: string;
}

type ArakawaDay = { date: string; header: string[]; rows: string[][] };

async function extractDay(page: Page): Promise<ArakawaDay[]> {
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

  // th が複数ある行は時間区分ヘッダー行。部屋タイプが変わるたびにヘッダー行が挟まる
  const output: ArakawaDay[] = [];
  let currentHeader: string[] = [];
  let currentRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? [];
    const lineThCount = lineThCounts[i] ?? 0;
    if (lineThCount > 1) {
      const header = stripTrailingEmptyValue(await Promise.all(line.map((l) => l.innerText())));
      if (currentHeader.length > 0) {
        output.push({ date, header: currentHeader, rows: currentRows });
        currentRows = [];
      }
      currentHeader = header;
    } else {
      const row = stripTrailingEmptyValue(await Promise.all(line.map((l) => getCellValue(l))));
      if (row.length > 1) {
        currentRows.push(row);
      }
    }
  }
  output.push({ date, header: currentHeader, rows: currentRows });

  return output;
}

export const scraper = defineScraper({
  municipality: "tokyo-arakawa",
  targets: FACILITY_NAMES.map((facilityName): ArakawaTarget => ({ facilityName })),
  horizon: { startOffsetDays: 0, monthsAhead: 13, unit: "day" },
  facility: (t) => t.facilityName,

  async prepare(page, target) {
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
    await page.locator("#selectShisetsu").selectOption([{ label: target.facilityName }]);
    await page.locator("#buttonSetShisetsu").click();
    await selectAllOptions(page.locator("#selectRoom"));
    await page.locator("#buttonSetRoom").click();
    await page.getByRole("button", { name: "検索" }).click();
    return page;
  },

  async extract(page, target, pageCount) {
    return collectPaginated({
      maxPages: pageCount,
      label: target.facilityName,
      extractPage: () => extractDay(page),
      goNext: async () => {
        const nextLink = page.getByRole("link", { name: "次へ" });
        if ((await nextLink.count()) === 0) return false;
        await nextLink.click();
        return true;
      },
    });
  },

  transform(extracted) {
    // header[0] = "施設"、header[1:] = 時間区分。row[0] = "施設名\n部屋名"、row[1:] = ステータス
    const slots: RawSlot[] = extracted.flatMap(({ date, header, rows }) => {
      const divisions = header.slice(1);
      return rows.flatMap((row) => {
        const roomName = row[0]?.split("\n")?.[1] || "";
        if (roomName === "") return [];
        return row.slice(1).map((status, index) => ({
          roomName,
          date: toISODateString(date),
          division: divisions[index] ?? "",
          status,
        }));
      });
    });
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
