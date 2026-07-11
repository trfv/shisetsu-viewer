import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { webrGrandHooks, type WebrGrandTarget } from "../engines/webrGrand.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
  "＊": "RESERVATION_STATUS_STATUS_7",
  休館: "RESERVATION_STATUS_STATUS_4",
  休館日: "RESERVATION_STATUS_STATUS_5",
  なし: "RESERVATION_STATUS_STATUS_6",
  教室: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_8",
};

const CATEGORY_MAP: Record<string, string> = {
  池袋本町第一区民集会室: "区民集会室・区民ひろば",
  区民ひろば西巣鴨第一: "区民集会室・区民ひろば",
  区民ひろば富士見台: "区民集会室・区民ひろば",
  区民ひろば南池袋: "区民集会室・区民ひろば",
  高田第一区民集会室: "区民集会室・区民ひろば",
  南長崎第一区民集会室: "区民集会室・区民ひろば",
  雑司が谷公園丘の上テラス: "スポーツ施設",
  駒込地域文化創造館: "地域文化創造館・南大塚ホール",
  巣鴨地域文化創造館: "地域文化創造館・南大塚ホール",
  雑司が谷地域文化創造館: "地域文化創造館・南大塚ホール",
  千早地域文化創造館: "地域文化創造館・南大塚ホール",
  南大塚地域文化創造館: "地域文化創造館・南大塚ホール",
  としま区民センター: "区民ｾﾝﾀｰ･ｲｹﾋﾞｽﾞ･あうるすぽっと",
  "としま産業振興プラザ※イケビズ": "区民ｾﾝﾀｰ･ｲｹﾋﾞｽﾞ･あうるすぽっと",
  ふるさと千川館: "ふるさと千川館",
};

const targets: WebrGrandTarget[] = [
  "池袋本町第一区民集会室",
  "区民ひろば西巣鴨第一",
  "区民ひろば富士見台",
  "区民ひろば南池袋",
  "駒込地域文化創造館",
  "巣鴨地域文化創造館",
  "雑司が谷公園丘の上テラス",
  "雑司が谷地域文化創造館",
  "高田第一区民集会室",
  "千早地域文化創造館",
  "としま区民センター",
  "としま産業振興プラザ※イケビズ",
  "ふるさと千川館",
  "南大塚地域文化創造館",
  "南長崎第一区民集会室",
].map((facilityName) => ({ facilityName }));

export const scraper = defineScraper({
  municipality: "tokyo-toshima",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 7, unit: "twoWeeks" },
  facility: (t) => t.facilityName,
  ...webrGrandHooks({
    baseUrl: "https://www2.pf489.com/toshima/WebR/",
    categoryMap: CATEGORY_MAP,
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
  }),
});
