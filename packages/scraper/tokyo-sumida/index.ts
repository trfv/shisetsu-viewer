import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { defineScraper } from "../common/defineScraper.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  一部空き: "RESERVATION_STATUS_STATUS_1",
  空きなし: "RESERVATION_STATUS_STATUS_2",
  申込期間外: "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
  休館日: "RESERVATION_STATUS_STATUS_4",
  なし: "RESERVATION_STATUS_STATUS_5",
  公開対象外: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_7",
};

const FACILITY_NAMES = [
  "社会福祉会館",
  "すみだ生涯学習センター",
  "曳舟文化センター",
  "みどりコミュニティセンター",
];

interface SumidaTarget {
  facilityName: string;
}

type SumidaTable = { division: string; header: string[]; rows: string[][] };

/** ヘッダーの期間表示（例 "2026/3/10(火)～"）から ISO 日付列を組み立てる */
function buildISODateStrings(headerStartDate: string, dates: string[]): string[] {
  const base = new Date(
    headerStartDate
      .split("/")
      .flatMap((part) => {
        const match = part.match(/\d+/);
        return match ? [match[0]] : [];
      })
      .join("-")
  );
  return dates.map((_, index) => format(addDays(base, index), "yyyy-MM-dd"));
}

async function extractTable(page: Page, division: string): Promise<SumidaTable> {
  const table = page.locator(
    '//*[@id="app"]/div[3]/form/div[1]/div/div[3]/div[2]/div[2]/div/div/div/div[3]/div[2]/table'
  );
  await table.waitFor();
  const lines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("th,td").all())
  );

  const header = await Promise.all((lines[0] || []).map((l) => l.innerText()));
  const rows = await Promise.all(
    lines.slice(1).map(async (line) => await Promise.all(line.map((l) => l.innerText())))
  );
  return { division, header, rows };
}

export const scraper = defineScraper({
  municipality: "tokyo-sumida",
  targets: FACILITY_NAMES.map((facilityName): SumidaTarget => ({ facilityName })),
  horizon: { startOffsetDays: 1, monthsAhead: 7, unit: "week" },
  facility: (t) => t.facilityName,

  async prepare(page, target) {
    await page.goto("https://yoyaku03.city.sumida.lg.jp/user/Home");
    await page.getByRole("tab", { name: "利用目的から探す" }).click();
    await page.getByText("器楽演奏", { exact: true }).click();
    await page.getByText("器楽演奏（現地相談）", { exact: true }).click();
    await page.getByText("合唱・歌唱・詩吟", { exact: true }).click();
    await page.getByText("合唱・歌唱・詩吟（現地相談）", { exact: true }).click();
    await page.getByRole("button", { name: "検索" }).click();
    await page.getByText(target.facilityName, { exact: true }).click();
    await page.getByRole("button", { name: "次へ進む" }).click();
    return page;
  },

  async extract(page, target, pageCount) {
    const startDateString = format(new Date(), "yyyy-MM-dd");
    const output: SumidaTable[] = [];

    for (const division of Object.keys(DIVISION_MAP).filter(Boolean)) {
      await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
      await page.getByRole("textbox", { name: "表示期間" }).fill(startDateString);
      await page.getByText(division, { exact: true }).click();
      await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
      await page.getByRole("button", { name: "表示" }).click();

      const tables = await collectPaginated({
        maxPages: pageCount,
        label: `${target.facilityName} ${division}`,
        extractPage: async () => [await extractTable(page, division)],
        goNext: async () => {
          const nextButton = page.getByRole("button", { name: "次の期間" });
          if ((await nextButton.count()) === 0) return false;
          await nextButton.click();
          return true;
        },
      });
      output.push(...tables);
    }

    return output;
  },

  transform(extracted) {
    // header[0] = 期間表示、header[2:] = 日付列。row[0] = "部屋名 定員"、row[2:] = ステータス
    const slots: RawSlot[] = extracted.flatMap(({ division, header, rows }) => {
      const dates = buildISODateStrings(header[0] ?? "", header.slice(2));
      return dates.flatMap((date, i) =>
        rows.map((row) => ({
          roomName: row[0]?.split(" ")?.[0] || "",
          date,
          division,
          status: row[i + 2] ?? "",
        }))
      );
    });
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
