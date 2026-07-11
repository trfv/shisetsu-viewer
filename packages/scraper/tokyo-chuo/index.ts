import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { openreafHooks, type OpenreafTarget } from "../engines/openreaf.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00-12:00": "RESERVATION_DIVISION_MORNING",
  "13:00-17:00": "RESERVATION_DIVISION_AFTERNOON",
  "18:00-21:00": "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "-": "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
  なし: "RESERVATION_STATUS_STATUS_5",
  公開対象外: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_7",
  整備: "RESERVATION_STATUS_STATUS_8",
  抽選確認中: "RESERVATION_STATUS_STATUS_9",
};

const targets: OpenreafTarget[] = [
  {
    facilityName: "築地社会教育会館",
    roomName: "音楽室",
    links: ["社会教育会館", "築地社会教育会館", "次の一覧", "音楽室"],
  },
  {
    facilityName: "日本橋社会教育会館",
    roomName: "音楽室",
    links: ["社会教育会館", "日本橋社会教育会館", "音楽室"],
  },
  {
    facilityName: "日本橋社会教育会館",
    roomName: "ホール全体（舞台・客席付）",
    links: ["社会教育会館", "日本橋社会教育会館（ホール）", "ホール 全体（舞台・客席付）"],
  },
  {
    facilityName: "日本橋社会教育会館",
    roomName: "ホールフロア（床のみ）",
    links: ["社会教育会館", "日本橋社会教育会館（ホール）", "ホール フロア（床のみ）"],
  },
  {
    facilityName: "月島社会教育会館",
    roomName: "ホール全体（舞台・客席付）",
    links: ["社会教育会館", "月島社会教育会館（ホール）", "ホール 全体（舞台・客席付）"],
  },
  {
    facilityName: "月島社会教育会館",
    roomName: "ホールフロア（床のみ）",
    links: ["社会教育会館", "月島社会教育会館（ホール）", "ホール フロア（床のみ）"],
  },
  {
    facilityName: "アートはるみ",
    roomName: "音楽室",
    links: ["社会教育会館", "月島社会教育会館分館アートはるみ", "音楽室"],
  },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第１音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第１音楽スタジオ)"],
  // },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第２音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第２音楽スタジオ)"],
  // },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第３音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第３音楽スタジオ)"],
  // },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第４音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第４音楽スタジオ)"],
  // },
];

export const scraper = defineScraper({
  municipality: "tokyo-chuo",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 5, unit: "day" },
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, links: t.links }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...openreafHooks({
    baseUrl: "https://chuo-yoyaku.openreaf02.jp/",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    roomLinkMatch: "exact",
  }),
});
