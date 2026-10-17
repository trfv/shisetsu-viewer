import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { type DiscoveredTarget, isMusicLikely } from "../common/discover.ts";
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
  if (!match?.[1] || !match[2]) return [];
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const firstDay = parseInt(dateCells[0] || "");
  if (isNaN(firstDay)) return [];
  const startDate = new Date(year, month - 1, firstDay);
  return dateCells.map((_, i) => format(addDays(startDate, i), "yyyy-MM-dd"));
}

/**
 * 全区分のパスで取れた日付だけを残す。
 * 区分ごとに別々にページ送りするため、1 区分だけ途中で切れる（collectPaginated が途中までを返す）と、
 * 切れた先の日付が「その区分なし」で出力される。api の upsert は reservation を丸ごと置き換えるので、
 * 前回の正しい値まで消える。切れた先の日付は出さずに D1 の前回値を残す。
 * 日付はカレンダーの見出しから取る（部屋行が 0 件のパスでも日付は取れているので、slots からは引かない）。
 */
export function keepDatesCoveredByAllDivisions(
  slots: readonly RawSlot[],
  tables: readonly WebrGrandTable[],
  divisions: readonly string[]
): RawSlot[] {
  const datesByDivision = new Map<string, Set<string>>(divisions.map((d) => [d, new Set()]));
  for (const { division, header } of tables) {
    for (const date of buildISODateStrings(header[0] ?? "", header.slice(2))) {
      datesByDivision.get(division)?.add(date);
    }
  }
  const sets = [...datesByDivision.values()];
  const kept: RawSlot[] = [];
  const dropped = new Set<string>();
  for (const slot of slots) {
    if (sets.every((dates) => dates.has(slot.date))) kept.push(slot);
    else dropped.add(slot.date);
  }
  if (dropped.size > 0) {
    const coverage = divisions.map((d) => `${d}=${datesByDivision.get(d)?.size ?? 0}`).join(", ");
    console.warn(
      `Dropped ${dropped.size} dates not covered by every division pass (${coverage}); ` +
        "D1 keeps the previous values for them."
    );
  }
  return kept;
}

async function extractTables(page: Page, division: string): Promise<WebrGrandTable[]> {
  const tables = await page.locator("table").all();
  const output: WebrGrandTable[] = [];

  for (const table of tables) {
    await table.waitFor();
    const lines = await table.locator("tr").all();
    const headerRow = lines[0];
    if (lines.length < 2 || !headerRow) continue;

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

/** トップページのカテゴリボタン以外（列挙対象から除外） */
const NAV_BUTTON_RE = /ログイン|検索|メニュー|閉じる|次へ|戻る|もどる|表示|絞り込む/;

/**
 * トップページのカテゴリボタン → 施設一覧（「さらに読み込む」全展開）を走査して
 * targets 候補を列挙する。WebR Grand の targets は施設単位（部屋はテーブル行として
 * 抽出時に取れる）なので、部屋の列挙は行わない。
 */
export async function discoverWebrGrandTargets(
  page: Page,
  opts: Pick<WebrGrandConfig, "baseUrl">
): Promise<DiscoveredTarget[]> {
  const MAX_LOAD_MORE = 50;

  await page.goto(opts.baseUrl);
  const buttonTexts = await page.getByRole("button").allInnerTexts();
  const categories = buttonTexts
    .map((t) => t.trim())
    .filter((t) => t !== "" && !NAV_BUTTON_RE.test(t));

  const targets: DiscoveredTarget[] = [];
  for (const category of categories) {
    await page.goto(opts.baseUrl);
    await page.getByRole("button", { name: category }).click();
    await page.locator("table").first().waitFor();

    for (let i = 0; i < MAX_LOAD_MORE; i++) {
      const loadMore = page.getByRole("link", { name: "さらに読み込む" });
      if ((await loadMore.count()) === 0) break;
      await loadMore.click();
      await page.waitForTimeout(1000);
    }

    const rows = await page.locator("table tr").all();
    for (const row of rows) {
      const firstCell = row.locator("th,td").first();
      if ((await firstCell.count()) === 0) continue;
      const facilityName = (await firstCell.innerText()).trim().split("\n")[0]?.trim() ?? "";
      if (facilityName === "") continue;
      targets.push({
        facilityName,
        category,
        musicLikely: isMusicLikely(facilityName),
        target: { facilityName },
      });
    }
  }
  return targets;
}

export function webrGrandHooks(config: WebrGrandConfig): {
  prepare: (page: Page, target: WebrGrandTarget) => Promise<Page>;
  extract: (page: Page, target: WebrGrandTarget, pageCount: number) => Promise<WebrGrandTable[]>;
  transform: (extracted: WebrGrandTable[], target: WebrGrandTarget) => TransformOutput;
  discover: (page: Page) => Promise<DiscoveredTarget[]>;
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
        const dates = buildISODateStrings(header[0] ?? "", header.slice(2));
        return dates.flatMap((date, i) =>
          rows.map((row) => ({
            roomName: (row[0] || "").trim().split(" ")[0] || "",
            date,
            division,
            status: (row[i + 2] || "").trim(),
          }))
        );
      });
      return rawSlotsToOutput(
        keepDatesCoveredByAllDivisions(slots, extracted, divisions),
        config.divisionMap,
        config.statusMap
      );
    },

    discover(page) {
      return discoverWebrGrandTargets(page, config);
    },
  };
}
