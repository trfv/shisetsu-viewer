import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { pKashikanHooks, type PKashikanTarget } from "../engines/pKashikan.ts";

// 4 コマ部屋は午前・午後・夜間に寄せる（「午前空き」等の検索に載せるため）。
// 午後の 2 コマは AFTERNOON_ONE / _TWO（D1 の is_afternoon_vacant は両方空きで真）。
// 午前・夜間は北区で共有する registry ラベル（OpenReaf の時刻）と違うため、施設 JSON の division_labels で実時刻を出す。
// viewer は enum 順に並べるため、6 コマ・9 コマ部屋で共有する 19:00-20:45 は最後の DIVISION_19 に置く
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-11:45": "RESERVATION_DIVISION_MORNING",
  "12:00-14:45": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "15:00-17:45": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "18:00-20:45": "RESERVATION_DIVISION_EVENING",
  "9:00-10:45": "RESERVATION_DIVISION_DIVISION_6",
  "11:00-12:45": "RESERVATION_DIVISION_DIVISION_7",
  "13:00-14:45": "RESERVATION_DIVISION_DIVISION_8",
  "15:00-16:45": "RESERVATION_DIVISION_DIVISION_9",
  "17:00-18:45": "RESERVATION_DIVISION_DIVISION_10",
  "9:00-10:00": "RESERVATION_DIVISION_DIVISION_11",
  "10:15-11:15": "RESERVATION_DIVISION_DIVISION_12",
  "11:30-12:30": "RESERVATION_DIVISION_DIVISION_13",
  "12:45-13:45": "RESERVATION_DIVISION_DIVISION_14",
  "14:00-15:00": "RESERVATION_DIVISION_DIVISION_15",
  "15:15-16:15": "RESERVATION_DIVISION_DIVISION_16",
  "16:30-17:30": "RESERVATION_DIVISION_DIVISION_17",
  "17:45-18:45": "RESERVATION_DIVISION_DIVISION_18",
  "19:00-20:45": "RESERVATION_DIVISION_DIVISION_19",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "×": "RESERVATION_STATUS_STATUS_2",
  "-": "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
};

const START_OFFSET_DAYS = 1;

const FOUR_KOMAS = ["9:00-11:45", "12:00-14:45", "15:00-17:45", "18:00-20:45"];
const SIX_KOMAS = [
  "9:00-10:45",
  "11:00-12:45",
  "13:00-14:45",
  "15:00-16:45",
  "17:00-18:45",
  "19:00-20:45",
];
const MUSIC_STUDIO_KOMAS = [
  "9:00-10:00",
  "10:15-11:15",
  "11:30-12:30",
  "12:45-13:45",
  "14:00-15:00",
  "15:15-16:15",
  "16:30-17:30",
  "17:45-18:45",
  "19:00-20:45",
];

// 多目的室・稽古場・和室などもあるが、施設マスタに登録した 6 室に絞る
const targets: PKashikanTarget[] = [
  { facilityName: "ココキタ", roomName: "スタジオ1", komas: FOUR_KOMAS },
  { facilityName: "ココキタ", roomName: "スタジオ2", komas: SIX_KOMAS },
  { facilityName: "ココキタ", roomName: "スタジオ3", komas: FOUR_KOMAS },
  { facilityName: "ココキタ", roomName: "スタジオ4", komas: FOUR_KOMAS },
  { facilityName: "ココキタ", roomName: "音楽スタジオ1", komas: MUSIC_STUDIO_KOMAS },
  { facilityName: "ココキタ", roomName: "音楽スタジオ2", komas: MUSIC_STUDIO_KOMAS },
];

export const scraper = defineScraper({
  municipality: "tokyo-kita-cocokita",
  targets,
  // 公開範囲は 2 ヶ月先の月末まで（それ以遠は全コマ「-」）
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 2, unit: "day" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, komas: t.komas }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...pKashikanHooks({
    baseUrl: "https://k5.p-kashikan.jp/cocokita/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    spacerWidth: "15px",
    selectBuilding: false,
  }),
});
