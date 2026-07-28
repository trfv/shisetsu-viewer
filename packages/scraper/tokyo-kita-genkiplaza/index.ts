import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { genkiplazaHooks, type GenkiplazaTarget } from "../engines/genkiplaza.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "◎": "RESERVATION_STATUS_VACANT",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
};

const START_OFFSET_DAYS = 1;

const targets: GenkiplazaTarget[] = [
  {
    facilityName: "北区立元気ぷらざ",
    // 和室 4 室（第一・第二・第三・第五）もサイトに出るが、施設マスタに未登録のため取り込まない
    roomNames: ["第一ホール", "第二ホール"],
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-kita-genkiplaza",
  targets,
  // サイトの公開範囲は抽選開始（3ヵ月前月初）に合わせて約 3 ヶ月先まで。
  // それ以遠のテーブルは返るが全セルが空欄で、engine 側が捨てる
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 3, unit: "month" },
  facility: (t) => t.facilityName,
  context: (t) => ({ roomNames: t.roomNames }),
  ...genkiplazaHooks({
    baseUrl: "https://genkiplaza.tokyo.jp/yoyaku/user.cgi",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
  }),
});
