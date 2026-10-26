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
  "＊": "RESERVATION_STATUS_STATUS_4",
  休館: "RESERVATION_STATUS_STATUS_5",
  抽選: "RESERVATION_STATUS_STATUS_6",
};

const CATEGORY_MAP: Record<string, string> = {
  中小企業センター: "中小企業センター",
  田道住区センター三田分室: "住区センター",
  上目黒住区センター: "住区センター",
  めぐろパーシモンホール: "文化ホール",
  中目黒ＧＴプラザホール: "文化ホール",
  東山社会教育館: "社会教育・文化会館",
  中央町社会教育館: "社会教育・文化会館",
  目黒本町社会教育館: "社会教育・文化会館",
  緑が丘文化会館: "社会教育・文化会館",
};

const targets: WebrGrandTarget[] = [
  { facilityName: "中小企業センター", rooms: ["ホール"] },
  {
    facilityName: "田道住区センター三田分室",
    rooms: [
      "１０１（レクホール）",
      "別館２０１（レクホール）",
      "別館Ｂ１０１（音楽室）",
      "別館Ｂ１０２（音楽室）",
    ],
  },
  {
    facilityName: "上目黒住区センター",
    rooms: ["Ｂ１０１【旧第１会議室】", "Ｂ１０２（レクホール）", "Ｂ１０３（音楽室）"],
  },
  {
    facilityName: "めぐろパーシモンホール",
    rooms: ["大ホール", "小ホール", "リハーサル室", "第１練習室", "第２練習室", "第３練習室"],
  },
  { facilityName: "中目黒ＧＴプラザホール", rooms: ["中目黒ＧＴプラザホール"] },
  {
    facilityName: "東山社会教育館",
    rooms: ["２０３【旧第３研修室】", "２０４(音楽室)【旧第４研修室】", "２０７（レクホール）"],
  },
  {
    facilityName: "中央町社会教育館",
    rooms: ["Ｂ１０１（音楽室）", "Ｂ１０７(和室)【旧第７研修室】", "Ｂ１０９（レクホール）"],
  },
  {
    facilityName: "目黒本町社会教育館",
    rooms: ["３０１（視聴覚室）", "３０６【旧第６研修室】", "３０７（レクホール）"],
  },
  { facilityName: "緑が丘文化会館", rooms: ["３０１（視聴覚室）", "別館２０３（音楽室）"] },
];

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
