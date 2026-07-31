import type { Page } from "@playwright/test";
import { addDays, format, getDaysInMonth } from "date-fns";

import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

/**
 * 元気ぷらざ独自 CGI（genkiplaza.tokyo.jp/yoyaku/user.cgi）用エンジン。
 * 採用自治体: tokyo-kita-genkiplaza
 *
 * ナビゲーション: user.cgi 単一ページ。yyyy / mm / span を POST すると
 * span ヶ月ぶんの月別テーブルが 1 ページに並ぶ（ページ送りは無い）。
 * 各テーブルは 行 = `<部屋名>＜<区分>＞`、列 = 1〜31 日の固定 31 列。
 * サイトの公開範囲より先の月は、テーブル自体は返るが全セルが空欄になる。
 */

/** サイト側の span（ヶ月）の上限 */
const MAX_SPAN = 6;

/** extract が DOM から読み取った生の内容 */
export interface GenkiplazaRawPage {
  /** ページ内に現れた「YYYY年M月」の全出現（入れ子要素による重複を含む、文書順） */
  headings: string[];
  /** テーブルごとの行。各行は [先頭セル, 1日, 2日, ...] */
  tables: string[][][];
}

/** 見出しと対応づけた 1 ヶ月分のテーブル */
export interface GenkiplazaMonthTable {
  heading: string;
  rows: string[][];
}

export interface GenkiplazaTarget {
  facilityName: string;
  /** 取り込む部屋名（サイト表記）。ここに無い行は捨てる */
  roomNames: readonly string[];
}

export interface GenkiplazaConfig {
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /**
   * 取得開始日のオフセット（日）。scraper 側 `horizon.startOffsetDays` と揃える。
   * サイトが常に月初から表示するため、これより前の日付を捨てるのに使う。
   */
  startOffsetDays: number;
}

/** 連続する重複を 1 つにまとめる（同じ見出しが入れ子要素で複数回現れるため） */
export function dedupeConsecutive(values: readonly string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

/** 「2026年7月」形式の見出しから年月を取り出す */
export function parseHeading(heading: string): { year: number; month: number } | undefined {
  const match = heading.match(/^(\d{4})年(\d{1,2})月$/);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** 「第一ホール＜午前＞」形式の行ラベルを部屋名と区分に分解する */
export function parseRowLabel(label: string): { roomName: string; division: string } | undefined {
  const match = label.match(/^(.+)＜(.+)＞$/);
  if (!match) return undefined;
  return { roomName: match[1] ?? "", division: match[2] ?? "" };
}

/**
 * 見出しの列とテーブルの列を文書順で対応づける。
 * 数が食い違う場合はサイト構造が変わったとみなして投げる。
 */
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
 * 月別テーブルの列から RawSlot を組み立てる。
 * 以下は RawSlot にしない:
 * - 空欄のセル（サイトが公開していない先の月）
 * - 実在しない日付（30 日以下の月の 31 列目）
 * - roomNames に含まれない部屋の行、および区分括弧を持たない行（日付ヘッダー等）
 * - minDate より前の日付（サイトは常に月初から表示するため過去日が混ざる）
 *
 * 見出しが読めない、またはテーブルが連続した月になっていない場合は投げる
 * （テーブルと月の対応がずれると、全く別の日付のデータを保存してしまうため）。
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

/**
 * ページ内の全テーブルと、全ての「YYYY年M月」テキストを文書順で読み取る。
 * セルの空白（半角・全角・改行）は全て除去する。全角空白のみのセルは "" になり、
 * 未公開の月として buildSlots が捨てる。
 */
async function readRawPage(page: Page): Promise<GenkiplazaRawPage> {
  return page.evaluate(() => {
    const headings: string[] = [];
    for (const element of document.querySelectorAll("*")) {
      // 同じ見出しが入れ子要素で重複して現れるため、葉ノードだけを見る
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
      // user.cgi 自体が空き状況テーブルのページ（既定は当月・1 ヶ月）
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
