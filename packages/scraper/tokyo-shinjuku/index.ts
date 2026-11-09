import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { eprsHooks, type EprsTarget } from "../engines/eprs.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後１: "RESERVATION_DIVISION_AFTERNOON_ONE",
  午後２: "RESERVATION_DIVISION_AFTERNOON_TWO",
  夜間１: "RESERVATION_DIVISION_EVENING_ONE",
  夜間２: "RESERVATION_DIVISION_EVENING_TWO",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  予約あり: "RESERVATION_STATUS_STATUS_1",
  休館日: "RESERVATION_STATUS_STATUS_2",
  保守日: "RESERVATION_STATUS_STATUS_3",
  受付期間外: "RESERVATION_STATUS_STATUS_4",
};

const START_OFFSET_DAYS = 1;

// コードは `npm run discover -- tokyo-shinjuku` で取り直せる
const targets: EprsTarget[] = [
  {
    facilityName: "四谷地域センター",
    roomName: "多目的ホール（１００）",
    bldCd: "1000",
    instCd: "10000010",
  },
  {
    facilityName: "四谷地域センター",
    roomName: "音楽室（集会室１）（３０）",
    bldCd: "1000",
    instCd: "10000090",
  },
  {
    facilityName: "榎町地域センター",
    roomName: "多目的ホール（１２０）",
    bldCd: "1020",
    instCd: "10200010",
  },
  {
    facilityName: "榎町地域センター",
    roomName: "軽音楽室（１８）",
    bldCd: "1020",
    instCd: "10200070",
  },
  {
    facilityName: "榎町地域センター",
    roomName: "地下ホールＡ（５４）",
    bldCd: "1020",
    instCd: "10200100",
  },
  {
    facilityName: "榎町地域センター",
    roomName: "地下ホールＢ（３２）",
    bldCd: "1020",
    instCd: "10200110",
  },
  {
    facilityName: "若松地域センター",
    roomName: "３Ｆホール（１３０）",
    bldCd: "1030",
    instCd: "10300030",
  },
  {
    facilityName: "若松地域センター",
    roomName: "スタジオＹＭ（１５）",
    bldCd: "1030",
    instCd: "10300080",
  },
  {
    facilityName: "若松地域センター",
    roomName: "Ｂ１ホール（４０）",
    bldCd: "1030",
    instCd: "10300090",
  },
  {
    facilityName: "大久保地域センター",
    roomName: "多目的ホール（１２０）",
    bldCd: "1040",
    instCd: "10400010",
  },
  {
    facilityName: "戸塚地域センター",
    roomName: "多目的ホール（１８０）",
    bldCd: "1050",
    instCd: "10500010",
  },
  {
    facilityName: "戸塚地域センター",
    roomName: "音楽室（２０）",
    bldCd: "1050",
    instCd: "10500030",
  },
  {
    facilityName: "落合第一地域センター",
    roomName: "４Ｆホール（１５０）",
    bldCd: "1060",
    instCd: "10600010",
  },
  {
    facilityName: "落合第二地域センター",
    roomName: "多目的ホール（１００）",
    bldCd: "1070",
    instCd: "10700010",
  },
  {
    facilityName: "落合第二地域センター",
    roomName: "音楽室（１８）",
    bldCd: "1070",
    instCd: "10700040",
  },
  {
    facilityName: "柏木地域センター",
    roomName: "音楽室（１５）",
    bldCd: "1080",
    instCd: "10800030",
  },
  {
    facilityName: "柏木地域センター",
    roomName: "多目的ホール（１２０）",
    bldCd: "1080",
    instCd: "10800040",
  },
  {
    facilityName: "角筈地域センター",
    roomName: "レクリエーションホール（９０）",
    bldCd: "1090",
    instCd: "10900060",
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-shinjuku",
  targets,
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 4, unit: "week" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, bldCd: t.bldCd, instCd: t.instCd }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...eprsHooks({
    baseUrl: "https://www.shinjuku.eprs.jp/chiiki/web/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    searchPurpose: "楽器演奏",
    outOfPeriodStatus: "受付期間外",
    discoverPurposes: ["楽器演奏", "バンド", "軽音楽", "コーラス", "コンサート"],
  }),
});
