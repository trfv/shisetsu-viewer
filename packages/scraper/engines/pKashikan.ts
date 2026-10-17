import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

/**
 * 貸館予約システム（k5.p-kashikan.jp）用エンジン。
 * 採用自治体: tokyo-kita-cocokita
 *
 * ナビゲーション: トップ →「期間 の空きを見る」→ 室場名 で、1 室 × 40 日分の表が出る。
 * 日付送りは `setNaviDate('YYYYMMDD')`（forma の UseDate を書き換えて POST）で、
 * 指定日を先頭にした 40 日分が返る。
 * 表は 1 行 = 1 日の `table.koma-table`。先頭セルが「11/24 (火)」、以降がコマのセル
 * （コマの間に幅 15px の空白セルが挟まる）。休館日はコマを跨ぐ 1 セル「休館」になる。
 *
 * コマの時刻はセルに書かれていない。空き（○）セルの onmousedown 引数にだけ
 * 「09001145」形式で埋め込まれるため、区分は「何コマ目か」で決める。
 * 部屋ごとのコマ表は target で静的に宣言し、○ セルの時刻と食い違えば構造変化として投げる。
 */

/** 1 ページに表示される日数（サイト固定） */
const DAYS_PER_PAGE = 40;

/** extract が DOM から読み取った 1 行（= 1 日） */
export interface PKashikanRawRow {
  /** 先頭セル（「11/24 (火)」） */
  label: string;
  /** コマのセル。time は ○ セルにだけ入る「09001145」形式（他は ""） */
  cells: { text: string; time: string }[];
}

/** extract が DOM から読み取った 1 ページ（= 40 日） */
export interface PKashikanRawPage {
  /** 「2026(令和 8)年11月20日 (金)～  音楽スタジオ2 (8人)」 */
  heading: string;
  rows: PKashikanRawRow[];
}

export interface PKashikanTarget {
  facilityName: string;
  /** 室場名（サイト表記。定員の括弧は含まない） */
  roomName: string;
  /** コマの時刻（「9:00-11:45」形式、表示順）。DIVISION_MAP のキーになる */
  komas: readonly string[];
}

export interface PKashikanConfig {
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** 取得開始日のオフセット（日）。scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 「2026(令和 8)年11月20日 (金)～  音楽スタジオ2 (8人)」から先頭日（ISO）と室場名を取り出す */
export function parseHeading(heading: string): { startDate: string; roomName: string } | undefined {
  const match = heading
    .replace(/\s+/g, " ")
    .match(/(\d{4})\([^)]*\)年\s*(\d{1,2})月\s*(\d{1,2})日.*?～\s*(.+?)\s*\(\d+人\)/);
  if (!match) return undefined;
  return {
    startDate: `${match[1]}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`,
    roomName: match[4] ?? "",
  };
}

