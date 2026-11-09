import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { eprsHooks, type EprsTarget } from "../engines/eprs.ts";

// 四谷スポーツスクエアの 4 区分は午前・午後 2 コマ・夜間に寄せ、実時刻は施設 JSON の division_labels で出す
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
  "１区分": "RESERVATION_DIVISION_MORNING",
  "２区分": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "３区分": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "４区分": "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  予約あり: "RESERVATION_STATUS_STATUS_1",
  休館日: "RESERVATION_STATUS_STATUS_2",
  保守日: "RESERVATION_STATUS_STATUS_3",
  受付期間外: "RESERVATION_STATUS_STATUS_4",
  雨天: "RESERVATION_STATUS_STATUS_5",
};

const START_OFFSET_DAYS = 1;

// 区民ホールの「入場料あり」と文化センターの「大ホール１階席」は同じ部屋の別料金で、空き状況も同じなので取らない
const targets: EprsTarget[] = [
  { facilityName: "四谷スポーツスクエア", roomName: "音楽室", bldCd: "1030", instCd: "10300050" },
  { facilityName: "新宿文化センター", roomName: "大ホール", bldCd: "1700", instCd: "17000010" },
  { facilityName: "新宿文化センター", roomName: "リハーサル室", bldCd: "1700", instCd: "17000120" },
  { facilityName: "新宿文化センター", roomName: "小ホール", bldCd: "1700", instCd: "17000130" },
  {
    facilityName: "区民ホール",
    roomName: "四谷・ホール（入場料なし）",
    bldCd: "1760",
    instCd: "17600020",
  },
  {
    facilityName: "区民ホール",
    roomName: "牛込箪笥・ホール（入場料なし）",
    bldCd: "1760",
    instCd: "17600040",
  },
  {
    facilityName: "区民ホール",
    roomName: "角筈・ホール（入場料なし）",
    bldCd: "1760",
    instCd: "17600060",
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-shinjuku-regasu",
  targets,
  // 大ホールは 13 か月先まで受付中。ほかの部屋はその手前で engine が打ち切る
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 14, unit: "week" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, bldCd: t.bldCd, instCd: t.instCd }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...eprsHooks({
    baseUrl: "https://www.shinjuku.eprs.jp/regasu/web/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    searchPurpose: "音楽・演劇活動",
    outOfPeriodStatus: "受付期間外",
    // 「音楽」「演劇」は館の種類ごとに同じラベルが複数あり、ラベルでは選び分けられない
    discoverPurposes: ["音楽・演劇活動", "音楽活動", "練習・リハーサル", "公演利用", "練習利用"],
  }),
});
