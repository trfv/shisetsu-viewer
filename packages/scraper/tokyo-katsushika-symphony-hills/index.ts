import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { aservHooks, type AservTarget, VACANT_ID } from "../engines/aserv.ts";

// 午前・午後・夜間に寄せるのは「午前空き」等の検索に載せるため。実時刻は施設 JSON の division_labels で出す。
// 1 時間刻みは葛飾区の registry（8:00 起点）と同じ番号に揃える
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-12:00": "RESERVATION_DIVISION_MORNING",
  "12:20-15:20": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "15:40-18:40": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "19:00-22:00": "RESERVATION_DIVISION_EVENING",
  "18:00-22:00": "RESERVATION_DIVISION_EVENING",
  "8:00-9:00": "RESERVATION_DIVISION_DIVISION_1",
  "9:00-10:00": "RESERVATION_DIVISION_DIVISION_2",
  "10:00-11:00": "RESERVATION_DIVISION_DIVISION_3",
  "11:00-12:00": "RESERVATION_DIVISION_DIVISION_4",
  "12:00-13:00": "RESERVATION_DIVISION_DIVISION_5",
  "13:00-14:00": "RESERVATION_DIVISION_DIVISION_6",
  "14:00-15:00": "RESERVATION_DIVISION_DIVISION_7",
  "15:00-16:00": "RESERVATION_DIVISION_DIVISION_8",
  "16:00-17:00": "RESERVATION_DIVISION_DIVISION_9",
  "17:00-18:00": "RESERVATION_DIVISION_DIVISION_10",
  "18:00-19:00": "RESERVATION_DIVISION_DIVISION_11",
  "19:00-20:00": "RESERVATION_DIVISION_DIVISION_12",
  "20:00-21:00": "RESERVATION_DIVISION_DIVISION_13",
  "21:00-22:00": "RESERVATION_DIVISION_DIVISION_14",
  "22:00-23:00": "RESERVATION_DIVISION_DIVISION_15",
};

// 凡例は「色の塗られていない部分は予約可能」。stDateFuka は塗りなしで、Web の受付開始前（窓口・電話なら可）の空き。
// enDateFuka は受付期間の後ろ側
export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  [VACANT_ID]: "RESERVATION_STATUS_VACANT",
  stDateFuka: "RESERVATION_STATUS_VACANT",
  stFuka: "RESERVATION_STATUS_STATUS_1",
  stSetAppFuka: "RESERVATION_STATUS_STATUS_1",
  enDateFuka: "RESERVATION_STATUS_STATUS_6",
};

const START_OFFSET_DAYS = 1;

// 利用目的「練習」で出る部屋からホールと、演奏不可（施設別利用目的の表で演劇・ダンス用）のレクレーションルームを除いたもの
const targets: AservTarget[] = [
  {
    facilityName: "かつしかシンフォニーヒルズ",
    kanCode: "1",
    skubunCode: "7",
    roomNames: ["練習室１", "練習室２", "練習室３"],
  },
  {
    facilityName: "かつしかシンフォニーヒルズ",
    kanCode: "1",
    skubunCode: "16",
    roomNames: ["練習室Ａ", "練習室Ｂ", "練習室Ｃ"],
  },
  {
    facilityName: "かつしかシンフォニーヒルズ",
    kanCode: "1",
    skubunCode: "19",
    roomNames: ["モーツァルトホールリハーサル室"],
  },
  {
    facilityName: "かめありリリオホール",
    kanCode: "2",
    skubunCode: "4",
    roomNames: ["リハーサル室"],
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-katsushika-symphony-hills",
  targets,
  // 練習室は 6 ヶ月先の月末まで。リリオのリハーサル室は 12 ヶ月先まで受け付けるホールと同じ区分なので、上限はホールに合わせ、先は engine が打ち切る
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 12, unit: "day" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomNames.join("・")}`,
  context: (t) => ({ roomName: t.roomNames.join("・"), skubunCode: t.skubunCode }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.skubunCode}`, facilityName: t.facilityName, data },
  ],
  ...aservHooks({
    baseUrl: "https://reserve.aserv.jp/k-mil/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    outOfPeriodStatus: "enDateFuka",
  }),
});
