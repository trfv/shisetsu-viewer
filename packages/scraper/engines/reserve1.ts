import type { Page } from "@playwright/test";
import { addDays, addMonths, format, startOfMonth } from "date-fns";

import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

const MONTH_VIEW_URL = "https://www.reserve1.jp/studio/member/member_select.php";
const MONTH_VIEW = "24";
export const CLOSED = "休館日";

export interface Reserve1Target {
  /** 施設 JSON の building_system_name と一致させる */
  facilityName: string;
  grand: string;
  /** 部屋名から「（定員n名）」を除いた表記 */
  roomNames: string[];
}

export interface Reserve1Config {
  office: string;
  mngfg: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
}

export interface Reserve1Month {
  /** 種別セレクトにある月（yyyyMM）。受付中の月だけが並ぶ */
  openMonths: string[];
  slots: RawSlot[];
}

function text(html: string): string {
  return html
    .replace(/<br\s*\/?>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function toDivision(header: string): string {
  return text(header).replace(/\s+/g, "").replace(/：/g, ":").replace("～", "-");
}

function toRoomName(cell: string): string {
  return text(cell)
    .replace(/[(（]定員[^)）]*[)）]$/, "")
    .trim();
}

/** 要求した月と違う月の日が混じったら投げる */
export function parseMonth(html: string, month: string): Reserve1Month {
  const openMonths = [
    ...(html.match(/<select name="Ym_select"[\s\S]*?<\/select>/)?.[0] ?? "").matchAll(
      /<option value="(\d{6})"/g
    ),
  ].map((m) => m[1] ?? "");

  const tables = [...html.matchAll(/<table[^>]*class="table_base"[^>]*>([\s\S]*?)<\/table>/g)].map(
    (m) => m[1] ?? ""
  );
  // 休館日の表は見出し行が空なので、同じ月のほかの日の見出しで区分を埋める
  let knownDivisions: string[] = [];
  const parsed = tables.map((table) => {
    const caption = table.match(/<caption[^>]*>([\s\S]*?)<\/caption>/)?.[1] ?? "";
    const date = caption.match(/(\d{4})年(\d{2})月(\d{2})日/);
    if (!date) throw new Error(`reserve1: 日付の無い表があります: ${text(caption)}`);
    if (`${date[1]}${date[2]}` !== month) {
      throw new Error(`reserve1: ${month} を要求しましたが ${date[1]}${date[2]} の日が返りました`);
    }
    const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1] ?? "");
    const [header = "", ...roomRows] = rows;
    const divisions = [
      ...header.matchAll(/<td class="item_base"[^>]*>([^<]*：[\s\S]*?)<\/td>/g),
    ].map((m) => toDivision(m[1] ?? ""));
    if (divisions.length > 0) knownDivisions = divisions;
    return {
      iso: `${date[1]}-${date[2]}-${date[3]}`,
      closed: divisions.length === 0 && text(caption).includes(CLOSED),
      divisions,
      roomRows,
    };
  });

  const slots = parsed.flatMap(({ iso, closed, divisions, roomRows }) =>
    roomRows.flatMap((row) => {
      const roomName = toRoomName(
        row.match(/<td class="item_base"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? ""
      );
      if (closed) {
        return knownDivisions.map((division) => ({
          roomName,
          date: iso,
          division,
          status: CLOSED,
        }));
      }
      const statuses = [
        ...row.matchAll(/<td class="koma[^"]*"(?:\s+colspan="(\d+)")?[^>]*>([\s\S]*?)<\/td>/g),
      ].flatMap((m) => {
        const status = m[2]?.match(/<img src="(?:[^"]*\/)?([^"/]+)"/)?.[1] ?? "";
        return Array.from({ length: Number(m[1] ?? "1") }, () => status);
      });
      if (statuses.length !== divisions.length) {
        throw new Error(
          `reserve1: ${iso} ${roomName} のコマ数 ${statuses.length} が見出し ${divisions.length} と合いません`
        );
      }
      return divisions.map((division, i) => ({
        roomName,
        date: iso,
        division,
        status: statuses[i] ?? "",
      }));
    })
  );
  return { openMonths, slots };
}

async function fetchMonth(
  page: Page,
  config: Reserve1Config,
  target: Reserve1Target,
  month: Date
): Promise<Reserve1Month> {
  const response = await page.request.post(MONTH_VIEW_URL, {
    form: {
      office: config.office,
      mngfg: config.mngfg,
      grand: target.grand,
      rdate: format(month, "yyyy-MM-dd"),
      member_select: MONTH_VIEW,
    },
  });
  if (!response.ok()) {
    throw new Error(`reserve1: 月別状況の取得が HTTP ${response.status()} で失敗しました`);
  }
  const html = new TextDecoder("euc-jp").decode(await response.body());
  return parseMonth(html, format(month, "yyyyMM"));
}

export function reserve1Hooks(config: Reserve1Config): {
  prepare: (page: Page, target: Reserve1Target) => Promise<Page>;
  extract: (page: Page, target: Reserve1Target, pageCount: number) => Promise<RawSlot[]>;
  transform: (extracted: RawSlot[], target: Reserve1Target) => TransformOutput;
} {
  return {
    async prepare(page) {
      return page;
    },

    async extract(page, target, pageCount) {
      const start = addDays(new Date(), config.startOffsetDays);
      const startIso = format(start, "yyyy-MM-dd");
      return collectPaginated({
        maxPages: pageCount,
        label: `${target.facilityName} grand=${target.grand}`,
        extractPage: async (pageIndex) => {
          const month = startOfMonth(addMonths(start, pageIndex));
          const { openMonths, slots } = await fetchMonth(page, config, target, month);
          // セレクトに無い月を要求すると、受付前なのに全コマ「空き」の表が返る
          if (!openMonths.includes(format(month, "yyyyMM"))) return null;
          const rooms = slots.filter(
            (slot) => target.roomNames.includes(slot.roomName) && slot.date >= startIso
          );
          const missing = target.roomNames.filter((n) => !slots.some((s) => s.roomName === n));
          if (slots.length > 0 && missing.length > 0) {
            throw new Error(`reserve1: 部屋が見つかりません: ${missing.join(", ")}`);
          }
          return rooms;
        },
        goNext: async () => true,
      });
    },

    transform(extracted) {
      return rawSlotsToOutput(extracted, config.divisionMap, config.statusMap);
    },
  };
}
