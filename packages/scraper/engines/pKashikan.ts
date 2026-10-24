import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

// コマの時刻はセルに書かれず、空き（○）セルの onmousedown 引数にだけ埋め込まれる。
// そのため区分は「何コマ目か」で決め、部屋ごとのコマ表を target で静的に宣言する。

/** サイト固定 */
const DAYS_PER_PAGE = 40;

interface PKashikanRawRow {
  label: string;
  /** time は ○ セルにだけ入る（他は ""） */
  cells: { text: string; time: string }[];
}

export interface PKashikanRawPage {
  heading: string;
  rows: PKashikanRawRow[];
}

export interface PKashikanTarget {
  facilityName: string;
  roomName: string;
  /** 表示順。○ セルの時刻と食い違えば構造変化として投げる */
  komas: readonly string[];
}

export interface PKashikanConfig {
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
  /** コマ間の空白セルの幅。サイトごとに違う */
  spacerWidth: string;
  /** 複数館のサイトは室場の前に会館一覧から target.facilityName を選ぶ */
  selectBuilding: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 「2026(令和 8)年11月20日 (金)～  音楽スタジオ2 (8人)」形式 */
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

/** 食い違いは全て投げる。区分や日付がずれたまま保存しないため */
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

      // 休館・保守の日は 1 セルが行全体を覆う
      const wholeDay = row.cells.length === 1 && target.komas.length > 1 ? row.cells[0] : undefined;
      if (wholeDay !== undefined) {
        for (const division of target.komas) {
          slots.push({ roomName: target.roomName, date, division, status: wholeDay.text });
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

async function readRawPage(page: Page, spacerWidth: string): Promise<PKashikanRawPage> {
  return page.evaluate((spacer) => {
    const heading =
      [...document.querySelectorAll("h3")]
        .map((h3) => h3.textContent ?? "")
        .find((text) => text.includes("～")) ?? "";
    const rows = [...document.querySelectorAll("table.koma-table")]
      .map((table) => [...table.querySelectorAll("td")])
      // 時刻ヘッダーだけの表（th のみ）を除く
      .filter((tds) => tds.length > 0)
      .map((tds) => ({
        label: (tds[0]?.textContent ?? "").replace(/\s+/g, " ").trim(),
        cells: tds
          .slice(1)
          // 幅だけで判定しない。足立区は 30 分コマ（21:00-21:30）も空白セルと同じ幅
          .filter(
            (td) =>
              !(
                td.style.width === spacer &&
                (td.textContent ?? "").trim() === "" &&
                !td.hasAttribute("onmousedown")
              )
          )
          .map((td) => ({
            text: (td.textContent ?? "").trim(),
            time: (td.getAttribute("onmousedown") ?? "").match(/'(\d{8})'/)?.[1] ?? "",
          })),
      }));
    return { heading, rows };
  }, spacerWidth);
}

/** 最終ページの末尾は horizon を越えうるので範囲を持たせる */
export interface PKashikanExtractedPage extends PKashikanRawPage {
  minDate: string;
  maxDate: string;
}

async function showFrom(page: Page, date: Date): Promise<void> {
  const value = format(date, "yyyyMMdd");
  await Promise.all([
    page.waitForNavigation(),
    page.evaluate((v) => {
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
      if (config.selectBuilding) {
        await Promise.all([
          page.waitForNavigation(),
          page.getByText(target.facilityName, { exact: true }).click(),
        ]);
      }
      await Promise.all([
        page.waitForNavigation(),
        page.getByText(target.roomName, { exact: true }).click(),
      ]);
      return page;
    },

    // pageCount は horizon（unit: "day"）由来の日数
    async extract(page, _target, pageCount) {
      const start = addDays(new Date(), config.startOffsetDays);
      const minDate = format(start, "yyyy-MM-dd");
      const maxDate = format(addDays(start, pageCount - 1), "yyyy-MM-dd");
      return collectPaginated({
        maxPages: Math.ceil(pageCount / DAYS_PER_PAGE),
        label: "p-kashikan",
        extractPage: async (index) => {
          if (index === 0) await showFrom(page, start);
          return [{ ...(await readRawPage(page, config.spacerWidth)), minDate, maxDate }];
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
