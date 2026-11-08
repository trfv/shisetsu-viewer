import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { webrGrandSlotHooks, type WebrGrandTarget } from "../engines/webrGrand.ts";

// ホール系の部屋と烏山区民センター音楽室は、他と時間枠が違う。
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00～12:00": "RESERVATION_DIVISION_MORNING",
  "12:30～14:30": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "15:00～17:00": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "17:30～19:30": "RESERVATION_DIVISION_EVENING_ONE",
  "20:00～22:00": "RESERVATION_DIVISION_EVENING_TWO",
  "20:00～21:30": "RESERVATION_DIVISION_EVENING_TWO",
  "13:00～15:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "15:30～17:30": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "18:00～22:00": "RESERVATION_DIVISION_EVENING",
  "9:00～11:00": "RESERVATION_DIVISION_MORNING_ONE",
  "11:30～13:30": "RESERVATION_DIVISION_MORNING_TWO",
  "14:00～16:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "16:30～18:30": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "19:00～22:00": "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
  "＊": "RESERVATION_STATUS_STATUS_4",
  休館: "RESERVATION_STATUS_STATUS_5",
  なし: "RESERVATION_STATUS_STATUS_6",
  個人開放: "RESERVATION_STATUS_STATUS_7",
  施設保守: "RESERVATION_STATUS_STATUS_8",
  "fa fa-refresh": "RESERVATION_STATUS_STATUS_9",
};

const CATEGORY_MAP: Record<string, string> = {
  桜丘区民センター: "区民センター",
  太子堂区民センター: "区民センター",
  弦巻区民センター: "区民センター",
  宮坂区民センター: "区民センター",
  代田区民センター: "区民センター",
  玉川台区民センター: "区民センター",
  鎌田区民センター: "区民センター",
  粕谷区民センター: "区民センター",
  上北沢区民センター: "区民センター",
  烏山区民センター: "区民センター",
  上馬地区会館: "地区会館",
  花見堂地区会館: "地区会館",
  尾山台地区会館: "地区会館",
  新代田区民集会所: "区民集会所",
  砧総合支所区民集会所: "区民集会所",
  希望丘区民集会所: "区民集会所",
  上馬高齢者集会所: "敬老会館・高齢者集会所",
};

const targets: WebrGrandTarget[] = [
  { facilityName: "桜丘区民センター", rooms: ["音楽室", "集会室兼体育室"] },
  { facilityName: "太子堂区民センター", rooms: ["音楽室"] },
  { facilityName: "弦巻区民センター", rooms: ["多目的室", "第１音楽室", "第２音楽室"] },
  { facilityName: "宮坂区民センター", rooms: ["多目的ホール"] },
  { facilityName: "代田区民センター", rooms: ["第４会議室", "音楽室", "多目的室"] },
  { facilityName: "玉川台区民センター", rooms: ["音楽室"] },
  { facilityName: "鎌田区民センター", rooms: ["音楽室"] },
  { facilityName: "粕谷区民センター", rooms: ["音楽室"] },
  { facilityName: "上北沢区民センター", rooms: ["音楽室"] },
  { facilityName: "烏山区民センター", rooms: ["音楽室"] },
  { facilityName: "上馬地区会館", rooms: ["音楽室"] },
  { facilityName: "花見堂地区会館", rooms: ["音楽室"] },
  { facilityName: "尾山台地区会館", rooms: ["音楽室"] },
  { facilityName: "新代田区民集会所", rooms: ["音楽室"] },
  { facilityName: "砧総合支所区民集会所", rooms: ["音楽室"] },
  { facilityName: "希望丘区民集会所", rooms: ["音楽室"] },
  { facilityName: "上馬高齢者集会所", rooms: ["多目的ホール"] },
];

export const scraper = defineScraper({
  municipality: "tokyo-setagaya",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 2, unit: "twoWeeks" },
  facility: (t) => t.facilityName,
  ...webrGrandSlotHooks({
    baseUrl: "https://setagaya.keyakinet.net/Web/Home",
    maxSelection: 10,
    categoryTab: "カテゴリーから探す",
    categoryMap: CATEGORY_MAP,
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    facilityCellExact: true,
  }),
});
