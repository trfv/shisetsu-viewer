import type { Page } from "@playwright/test";
import { stripTrailingEmptyValue } from "../common/arrayUtils.ts";
import { toISODateString } from "../common/dateUtils.ts";
import { collectPaginated } from "../common/paginate.ts";
import { getCellValue } from "../common/playwrightUtils.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

/**
 * OpenReaf (openreaf02.jp) 系予約システム用エンジン。
 * 採用自治体: tokyo-kita, tokyo-chuo
 *
 * ナビゲーション: 空き状況の確認 → 施設で確認 → リンクチェーン → カレンダー → 日次テーブル
 * ページ送り: a.day-next
 */
export interface OpenreafConfig {
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /**
   * links 末尾（室場リンク）の照合方法。
   * サイトが「（定員90名）」等のサフィックスを付ける自治体は "prefix" にする。
   */
  roomLinkMatch?: "exact" | "prefix";
}

export interface OpenreafTarget {
  facilityName: string;
  roomName: string;
  /** 施設分類 → 施設 → （次の一覧...） → 室場 のリンクテキスト列 */
  links: string[];
}

type OpenreafDay = { date: string; header: string[]; row: string[] };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function extractDay(page: Page): Promise<OpenreafDay> {
  const caption = page.locator('//*[@id="right"]/form/table[1]');
  await caption.waitFor();
  const date = await caption.locator("th").innerText();
  const table = page.locator('//*[@id="right"]/form/table[2]');
  await table.waitFor();
  const lines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("th,td").all())
  );

  // 時間区分が多い部屋はテーブルが「ヘッダー行 + データ行」の複数バンクに折り返される
  const header: string[] = [];
  const row: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const h = stripTrailingEmptyValue(
      (await Promise.all((lines[i] || []).map((l) => l.innerText()))).map((v) => v.trim())
    );
    const r = stripTrailingEmptyValue(
      (await Promise.all((lines[i + 1] || []).map((l) => getCellValue(l)))).map((v) => v.trim())
    );
    header.push(...h);
    row.push(...r);
  }
  return { date, header, row };
}

export function openreafHooks(config: OpenreafConfig): {
  prepare: (page: Page, target: OpenreafTarget) => Promise<Page>;
  extract: (page: Page, target: OpenreafTarget, pageCount: number) => Promise<OpenreafDay[]>;
  transform: (extracted: OpenreafDay[], target: OpenreafTarget) => TransformOutput;
} {
  return {
    async prepare(page, target) {
      await page.goto(config.baseUrl);
      await page.getByRole("link", { name: "空き状況の確認" }).click();
      await page.getByRole("link", { name: "施設で確認" }).click();
      for (const [index, link] of target.links.entries()) {
        // 末尾要素は室場リンク。roomLinkMatch: "prefix" のサイトは定員サフィックス
        // （例「（定員90名）」）が付与されるため前方一致で照合する。
        const isRoom = index === target.links.length - 1;
        const usePrefix = isRoom && config.roomLinkMatch === "prefix";
        const name = usePrefix ? new RegExp("^" + escapeRegExp(link)) : link;
        await page.getByRole("link", { name, exact: !usePrefix }).click();
      }
      while ((await page.locator("table.calendar a").count()) === 0) {
        await page.locator("a.day-next").click();
      }
      await page.locator("table.calendar a").nth(0).click();
      return page;
    },

    async extract(page, target, pageCount) {
      return collectPaginated({
        maxPages: pageCount,
        label: `${target.facilityName} ${target.roomName}`,
        extractPage: async () => [await extractDay(page)],
        goNext: async () => {
          const nextLink = page.locator("a.day-next");
          if ((await nextLink.count()) === 0) return false;
          await nextLink.click();
          return true;
        },
      });
    },

    transform(extracted, target) {
      const slots: RawSlot[] = extracted.flatMap(({ date, header, row }) =>
        row.map((status, index) => ({
          roomName: target.roomName,
          date: toISODateString(date),
          division: header[index] ?? "",
          status,
        }))
      );
      return rawSlotsToOutput(slots, config.divisionMap, config.statusMap);
    },
  };
}
