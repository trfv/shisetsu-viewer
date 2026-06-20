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
    facilityName: "赤羽会館",
    roomName: "講堂",
    links: ["集会施設", "赤羽会館", "講堂"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "大ホール （平土間）",
    links: ["集会施設", "滝野川会館", "大ホール （平土間）"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "大ホール （客席）",
    links: ["集会施設", "滝野川会館", "大ホール （客席）"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "小ホール",
    links: ["集会施設", "滝野川会館", "小ホール"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "B201音楽スタジオ",
    links: ["集会施設", "滝野川会館", "次の一覧", "B201音楽スタジオ"],
  },
  {
    facilityName: "滝野川会館",
    roomName: "B202音楽スタジオ",
    links: ["集会施設", "滝野川会館", "次の一覧", "B202音楽スタジオ"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "カナリアホール",
    links: ["集会施設", "北とぴあ", "カナリアホール（定員110名）"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "スカイホール",
    links: ["集会施設", "北とぴあ", "スカイホール（定員138名）"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "ドームホール",
    links: ["集会施設", "北とぴあ", "ドームホール（定員150名）"],
  },
  {
    facilityName: "北とぴあ",
    roomName: "つつじホールリハーサル室",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "つつじホールリハーサル室（定員50名）",
    ],
  },
  {
    facilityName: "北とぴあ",
    roomName: "第1音楽スタジオ",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "第1音楽スタジオ（定員20名）",
    ],
  },
  {
    facilityName: "北とぴあ",
    roomName: "第2音楽スタジオ",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "第2音楽スタジオ（定員15名）",
    ],
  },
  {
    facilityName: "北とぴあ",
    roomName: "第3音楽スタジオ",
    links: [
      "集会施設",
      "北とぴあ",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "次の一覧",
      "第3音楽スタジオ（定員15名）",
    ],
  },
];

scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-kita",
      facility: facilityName,
      context: { roomName, links },
      sourceRef: "tokyo-kita/index.ts",
      page,
      label: title,
      prepare: () => prepare(page, links),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(roomName, eo),
      persist: (to) =>
        writeTestResult("tokyo-kita", `${facilityName}-${roomName}`, facilityName, to),
    });
  });
});
