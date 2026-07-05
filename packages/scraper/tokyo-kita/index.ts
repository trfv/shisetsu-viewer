import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { openreafHooks, type OpenreafTarget } from "../engines/openreaf.ts";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-12:00": "RESERVATION_DIVISION_MORNING",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "18:00-22:00": "RESERVATION_DIVISION_EVENING",
  "9:30-11:30": "RESERVATION_DIVISION_DIVISION_1",
  "12:00-14:00": "RESERVATION_DIVISION_DIVISION_2",
  "14:30-16:30": "RESERVATION_DIVISION_DIVISION_3",
  "17:00-19:00": "RESERVATION_DIVISION_DIVISION_4",
  "19:30-21:30": "RESERVATION_DIVISION_DIVISION_5",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "-": "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
  休館日: "RESERVATION_STATUS_STATUS_4",
  なし: "RESERVATION_STATUS_STATUS_5",
  公開対象外: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_7",
  整備: "RESERVATION_STATUS_STATUS_8",
  抽選確認中: "RESERVATION_STATUS_STATUS_9",
  保守: "RESERVATION_STATUS_STATUS_10",
  開放: "RESERVATION_STATUS_STATUS_11",
  使用禁止: "RESERVATION_STATUS_STATUS_12",
};

const targets: OpenreafTarget[] = [
  {
    facilityName: "赤羽会館",
    roomName: "講堂",
    links: ["集会施設", "赤羽会館", "講堂"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "大ホール （平土間）",
    links: ["集会施設", "滝野川会館", "大ホール （平土間）"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "大ホール （客席）",
    links: ["集会施設", "滝野川会館", "大ホール （客席）"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "小ホール",
    links: ["集会施設", "滝野川会館", "小ホール"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "B201音楽スタジオ",
    links: ["集会施設", "滝野川会館", "次の一覧", "B201音楽スタジオ"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "B202音楽スタジオ",
    links: ["集会施設", "滝野川会館", "次の一覧", "B202音楽スタジオ"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "カナリアホール",
    links: ["集会施設", "北とぴあ", "カナリアホール（定員110名）"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "スカイホール",
    links: ["集会施設", "北とぴあ", "スカイホール（定員138名）"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "ドームホール",
    links: ["集会施設", "北とぴあ", "ドームホール（定員150名）"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "つつじホールリハーサル室",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "つつじホールリハーサル室（定員50名）",
    ],
  },
  {
    facilityName: "北とぴあ",
    roomName: "第1音楽スタジオ",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "第1音楽スタジオ（定員20名）",
    ],
  },
  {
    facilityName: "北とぴあ",
    roomName: "第2音楽スタジオ",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "第2音楽スタジオ（定員15名）",
    ],
  },
  {
    facilityName: "北とぴあ",
    roomName: "第3音楽スタジオ",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "第3音楽スタジオ（定員15名）",
    ],
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-kita",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 5, unit: "day" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, links: t.links }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...openreafHooks({
    baseUrl: "https://kita-yoyaku.openreaf02.jp/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    // サイト側で室場リンクに定員サフィックス（例「（定員90名）」）が付くため前方一致
    roomLinkMatch: "prefix",
  }),
});
