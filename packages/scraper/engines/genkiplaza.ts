import type { Page } from "@playwright/test";
import { addDays, format, getDaysInMonth } from "date-fns";

import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

/** サイト側の span（ヶ月）の上限 */
const MAX_SPAN = 6;

export interface GenkiplazaRawPage {
  /** 同じ見出しが入れ子要素で重複して現れる */
  headings: string[];
  tables: string[][][];
}

export interface GenkiplazaMonthTable {
  heading: string;
  rows: string[][];
}

export interface GenkiplazaTarget {
  facilityName: string;
  roomNames: readonly string[];
}

export interface GenkiplazaConfig {
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
}

export function dedupeConsecutive(values: readonly string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

export function parseHeading(heading: string): { year: number; month: number } | undefined {
  const match = heading.match(/^(\d{4})年(\d{1,2})月$/);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function parseRowLabel(label: string): { roomName: string; division: string } | undefined {
  const match = label.match(/^(.+)＜(.+)＞$/);
  if (!match) return undefined;
  return { roomName: match[1] ?? "", division: match[2] ?? "" };
}

export function zipMonthTables(raw: GenkiplazaRawPage): GenkiplazaMonthTable[] {
  const headings = dedupeConsecutive(raw.headings);
  if (headings.length !== raw.tables.length) {
    throw new Error(
      `genkiplaza: 月見出しの数 ${headings.length} とテーブルの数 ${raw.tables.length} が一致しません`
    );
  }
  return raw.tables.map((rows, index) => ({ heading: headings[index] ?? "", rows }));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function nextMonth(current: { year: number; month: number }): { year: number; month: number } {
  return current.month === 12
    ? { year: current.year + 1, month: 1 }
    : { year: current.year, month: current.month + 1 };
}

/**
 * 空欄セルは公開範囲より先の月（テーブル自体は返る）、minDate より前はサイトが月初から表示する過去日。
 * 連続した月でなければ投げる。テーブルと月の対応がずれると別の日付のデータを保存してしまう。
 */
export function buildSlots(
  tables: readonly GenkiplazaMonthTable[],
  roomNames: readonly string[],
  minDate: string
): RawSlot[] {
  const slots: RawSlot[] = [];
  let previous: { year: number; month: number } | undefined;

  for (const table of tables) {
    const parsed = parseHeading(table.heading);
    if (parsed === undefined) {
      throw new Error(`genkiplaza: 月見出しを解釈できません: "${table.heading}"`);
    }
    if (previous !== undefined) {
      const expected = nextMonth(previous);
      if (parsed.year !== expected.year || parsed.month !== expected.month) {
        throw new Error(
          `genkiplaza: テーブルが連続した月になっていません` +
            `（${previous.year}年${previous.month}月 の次が ${table.heading}）`
        );
      }
    }
    previous = parsed;

    const daysInMonth = getDaysInMonth(new Date(parsed.year, parsed.month - 1, 1));
    for (const row of table.rows) {
      const label = parseRowLabel(row[0] ?? "");
      if (label === undefined) continue;
      if (!roomNames.includes(label.roomName)) continue;

      for (let day = 1; day <= daysInMonth; day++) {
        const status = row[day] ?? "";
        if (status === "") continue;
        const date = `${parsed.year}-${pad2(parsed.month)}-${pad2(day)}`;
        if (date < minDate) continue;
        slots.push({ roomName: label.roomName, date, division: label.division, status });
      }
    }
  }
  return slots;
}

/** 未公開の月のセルは全角空白だけなので、全角空白も除いて "" にする */
async function readRawPage(page: Page): Promise<GenkiplazaRawPage> {
  return page.evaluate(() => {
    const headings: string[] = [];
    for (const element of document.querySelectorAll("*")) {
      // 入れ子要素での重複を避けて葉ノードだけを見る
      if (element.children.length > 0) continue;
      const text = (element.textContent ?? "").trim();
      if (/^\d{4}年\d{1,2}月$/.test(text)) headings.push(text);
    }
    const tables = [...document.querySelectorAll("table")].map((table) =>
      [...table.querySelectorAll("tr")].map((tr) =>
        [...tr.querySelectorAll("th,td")].map((cell) =>
          (cell.textContent ?? "").replace(/[\s　]/g, "")
        )
      )
    );
    return { headings, tables };
  });
}

export function genkiplazaHooks(config: GenkiplazaConfig): {
  prepare: (page: Page, target: GenkiplazaTarget) => Promise<Page>;
  extract: (
    page: Page,
    target: GenkiplazaTarget,
    pageCount: number
  ) => Promise<GenkiplazaMonthTable[]>;
  transform: (extracted: GenkiplazaMonthTable[], target: GenkiplazaTarget) => TransformOutput;
} {
  return {
    async prepare(page) {
      await page.goto(config.baseUrl);
      await page.locator('select[name="span"]').waitFor();
      return page;
    },

    async extract(page, _target, pageCount) {
      const span = Math.min(Math.max(pageCount, 1), MAX_SPAN);
      const start = addDays(new Date(), config.startOffsetDays);
      // yyyy の選択肢は当年のみ。年跨ぎはサーバが mm + span から解決する
      await page.selectOption('select[name="mm"]', String(start.getMonth() + 1));
      await page.selectOption('select[name="span"]', String(span));
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        page.locator('input[name="view"]').click(),
      ]);
      await page.locator("table").first().waitFor();
      return zipMonthTables(await readRawPage(page));
    },

    transform(extracted, target) {
      const minDate = format(addDays(new Date(), config.startOffsetDays), "yyyy-MM-dd");
      const slots = buildSlots(extracted, target.roomNames, minDate);
      return rawSlotsToOutput(slots, config.divisionMap, config.statusMap);
    },
  };
}
