import { getDaysInMonth } from "date-fns";

import type { RawSlot } from "../common/reservation.ts";

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
export const MAX_SPAN = 6;

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
