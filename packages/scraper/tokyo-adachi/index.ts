import { defineScraper } from "../common/defineScraper.ts";
import { pagesForHorizon } from "../common/horizon.ts";
import type { Division, Status } from "../common/types.ts";
import { pKashikanHooks, type PKashikanTarget } from "../engines/pKashikan.ts";

// 館ごとの実時刻は施設 JSON の division_labels で出す。午前・午後・夜間に寄せるのは「午前空き」等の検索に載せるため
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-12:00": "RESERVATION_DIVISION_MORNING",
  "12:30-15:00": "RESERVATION_DIVISION_AFTERNOON_ONE",
  "15:30-18:00": "RESERVATION_DIVISION_AFTERNOON_TWO",
  "18:30-21:30": "RESERVATION_DIVISION_EVENING",
  "9:00-12:30": "RESERVATION_DIVISION_MORNING",
  "13:00-17:30": "RESERVATION_DIVISION_AFTERNOON",
  "18:00-21:30": "RESERVATION_DIVISION_EVENING",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "17:30-21:30": "RESERVATION_DIVISION_EVENING",
  "9:00-10:00": "RESERVATION_DIVISION_DIVISION_1",
  "10:00-11:00": "RESERVATION_DIVISION_DIVISION_2",
  "11:00-12:00": "RESERVATION_DIVISION_DIVISION_3",
  "12:00-13:00": "RESERVATION_DIVISION_DIVISION_4",
  "13:00-14:00": "RESERVATION_DIVISION_DIVISION_5",
  "14:00-15:00": "RESERVATION_DIVISION_DIVISION_6",
  "15:00-16:00": "RESERVATION_DIVISION_DIVISION_7",
  "16:00-17:00": "RESERVATION_DIVISION_DIVISION_8",
  "17:00-18:00": "RESERVATION_DIVISION_DIVISION_9",
  "18:00-19:00": "RESERVATION_DIVISION_DIVISION_10",
  "19:00-20:00": "RESERVATION_DIVISION_DIVISION_11",
  "20:00-21:00": "RESERVATION_DIVISION_DIVISION_12",
  "21:00-21:30": "RESERVATION_DIVISION_DIVISION_13",
};

// ● はネット予約不可（窓口受付）の空き。サイトの凡例どおり ○ と同じ「空き」にする
export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "●": "RESERVATION_STATUS_VACANT",
  "×": "RESERVATION_STATUS_STATUS_1",
  休館: "RESERVATION_STATUS_STATUS_2",
  保守: "RESERVATION_STATUS_STATUS_3",
  "-": "RESERVATION_STATUS_STATUS_4",
};

const START_OFFSET_DAYS = 1;

const RECREATION_HALL_KOMAS = ["9:00-12:00", "12:30-15:00", "15:30-18:00", "18:30-21:30"];
const LONG_AFTERNOON_KOMAS = ["9:00-12:30", "13:00-17:30", "18:00-21:30"];
const LONG_EVENING_KOMAS = ["9:00-12:30", "13:00-17:00", "17:30-21:30"];
const HOURLY_KOMAS = [
  "9:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
  "19:00-20:00",
  "20:00-21:00",
  "21:00-21:30",
];

interface AdachiTarget extends PKashikanTarget {
  /** 受付は部屋の種類で違う（学習センター 2、ギャラクシティ 3、リハーサル室 4、ホール 12 ヶ月先の月末まで） */
  monthsAhead: number;
}

function learningCenterHall(facilityName: string): AdachiTarget {
  return {
    facilityName,
    roomName: "レクリエーションホール",
    komas: RECREATION_HALL_KOMAS,
    monthsAhead: 2,
  };
}

function galaxcity(roomName: string): AdachiTarget {
  return { facilityName: "ギャラクシティ", roomName, komas: HOURLY_KOMAS, monthsAhead: 3 };
}

// 利用目的「音楽」「演奏会・発表会」で検索に出る部屋。花畑地域学習センターは改修で長期休館中
const targets: AdachiTarget[] = [
  {
    facilityName: "生涯学習センター",
    roomName: "研修室1",
    komas: LONG_AFTERNOON_KOMAS,
    monthsAhead: 2,
  },
  {
    facilityName: "生涯学習センター",
    roomName: "講堂",
    komas: LONG_AFTERNOON_KOMAS,
    monthsAhead: 12,
  },
  learningCenterHall("竹の塚地域学習センター"),
  {
    facilityName: "竹の塚地域学習センター",
    roomName: "ホール",
    komas: LONG_EVENING_KOMAS,
    monthsAhead: 12,
  },
  {
    facilityName: "中央本町地域学習センター",
    roomName: "音楽室",
    komas: LONG_EVENING_KOMAS,
    monthsAhead: 2,
  },
  learningCenterHall("中央本町地域学習センター"),
  learningCenterHall("東和地域学習センター"),
  learningCenterHall("佐野地域学習センター"),
  learningCenterHall("舎人地域学習センター"),
  learningCenterHall("保塚地域学習センター"),
  learningCenterHall("江北地域学習センター"),
  learningCenterHall("興本地域学習センター"),
  {
    facilityName: "興本地域学習センター",
    roomName: "第3学習室",
    komas: LONG_EVENING_KOMAS,
    monthsAhead: 2,
  },
  learningCenterHall("伊興地域学習センター"),
  learningCenterHall("鹿浜地域学習センター"),
  learningCenterHall("新田地域学習センター"),
  galaxcity("第1レクリエーションホール"),
  galaxcity("第2レクリエーションホール"),
  galaxcity("第3レクリエーションホール"),
  galaxcity("第1音楽室"),
  galaxcity("第2音楽室"),
  galaxcity("第3音楽室"),
  {
    facilityName: "ギャラクシティ",
    roomName: "リハーサル室",
    komas: LONG_EVENING_KOMAS,
    monthsAhead: 4,
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-adachi",
  targets,
  horizon: (t) =>
    pagesForHorizon({
      startOffsetDays: START_OFFSET_DAYS,
      monthsAhead: t.monthsAhead,
      unit: "day",
    }),
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, komas: t.komas }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...pKashikanHooks({
    baseUrl: "https://k5.p-kashikan.jp/adachi-ku/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
    spacerWidth: "24px",
    selectBuilding: true,
  }),
});