/** 「09001145」を「9:00-11:45」にする */
export function formatKomaTime(raw: string): string | undefined {
  const match = raw.match(/^(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return undefined;
  return `${Number(match[1])}:${match[2]}-${Number(match[3])}:${match[4]}`;
}

function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * 40 日表の各行から RawSlot を組み立てる。
 * [minDate, maxDate] の外の日付は捨てる。
 *
 * 次の場合はサイト構造が変わったとみなして投げる（区分や日付がずれたまま保存しないため）:
 * - 見出しが読めない、または室場名が target と違う
 * - 行の「M/D」が見出しの先頭日からの連番と一致しない
 * - コマ数が target.komas と違う（休館の 1 セル行を除く）
 * - ○ セルに埋め込まれた時刻が target.komas の同じ位置と違う
 */
export function buildSlots(
  pages: readonly PKashikanRawPage[],
  target: PKashikanTarget,
  minDate: string,
  maxDate: string
): RawSlot[] {
  const slots: RawSlot[] = [];
  for (const page of pages) {
    const parsed = parseHeading(page.heading);
    if (parsed === undefined) {
      throw new Error(`p-kashikan: 見出しを解釈できません: "${page.heading}"`);
    }
    if (parsed.roomName !== target.roomName) {
      throw new Error(
        `p-kashikan: 表示中の室場「${parsed.roomName}」が対象「${target.roomName}」と違います`
      );
    }

    page.rows.forEach((row, index) => {
      const date = addDaysIso(parsed.startDate, index);
      const [, month, day] = date.split("-").map(Number);
      if (!row.label.startsWith(`${month}/${day} `)) {
        throw new Error(`p-kashikan: ${date} の行の日付表示が「${row.label}」です`);
      }
      if (date < minDate || date > maxDate) return;

      if (row.cells.length === 1 && row.cells[0]?.text === "休館") {
        for (const division of target.komas) {
          slots.push({ roomName: target.roomName, date, division, status: "休館" });
        }
        return;
      }
      if (row.cells.length !== target.komas.length) {
        throw new Error(
          `p-kashikan: ${target.roomName} ${date} のコマ数が ${row.cells.length} です` +
            `（想定 ${target.komas.length}）`
        );
      }
      row.cells.forEach((cell, komaIndex) => {
        const division = target.komas[komaIndex] ?? "";
        if (cell.time !== "" && formatKomaTime(cell.time) !== division) {
          throw new Error(
            `p-kashikan: ${target.roomName} ${date} の ${komaIndex + 1} コマ目の時刻が` +
              ` ${cell.time} です（想定 ${division}）`
          );
        }
        slots.push({ roomName: target.roomName, date, division, status: cell.text });
      });
    });
  }
  return slots;
}

async function readRawPage(page: Page): Promise<PKashikanRawPage> {
  return page.evaluate(() => {
    const heading =
      [...document.querySelectorAll("h3")]
        .map((h3) => h3.textContent ?? "")
        .find((text) => text.includes("～")) ?? "";
    const rows = [...document.querySelectorAll("table.koma-table")]
      .map((table) => [...table.querySelectorAll("td")])
      // 時刻ヘッダー（th のみ）の表を除く
      .filter((tds) => tds.length > 0)
      .map((tds) => ({
        label: (tds[0]?.textContent ?? "").replace(/\s+/g, " ").trim(),
        cells: tds
          .slice(1)
          // コマ間の空白セル
          .filter((td) => td.style.width !== "15px")
          .map((td) => ({
            text: (td.textContent ?? "").trim(),
            time: (td.getAttribute("onmousedown") ?? "").match(/'(\d{8})'/)?.[1] ?? "",
          })),
      }));
    return { heading, rows };
  });
}

/** extract の出力 1 ページ分。horizon の範囲を持たせる（最終ページの末尾は horizon を越えうる） */
export interface PKashikanExtractedPage extends PKashikanRawPage {
  minDate: string;
  maxDate: string;
}

/** 先頭日を指定して 40 日表を再表示する */
async function showFrom(page: Page, date: Date): Promise<void> {
  const value = format(date, "yyyyMMdd");
  await Promise.all([
    page.waitForNavigation(),
    page.evaluate((v) => {
      // サイトのグローバル関数（forma.UseDate を書き換えて submit する）
      (window as unknown as { setNaviDate: (value: string) => void }).setNaviDate(v);
    }, value),
  ]);
  await page.locator("table.koma-table").first().waitFor();
}

export function pKashikanHooks(config: PKashikanConfig): {
  prepare: (page: Page, target: PKashikanTarget) => Promise<Page>;
  extract: (
    page: Page,
    target: PKashikanTarget,
    pageCount: number
  ) => Promise<PKashikanExtractedPage[]>;
  transform: (extracted: PKashikanExtractedPage[], target: PKashikanTarget) => TransformOutput;
} {
  return {
    async prepare(page, target) {
      await page.goto(config.baseUrl);
      await Promise.all([page.waitForNavigation(), page.getByText("期間 の空きを見る").click()]);
      await Promise.all([
        page.waitForNavigation(),
        page.getByText(target.roomName, { exact: true }).click(),
      ]);
      return page;
    },

    // pageCount は horizon（unit: "day"）由来の日数。40 日ずつ表を送る
    async extract(page, _target, pageCount) {
      const start = addDays(new Date(), config.startOffsetDays);
      const minDate = format(start, "yyyy-MM-dd");
      const maxDate = format(addDays(start, pageCount - 1), "yyyy-MM-dd");
      return collectPaginated({
        maxPages: Math.ceil(pageCount / DAYS_PER_PAGE),
        label: "p-kashikan",
        extractPage: async (index) => {
          if (index === 0) await showFrom(page, start);
          return [{ ...(await readRawPage(page)), minDate, maxDate }];
        },
        goNext: async (index) => {
          await showFrom(page, addDays(start, (index + 1) * DAYS_PER_PAGE));
          return true;
        },
      });
    },

    transform(extracted, target) {
      const slots = extracted.flatMap((page) =>
        buildSlots([page], target, page.minDate, page.maxDate)
      );
      return rawSlotsToOutput(slots, config.divisionMap, config.statusMap);
    },
  };
}
