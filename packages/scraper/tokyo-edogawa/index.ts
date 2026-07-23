import type { Page } from "@playwright/test";

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
  公開対象外: "RESERVATION_STATUS_STATUS_4",
  抽選: "RESERVATION_STATUS_STATUS_5",
  休館: "RESERVATION_STATUS_STATUS_6",
};

interface EdogawaTarget {
  facilityName: string;
  category: string;
}

const targets: EdogawaTarget[] = [
  // 地域施設・図書館
  { facilityName: "松江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "一之江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "コミュニティプラザ一之江", category: "地域施設・図書館" },
  { facilityName: "松江区民プラザ", category: "地域施設・図書館" },
  { facilityName: "松島コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "グリーンパレス", category: "地域施設・図書館" },
  { facilityName: "文化スポーツプラザ", category: "地域施設・図書館" },
  { facilityName: "小松川区民館", category: "地域施設・図書館" },
  { facilityName: "小松川さくらホール", category: "地域施設・図書館" },
  { facilityName: "平井コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "中平井コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "葛西区民館", category: "地域施設・図書館" },
  { facilityName: "船堀コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "北葛西コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "二之江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "南葛西会館", category: "地域施設・図書館" },
  { facilityName: "新田コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "清新町コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "臨海町コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "東葛西コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "長島桑川コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "新川さくら館", category: "地域施設・図書館" },
  { facilityName: "小岩区民館", category: "地域施設・図書館" },
  { facilityName: "小岩アーバンプラザ", category: "地域施設・図書館" },
  { facilityName: "西小岩コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "北小岩コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "南小岩コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "上一色コミュニティセンター", category: "地域施設・図書館" },
  { facilityName: "東部区民館", category: "地域施設・図書館" },
  { facilityName: "東部フレンドホール", category: "地域施設・図書館" },
  { facilityName: "瑞江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "江戸川コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "鹿骨区民館", category: "地域施設・図書館" },
  { facilityName: "篠崎コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "篠崎コミュニティホール", category: "地域施設・図書館" },
  { facilityName: "篠崎文化プラザ", category: "地域施設・図書館" },
  { facilityName: "西葛西図書館", category: "地域施設・図書館" },
  { facilityName: "小岩図書館", category: "地域施設・図書館" },
  // 大型文化施設
  { facilityName: "総合文化センター", category: "大型文化施設" },
  { facilityName: "タワーホール船堀", category: "大型文化施設" },
];

const TIME_PERIOD_LABELS = ["午前", "午後", "夜間"];

type EdogawaPeriod = {
  division: string;
  year: string;
  dates: string[];
  rows: { roomName: string; statuses: string[] }[];
};

function toISODate(year: string, dateStr: string): string {
  // dateStr: "3/10 火" or "3/10" → 月と日を抽出
  const match = dateStr.match(/(\d+)\/(\d+)/);
  if (!match?.[1] || !match[2]) return "";
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function extractPeriod(page: Page, division: string): Promise<EdogawaPeriod> {
  const table = page.locator("table").first();
  const headerCells = await table.locator("thead tr th").all();

  // 先頭ヘッダーセルは "2026/3/10(火)～" のような期間表示
  const firstCell = headerCells[0];
  if (!firstCell) throw new Error("No header cells found in table");
  const firstHeader = await firstCell.innerText();
  const yearMatch = firstHeader.match(/(\d{4})\//);
  const year = yearMatch?.[1] ?? new Date().getFullYear().toString();

  // 日付列は index 2 から（部屋名ヘッダーと定員ヘッダーをスキップ）
  const dates: string[] = [];
  for (let i = 2; i < headerCells.length; i++) {
    const cell = headerCells[i];
    if (!cell) continue;
    const text = await cell.innerText();
    dates.push(text.trim());
  }

  const bodyRows = await table.locator("tbody tr").all();
  const rows: { roomName: string; statuses: string[] }[] = [];

  for (const row of bodyRows) {
    const cells = await row.locator("td").all();
    if (cells.length < 3) continue;

    const firstTd = cells[0];
    if (!firstTd) continue;
    const roomName = (await firstTd.innerText()).trim();
    // 定員セル (index 1) をスキップし、ステータスセルは index 2 から
    const statuses: string[] = [];
    for (let i = 2; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const text = (await cell.innerText()).trim();
      statuses.push(text);
    }
    rows.push({ roomName, statuses });
  }

  return { division, year, dates, rows };
}

export const scraper = defineScraper({
  municipality: "tokyo-edogawa",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 5, unit: "day" },
  facility: (t) => t.facilityName,
  context: (t) => ({ category: t.category }),
  outputs: (data, t) => {
    // 1テストで施設内の全部屋を取得するため、部屋ごとにファイルを分割する
    const roomNames = [...new Set(data.map((d) => d.room_name))];
    return roomNames.map((roomName) => ({
      fileName: `${t.facilityName}-${roomName}`,
      facilityName: t.facilityName,
      data: data.filter((d) => d.room_name === roomName),
    }));
  },

  async prepare(page, target) {
    await page.goto("https://www.shisetsuyoyaku.city.edogawa.tokyo.jp/user/Home");
    await page.getByRole("button", { name: target.category, exact: true }).click();
    await page.getByRole("heading", { name: "施設選択" }).waitFor();

    // 対象施設が見えるまで「さらに読み込む」（ボタンが消えたら打ち切り）
    const facilityLabel = page.locator("label").filter({
      has: page.getByText(target.facilityName, { exact: true }),
    });
    while (!(await facilityLabel.isVisible())) {
      const loadMore = page.locator('button:has-text("さらに読み込む")');
      if ((await loadMore.count()) === 0) break;
      await loadMore.click();
      await page.waitForTimeout(500);
    }

    await facilityLabel.click();
    await page.locator('button:has-text("次へ進む")').click();
    await page.getByRole("heading", { name: "施設別空き状況" }).waitFor();
    await page.locator("table thead th").first().waitFor();
    return page;
  },

  async extract(page, target, pageCount) {
    const output: EdogawaPeriod[] = [];

    for (const label of TIME_PERIOD_LABELS) {
      // フィルターセクションが閉じていれば開く
      const filterSection = page.locator("#otherCondition");
      if (!(await filterSection.isVisible())) {
        await page.locator('button:has-text("その他の条件で絞り込む")').click();
        await filterSection.waitFor({ state: "visible" });
      }
      // Bootstrap custom-radio は input が隠れているため label を直接クリックする
      await filterSection.getByText(label, { exact: true }).click();
      await page.locator('button:has-text("表示")').click();
      await page.locator("table thead th").first().waitFor();

      let coveredDays = 0;
      const periods = await collectPaginated<EdogawaPeriod>({
        maxPages: pageCount,
        label: `${target.facilityName} ${label}`,
        extractPage: async () => {
          const period = await extractPeriod(page, label);
          coveredDays += period.dates.length;
          return [period];
        },
        isDone: () => coveredDays >= pageCount,
        goNext: async () => {
          const nextButton = page.locator('button:has-text("次の期間")');
          if ((await nextButton.count()) === 0) return false;
          await nextButton.click();
          await page.locator("table thead th").first().waitFor();
          return true;
        },
      });
      output.push(...periods);
    }

    return output;
  },

  transform(extracted) {
    const slots: RawSlot[] = extracted.flatMap(({ division, year, dates, rows }) =>
      rows.flatMap(({ roomName, statuses }) =>
        dates.flatMap((dateStr, i) => {
          const date = toISODate(year, dateStr);
          if (!date) return [];
          return [{ roomName, date, division, status: statuses[i] ?? "" }];
        })
      )
    );
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
