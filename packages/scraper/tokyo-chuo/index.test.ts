import { test } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startData), 5);
  return differenceInDays(endDate, startData) + 1;
}

const scrapeTargets = [
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

scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-chuo",
      facility: facilityName,
      context: { roomName, links },
      sourceRef: "tokyo-chuo/index.ts",
      page,
      label: title,
      prepare: () => prepare(page, links),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(roomName, eo),
      persist: (to) =>
        writeTestResult("tokyo-chuo", `${facilityName}-${roomName}`, facilityName, to),
    });
  });
});
