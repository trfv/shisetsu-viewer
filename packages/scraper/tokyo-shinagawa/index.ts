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
};

const START_OFFSET_DAYS = 1;

// 館・施設コードは空き状況画面の select（#mansion-select / #facility-select）の value。
// 一覧は `npm run discover -- tokyo-shinagawa` で取り直せる
const targets: EprsTarget[] = [
  {
    facilityName: "五反田文化センター",
    roomName: "第１スタジオ",
    bldCd: "2010",
    instCd: "20100100",
  },
  {
    facilityName: "五反田文化センター",
    roomName: "第２スタジオ",
    bldCd: "2010",
    instCd: "20100110",
  },
  {
    facilityName: "五反田文化センター",
    roomName: "第３スタジオ",
    bldCd: "2010",
    instCd: "20100120",
  },
  {
    facilityName: "五反田文化センター",
    roomName: "第４スタジオ",
    bldCd: "2010",
    instCd: "20100130",
  },
  {
    facilityName: "五反田文化センター",
    roomName: "第５スタジオ",
    bldCd: "2010",
    instCd: "20100140",
  },
  {
    facilityName: "五反田文化センター",
    roomName: "音楽ホール（舞台のみ）",
    bldCd: "2010",
    instCd: "20100150",
  },
  { facilityName: "五反田文化センター", roomName: "音楽ホール", bldCd: "2010", instCd: "20100160" },
  { facilityName: "荏原文化センター", roomName: "大ホール", bldCd: "2020", instCd: "20200110" },
  { facilityName: "スクエア荏原", roomName: "ひらつかホール", bldCd: "4020", instCd: "40200010" },
  { facilityName: "スクエア荏原", roomName: "第１スタジオ", bldCd: "4020", instCd: "40200180" },
  { facilityName: "スクエア荏原", roomName: "第２スタジオ", bldCd: "4020", instCd: "40200190" },
  { facilityName: "スクエア荏原", roomName: "第３スタジオ", bldCd: "4020", instCd: "40200200" },
  { facilityName: "きゅりあん", roomName: "大ホール全面", bldCd: "4010", instCd: "40100010" },
  { facilityName: "きゅりあん", roomName: "小ホール全面", bldCd: "4010", instCd: "40100080" },
  { facilityName: "きゅりあん", roomName: "音楽スタジオ", bldCd: "4010", instCd: "40100190" },
  { facilityName: "きゅりあん", roomName: "リハーサル室", bldCd: "4010", instCd: "40100200" },
  {
    facilityName: "品川健康Ｃホール",
    roomName: "ホール＜全面＞",
    bldCd: "2370",
    instCd: "23700010",
  },
  {
    facilityName: "品川健康Ｃホール",
    roomName: "ホール＜半面＞",
    bldCd: "2370",
    instCd: "23700020",
  },
  { facilityName: "中小企業センター", roomName: "音楽室", bldCd: "2400", instCd: "24000130" },
  { facilityName: "八潮区民集会所", roomName: "音楽室", bldCd: "2180", instCd: "21800010" },
  {
    facilityName: "こみゅにてぃぷらざ八潮",
    roomName: "第１音楽室",
    bldCd: "2190",
    instCd: "21900090",
  },
  {
    facilityName: "こみゅにてぃぷらざ八潮",
    roomName: "第２音楽室",
    bldCd: "2190",
    instCd: "21900100",
  },
  // 学校開放
  { facilityName: "戸越台中学校", roomName: "音楽室", bldCd: "3400", instCd: "34000040" },
  { facilityName: "荏原平塚学園", roomName: "音楽室（５階）", bldCd: "3440", instCd: "34400050" },
  { facilityName: "山中小学校", roomName: "ランチルーム", bldCd: "3120", instCd: "31200030" },
  { facilityName: "山中小学校", roomName: "わくわくランド", bldCd: "3120", instCd: "31200040" },
  { facilityName: "旗台小学校", roomName: "会議室", bldCd: "3280", instCd: "32800040" },
];

export const scraper = defineScraper({
  municipality: "tokyo-shinagawa",
  targets,
  // 受付期間は部屋ごとに違う（学校・スタジオ 1〜2 ヶ月、ホール約 13 ヶ月）。
  // 最長のホールに合わせ、全セルが受付期間外の週に達したら engine 側が打ち切る
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 13, unit: "week" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, bldCd: t.bldCd, instCd: t.instCd }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...eprsHooks({
    baseUrl: "https://www.cm9.eprs.jp/shinagawa/web/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    searchPurpose: "楽器練習",
    outOfPeriodStatus: "受付期間外",
    discoverPurposes: ["楽器練習", "楽器演奏", "声楽・合唱・コーラス", "演奏会・発表会・鑑賞会"],
  }),
});
