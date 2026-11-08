import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { CLOSED, reserve1Hooks, type Reserve1Target } from "../engines/reserve1.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "09:00-12:00": "RESERVATION_DIVISION_MORNING",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "17:30-21:00": "RESERVATION_DIVISION_EVENING",
};

// セルの画像名は凡例の画像名と番号がずれている（凡例の msg_01.gif がセルでは msg_icon02.gif）。
// 凡例の「電話対応」はセルの画像が未確認なので載せない
export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "msg_icon05.gif": "RESERVATION_STATUS_VACANT",
  "msg_icon01.gif": "RESERVATION_STATUS_STATUS_1",
  [CLOSED]: "RESERVATION_STATUS_STATUS_2",
  "msg_icon03.gif": "RESERVATION_STATUS_STATUS_3",
  "msg_icon02.gif": "RESERVATION_STATUS_STATUS_10",
  "msg_icon08.gif": "RESERVATION_STATUS_STATUS_11",
};

const START_OFFSET_DAYS = 1;
const FACILITY_NAME = "川崎市総合自治会館";

// 利用用途の表で楽器練習・合唱練習が○の部屋だけ（会議室は全室×）
const targets: Reserve1Target[] = [
  { facilityName: FACILITY_NAME, grand: "1", roomNames: ["ホール"] },
  {
    facilityName: FACILITY_NAME,
    grand: "3",
    roomNames: ["多目的室１", "多目的室２", "多目的室３"],
  },
];

export const scraper = defineScraper({
  municipality: "kanagawa-kawasaki-jichi",
  targets,
  // ホールの先着受付（5 ヶ月前の月の 1 日から）に合わせる。多目的室（3 ヶ月前の応当日まで）は engine がセレクトの月で打ち切る
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 5, unit: "month" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomNames.join("・")}`,
  context: (t) => ({ roomName: t.roomNames.join("・"), grand: t.grand }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.grand}`, facilityName: t.facilityName, data },
  ],
  ...reserve1Hooks({
    office: "6000028",
    mngfg: "6",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
  }),
});
