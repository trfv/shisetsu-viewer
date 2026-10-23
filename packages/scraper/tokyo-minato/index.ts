import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { eprsHooks, type EprsTarget } from "../engines/eprs.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  予約あり: "RESERVATION_STATUS_STATUS_1",
  休館日: "RESERVATION_STATUS_STATUS_2",
  保守日: "RESERVATION_STATUS_STATUS_3",
  受付期間外: "RESERVATION_STATUS_STATUS_4",
  閉館: "RESERVATION_STATUS_STATUS_5",
};

const START_OFFSET_DAYS = 1;

// コードは `npm run discover -- tokyo-minato` で取り直せる
const targets: EprsTarget[] = [
  {
    facilityName: "麻布区民センター",
    roomName: "区民ホール：２３７名",
    bldCd: "10000",
    instCd: "10000010",
  },
  {
    facilityName: "赤坂区民センター",
    roomName: "区民ホール：４００名",
    bldCd: "10100",
    instCd: "10100010",
  },
  {
    facilityName: "赤坂区民センター",
    roomName: "リハーサル室：１２名",
    bldCd: "10100",
    instCd: "10100020",
  },
  {
    facilityName: "赤坂区民センター",
    roomName: "多目的室：９０名",
    bldCd: "10100",
    instCd: "10100040",
  },
  {
    facilityName: "高輪区民センター",
    roomName: "区民ホール：２２４名",
    bldCd: "10200",
    instCd: "10200010",
  },
  {
    facilityName: "高輪区民センター",
    roomName: "音楽スタジオ：３０名",
    bldCd: "10200",
    instCd: "10200050",
  },
  {
    facilityName: "芝浦港南区民センター",
    roomName: "区民ホール：２３５名",
    bldCd: "10300",
    instCd: "10300010",
  },
  {
    facilityName: "台場区民センター",
    roomName: "区民ホール：２５０名",
    bldCd: "10400",
    instCd: "10400010",
  },
  {
    facilityName: "港区立産業振興センター",
    roomName: "ホール大：２８０名",
    bldCd: "22000",
    instCd: "22000010",
  },
  {
    facilityName: "港区立産業振興センター",
    roomName: "ホール小：１２０名",
    bldCd: "22000",
    instCd: "22000020",
  },
  {
    facilityName: "男女平等参画センター",
    roomName: "ホール：２０８名",
    bldCd: "51000",
    instCd: "51000120",
  },
  {
    facilityName: "神明いきいきプラザ",
    roomName: "音楽スタジオ：１０名",
    bldCd: "30100",
    instCd: "30100060",
  },
  {
    facilityName: "ありすいきいきプラザ",
    roomName: "多目的室：４８名",
    bldCd: "30450",
    instCd: "30450060",
  },
  {
    facilityName: "白金台いきいきプラザ",
    roomName: "ホール：１２０名",
    bldCd: "31400",
    instCd: "31400060",
  },
  {
    facilityName: "港南いきいきプラザ",
    roomName: "多目的室：３０名",
    bldCd: "31500",
    instCd: "31500010",
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-minato",
  targets,
  // 受付期間は 4 ヶ月先の月末までで、産業振興センターのホールだけ約 1 年先まで（先は engine が打ち切る）
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 13, unit: "week" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, bldCd: t.bldCd, instCd: t.instCd }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...eprsHooks({
    baseUrl: "https://web101.rsv.ws-scs.jp/web/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    searchPurpose: "管楽器",
    outOfPeriodStatus: "受付期間外",
    discoverPurposes: [
      "声楽・合唱・コーラス",
      "ピアノ演奏",
      "管楽器",
      "弦楽器",
      "打楽器",
      "バンド演奏",
      "その他音楽",
    ],
  }),
});
