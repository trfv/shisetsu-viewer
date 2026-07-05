import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { webrGrandHooks, type WebrGrandTarget } from "../engines/webrGrand.ts";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
  "＊": "RESERVATION_STATUS_STATUS_4",
  休館: "RESERVATION_STATUS_STATUS_5",
  抽選: "RESERVATION_STATUS_STATUS_6",
};

const CATEGORY_MAP: Record<string, string> = {
  中小企業センター: "中小企業センター",
  勤労福祉会館: "勤労福祉会館",
  田道住区センター三田分室: "住区センター",
  上目黒住区センター: "住区センター",
  菅刈住区センター: "住区センター",
  東山住区センター: "住区センター",
  中目黒住区センター: "住区センター",
  田道住区センター: "住区センター",
  下目黒住区センター: "住区センター",
  不動住区センター: "住区センター",
  油面住区センター: "住区センター",
  五本木住区センター: "住区センター",
  鷹番住区センター: "住区センター",
  月光原住区センター: "住区センター",
  向原住区センター: "住区センター",
  碑住区センター: "住区センター",
  原町住区センター: "住区センター",
  大岡山東住区センター: "住区センター",
  大岡山西住区センター: "住区センター",
  中根住区センター: "住区センター",
  八雲住区センター: "住区センター",
  東根住区センター: "住区センター",
  めぐろパーシモンホール: "文化ホール",
  中目黒ＧＴプラザホール: "文化ホール",
  東山社会教育館: "社会教育・文化会館",
  中央町社会教育館: "社会教育・文化会館",
  目黒本町社会教育館: "社会教育・文化会館",
  緑が丘文化会館: "社会教育・文化会館",
  区民センター社会教育館: "社会教育・文化会館",
  菅刈住区いこいの家: "いこいの家",
  東山住区いこいの家: "いこいの家",
  烏森住区いこいの家: "いこいの家",
  月光原住区いこいの家: "いこいの家",
  向原住区いこいの家: "いこいの家",
  碑住区いこいの家: "いこいの家",
  大岡山東住区いこいの家: "いこいの家",
};

const targets: WebrGrandTarget[] = Object.keys(CATEGORY_MAP).map((facilityName) => ({
  facilityName,
}));

export const scraper = defineScraper({
  municipality: "tokyo-meguro",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 7, unit: "twoWeeks" },
  facility: (t) => t.facilityName,
  ...webrGrandHooks({
    baseUrl: "https://resv.city.meguro.tokyo.jp/Web/Home/WgR_ModeSelect",
    categoryMap: CATEGORY_MAP,
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    facilityCellExact: true,
  }),
});
