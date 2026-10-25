import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

// cal.do は館・区分・日付を POST すれば、その日の区分内の全部屋を返す（セッション不要）。
// 区分の受付期間より先は部屋の行が無くなる。

const CALENDAR_PATH = "cal.do";
// 空き（塗りなし）のコマは id が空なので、STATUS_MAP の INVALID（""）と分けるために置き換える
export const VACANT_ID = "none";

export interface AservTarget {
  /** 施設 JSON の building_system_name と一致させる */
  facilityName: string;
  kanCode: string;
  skubunCode: string;
  roomNames: string[];
}

export interface AservConfig {
  /** 末尾スラッシュ必須（new URL で相対解決するため） */
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
  outOfPeriodStatus: string;
}

export interface AservRoom {
  roomName: string;
  cells: { division: string; status: string }[];
}

// コマ見出しは「午前<br />9:00-12:00」。時間貸しの区分は見出しが時刻の目盛り（8, 9, …, 23）だけになる
function parseSlots(header: string): string[] {
  const labeled = [
    ...header.matchAll(/<div class="h_time_col_\d+">[^<]*<br\s*\/?>([^<]*)<\/div>/g),
  ];
  if (labeled.length > 0) return labeled.map((m) => (m[1] ?? "").trim());
  const hours = [...header.matchAll(/<div class="h_time(?:_col)?">(\d+)<\/div>/g)].map((m) =>
    Number(m[1])
  );
  return hours.slice(0, -1).map((hour, i) => `${hour}:00-${hours[i + 1]}:00`);
}

/** 要求した日と違う日のコマが混じったら投げる */
export function parseCalendar(html: string, day: string): AservRoom[] {
  const [head = "", ...rows] = html.split('<div class="clearfix calList">');
  if (rows.length === 0) return [];
  const slots = parseSlots(head.slice(head.indexOf('<div class="clearfix h_calList">')));
  return rows.map((row) => {
    const roomName = row.match(/<div class="shisetsuNameJ?">([^<]*)<\/div>/)?.[1]?.trim() ?? "";
    // 属性の並びが区分によって title→class→id だったり class→title→id だったりする
    const cells = [...row.matchAll(/<div\b[^>]*\btitle="\d+:(\d{8}):(\d+)"[^>]*>/g)].map((m) => {
      if (m[1] !== day)
        throw new Error(`aserv: ${day} を要求しましたが ${m[1]} のコマが返りました`);
      const division = slots[Number(m[2])];
      if (division === undefined) {
        throw new Error(`aserv: ${roomName} のコマ番号 ${m[2]} に見出しがありません`);
      }
      const id = m[0].match(/\bid="([^"]*)"/)?.[1] ?? "";
      return { division, status: id === "" ? VACANT_ID : id };
    });
    return { roomName, cells };
  });
}

async function fetchDay(
  page: Page,
  config: AservConfig,
  target: AservTarget,
  date: Date
): Promise<AservRoom[]> {
  const response = await page.request.post(new URL(CALENDAR_PATH, config.baseUrl).href, {
    form: {
      mokutekiCode: "-1",
      kanCode: target.kanCode,
      skubunCode: target.skubunCode,
      shisetsuCode: "-1",
      selectDate: format(date, "yyyy/MM/dd"),
    },
  });
  if (!response.ok()) {
    throw new Error(`aserv: 空き状況の取得が HTTP ${response.status()} で失敗しました`);
  }
  return parseCalendar(await response.text(), format(date, "yyyyMMdd"));
}

export function aservHooks(config: AservConfig): {
  prepare: (page: Page, target: AservTarget) => Promise<Page>;
  extract: (page: Page, target: AservTarget, pageCount: number) => Promise<RawSlot[]>;
  transform: (extracted: RawSlot[], target: AservTarget) => TransformOutput;
} {
  return {
    async prepare(page) {
      return page;
    },

    async extract(page, target, pageCount) {
      const start = addDays(new Date(), config.startOffsetDays);
      return collectPaginated({
        maxPages: pageCount,
        label: `${target.facilityName} ${target.roomNames.join("・")}`,
        extractPage: async (pageIndex) => {
          const date = addDays(start, pageIndex);
          const rooms = (await fetchDay(page, config, target, date)).filter((room) =>
            target.roomNames.includes(room.roomName)
          );
          if (rooms.length === 0) return null;
          const missing = target.roomNames.filter((n) => !rooms.some((r) => r.roomName === n));
          if (missing.length > 0) {
            throw new Error(`aserv: 部屋が見つかりません: ${missing.join(", ")}`);
          }
          // 区分内の別の部屋（ホール）の受付が長いと行は続くので、対象の部屋が全コマ受付期間外の日で打ち切る
          const cells = rooms.flatMap((room) => room.cells);
          if (pageIndex > 0 && cells.every((cell) => cell.status === config.outOfPeriodStatus)) {
            return null;
          }
          const iso = format(date, "yyyy-MM-dd");
          return rooms.flatMap((room) =>
            room.cells.map((cell) => ({ roomName: room.roomName, date: iso, ...cell }))
          );
        },
        // 日付を指定して取り直すので、画面上のページ送りは無い
        goNext: async () => true,
      });
    },

    transform(extracted) {
      return rawSlotsToOutput(extracted, config.divisionMap, config.statusMap);
    },
  };
}
