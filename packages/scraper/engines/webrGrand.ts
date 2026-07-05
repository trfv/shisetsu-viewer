import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

/**
 * WebR Grand 系予約システム用エンジン。
 * 採用自治体: tokyo-meguro, tokyo-toshima
 *
 * ナビゲーション: カテゴリボタン → 施設一覧（さらに読み込む） → 次へ進む → 2週間カレンダー
 * 時間帯フィルター（午前/午後/夜間）を切り替えながら期間を prev/next でページ送りする。
 */
export interface WebrGrandConfig {
  baseUrl: string;
  /** 施設名 → トップページのカテゴリボタン名 */
  categoryMap: Readonly<Record<string, string>>;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** 施設一覧セルの照合を exact にするか（部分一致で複数ヒットするサイトは true） */
  facilityCellExact?: boolean;
}

export interface WebrGrandTarget {
  facilityName: string;
}

type WebrGrandTable = { division: string; header: string[]; rows: string[][] };

/** ヘッダー "2026年3月" と日セル列から ISO 日付列を組み立てる */
function buildISODateStrings(monthHeader: string, dateCells: string[]): string[] {
  const match = monthHeader.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return [];
  const year = parseInt(match[1] as string);
  const month = parseInt(match[2] as string);
  const firstDay = parseInt(dateCells[0] || "");
  if (isNaN(firstDay)) return [];
  const startDate = new Date(year, month - 1, firstDay);
  return dateCells.map((_, i) => format(addDays(startDate, i), "yyyy-MM-dd"));
}

async function extractTables(page: Page, division: string): Promise<WebrGrandTable[]> {
  const tables = await page.locator("table").all();
  const output: WebrGrandTable[] = [];

  for (const table of tables) {
    await table.waitFor();
    const lines = await table.locator("tr").all();
    if (lines.length < 2) continue;

    const headerRow = lines[0] as NonNullable<(typeof lines)[0]>;
    const header = await Promise.all(
      (await headerRow.locator("th").all()).map((th) => th.innerText())
    );
    // 予約カレンダー以外のテーブルはスキップ
    if (!header.some((h) => /\d{4}年\d{1,2}月/.test(h))) continue;

    const rows = await Promise.all(
      lines.slice(1).map(async (line) => {
        const cells = await line.locator("th,td").all();
        return Promise.all(cells.map((c) => c.innerText()));
      })
    );
    // 月表示テキストが部屋名として現れる繰り返しヘッダー行を除外
    const dataRows = rows.filter((row) => !/\d{4}年\d{1,2}月/.test(row[0] || ""));

    output.push({ division, header, rows: dataRows });
  }

  return output;
}

export function webrGrandHooks(config: WebrGrandConfig): {
  prepare: (page: Page, target: WebrGrandTarget) => Promise<Page>;
  extract: (page: Page, target: WebrGrandTarget, pageCount: number) => Promise<WebrGrandTable[]>;
  transform: (extracted: WebrGrandTable[], target: WebrGrandTarget) => TransformOutput;
} {
  const divisions = Object.keys(config.divisionMap).filter(Boolean);

  return {
    async prepare(page, target) {
      const category = config.categoryMap[target.facilityName];
      if (!category) throw new Error(`Unknown facility: ${target.facilityName}`);

      await page.goto(config.baseUrl);
      await page.getByRole("button", { name: category }).click();
      await page.locator("table").first().waitFor();

      // 対象施設が現れるまで「さらに読み込む」
      const facilityCell = page.getByRole("cell", {
        name: target.facilityName,
        ...(config.facilityCellExact && { exact: true }),
      });
      while ((await facilityCell.count()) === 0) {
        const loadMore = page.getByRole("link", { name: "さらに読み込む" });
        if ((await loadMore.count()) === 0) {
          throw new Error(`Facility not found in category "${category}": ${target.facilityName}`);
        }
        await loadMore.click();
        await page.waitForTimeout(1000);
      }

      await facilityCell.locator("label").click();
      await page.getByRole("link", { name: "次へ進む" }).click();
      await page.locator("table").first().waitFor();
      return page;
    },

    async extract(page, target, pageCount) {
      const startDateString = format(new Date(), "yyyy/M/d");
      const output: WebrGrandTable[] = [];

      for (const division of divisions) {
        // 表示開始日を設定して datepicker を閉じる
        const dateInput = page.getByRole("textbox", { name: "表示開始日" });
        await dateInput.fill(startDateString);
        await page.keyboard.press("Escape");

        // フィルターパネルを開いて時間帯を選択
        await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
        await page.getByText(division, { exact: true }).click();
        await page.getByRole("button", { name: "表示" }).click();
        await page.locator("table").first().waitFor();

        const tables = await collectPaginated({
          maxPages: pageCount,
          label: `${target.facilityName} ${division}`,
          extractPage: () => extractTables(page, division),
          goNext: async () => {
            const nextLink = page
              .locator("a[href=\"javascript:__doPostBack('period','next')\"]")
              .first();
            if ((await nextLink.count()) === 0) return false;
            await nextLink.click();
            await page.waitForLoadState("domcontentloaded");
            await page.locator("table").first().waitFor();
            return true;
          },
        });
        output.push(...tables);
      }

      return output;
    },

    transform(extracted) {
      // header[0] = "2026年3月"（ナビ矢印含む）、header[1] = "定員"、header[2:] = "12\n木", ...
      const slots: RawSlot[] = extracted.flatMap(({ division, header, rows }) => {
        const dates = buildISODateStrings(header[0] as string, header.slice(2));
        return dates.flatMap((date, i) =>
          rows.map((row) => ({
            roomName: ((row[0] || "").trim().split(" ")[0] as string) || "",
            date,
            division,
            status: (row[i + 2] || "").trim(),
          }))
        );
      });
      return rawSlotsToOutput(slots, config.divisionMap, config.statusMap);
    },
  };
}
