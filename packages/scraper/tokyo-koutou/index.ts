import type { Locator, Page } from "@playwright/test";
import { addDays, endOfMonth, format } from "date-fns";
import { defineScraper } from "../common/defineScraper.ts";
import { toISODateString } from "../common/dateUtils.ts";
import { collectPaginated } from "../common/paginate.ts";
import { getCellValue } from "../common/playwrightUtils.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

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

const FACILITY_NAMES = [
  "江東区文化センター",
  "東大島文化センター",
  "豊洲文化センター",
  "砂町文化センター",
  "森下文化センター",
  "古石場文化センター",
  "亀戸文化センター",
  "総合区民センター",
  "江東公会堂（ティアラこうとう）",
  "深川江戸資料館",
];

interface KoutouTarget {
  facilityName: string;
  /** この対象がカバーする月範囲の開始日 */
  startDate: Date;
  /** 今月から何ヶ月先か（カレンダーの「次月」クリック回数） */
  monthDiff: number;
  /** 範囲内の日数（ページ送り回数） */
  days: number;
  rangeCount: number;
}

/** 今月から5ヶ月分を1ヶ月ずつの範囲に分割する（1範囲 = 1テスト） */
function buildTargets(): KoutouTarget[] {
  const ranges: { startDate: Date; days: number }[] = [];
  let cursor = new Date();
  for (let i = 0; i < 5; i++) {
    const end = endOfMonth(cursor);
    ranges.push({ startDate: cursor, days: end.getDate() - cursor.getDate() + 1 });
    cursor = addDays(end, 1);
  }
  return FACILITY_NAMES.flatMap((facilityName) =>
    ranges.map((range, monthDiff) => ({
      facilityName,
      startDate: range.startDate,
      monthDiff,
      days: range.days,
      rangeCount: ranges.length,
    }))
  );
}

type KoutouGroup = { header: string[]; rows: string[][] };

async function extractGroups(page: Page): Promise<KoutouGroup[]> {
  const table = page.locator('//*[@id="disp"]/center/table[3]/tbody[2]/tr[3]/td[2]/center/table');
  await table.waitFor();
  const allLines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("td").all())
  );
  // 部屋タイプごとに時間区分の列数が異なるため、列数でグルーピングする
  const lineGroups = Object.values(
    Object.groupBy(allLines, (line) => line.length)
  ) as Locator[][][];

  const output: KoutouGroup[] = [];
  for (const lines of lineGroups) {
    const header = await Promise.all((lines[0] || []).map((l) => l.innerText()));
    const rows: string[][] = [];
    for (const line of lines.slice(1)) {
      rows.push(await Promise.all(line.map((l) => getCellValue(l))));
    }
    output.push({ header, rows });
  }
  return output;
}

export const scraper = defineScraper({
  municipality: "tokyo-koutou",
  targets: buildTargets(),
  horizon: (t) => t.days,
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} (${t.monthDiff + 1} / ${t.rangeCount})`,
  context: (t) => ({ dateRangeStart: format(t.startDate, "yyyyMM") }),
  outputs: (data, t) => [
    {
      fileName: `${t.facilityName}_${format(t.startDate, "yyyyMM")}`,
      facilityName: t.facilityName,
      data,
    },
  ],

  async prepare(page, target) {
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
    if (target.monthDiff > 0) {
      for (let i = 0; i < target.monthDiff; i++) {
        await searchPage.getByRole("link", { name: "次月" }).click();
      }
      await searchPage
        .getByRole("link", { name: target.startDate.getDate().toString(), exact: true })
        .click();
    }
    await searchPage.getByRole("link", { name: "設定" }).click();
    await searchPage.getByRole("link", { name: "館" }).click();
    await searchPage.getByRole("link", { name: target.facilityName }).click();
    await searchPage.getByRole("link", { name: "検索を開始する" }).click();
    return searchPage;
  },

  async extract(page, target, pageCount) {
    return collectPaginated({
      maxPages: pageCount,
      label: target.facilityName,
      extractPage: () => extractGroups(page),
      goNext: async () => {
        const nextLink = page.getByRole("link", { name: "翌日" });
        if ((await nextLink.count()) === 0) return false;
        await nextLink.click();
        return true;
      },
    });
  },

  transform(extracted) {
    // header[0] = 日付、header[1:] = 時間区分。row[0] = 部屋名、row[1:] = ステータス
    const slots: RawSlot[] = extracted.flatMap(({ header, rows }) => {
      const date = toISODateString(header[0] ?? "");
      const divisions = header.slice(1);
      return rows.flatMap((row) =>
        row.slice(1).map((status, index) => ({
          roomName: row[0] ?? "",
          date,
          division: divisions[index] ?? "",
          status,
        }))
      );
    });
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
