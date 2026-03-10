import { test, expect } from "@playwright/test";
import { addMonths, differenceInCalendarWeeks, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 13);
  return differenceInCalendarWeeks(endDate, startData) + 1;
}

const scrapeTargets = [
  { facilityName: "国際交流センター", roomNames: ["ホール", "レセプションルーム"] },
  { facilityName: "すくらむ２１", roomNames: ["ホール"] },
  {
    facilityName: "ミューザ川崎シンフォニーホール",
    roomNames: ["音楽ホール", "市民交流室", "練習室１", "練習室３", "練習室２"],
  },
  { facilityName: "川崎市民プラザ", roomNames: ["ステージ", "ふるさと劇場"] },
  { facilityName: "産業振興会館", roomNames: ["ホール"] },
  {
    facilityName: "かわさき老人福祉・地域交流Ｃ",
    roomNames: ["大広間", "工作室", "多目的室", "ホール"],
  },
  { facilityName: "総合福祉センター（エポック）", roomNames: ["ホール"] },
  { facilityName: "幸市民館", roomNames: ["大ホール"] },
  {
    facilityName: "中原市民館",
    roomNames: ["音楽室", "視聴覚室", "第５会議室", "多目的ホール"],
  },
  { facilityName: "高津市民館", roomNames: ["大ホール"] },
  { facilityName: "宮前市民館", roomNames: ["大ホール"] },
  { facilityName: "多摩市民館", roomNames: ["視聴覚室", "大会議室", "大ホール"] },
  { facilityName: "麻生市民館", roomNames: ["大会議室", "大ホール"] },
  { facilityName: "川崎マリエン", roomNames: ["体育室"] },
  { facilityName: "とどろきアリーナ", roomNames: ["メインアリーナ"] },
  {
    facilityName: "カルッツかわさき",
    roomNames: [
      "アクトスタジオ",
      "音楽練習室１",
      "音楽練習室２",
      "ホール１階",
      "ホール１－３階",
      "ホール１－２階",
      "ホール練習利用",
    ],
  },
];

scrapeTargets.forEach(({ facilityName, roomNames }) => {
  test(facilityName, async ({ page }) => {
    console.time(facilityName);

    let searchPage;
    try {
      searchPage = await prepare(page, facilityName, new Date());
    } catch (e) {
      console.error(`Failed to prepare page for ${facilityName}, and skip to next.`);
      throw e;
    }
    const extractOutput = await extract(searchPage, calculateCount(), facilityName, roomNames);
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput, facilityName);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(facilityName);

    await writeTestResult("kanagawa-kawasaki", facilityName, facilityName, transformOutput);

    await searchPage.close();
    await page.close();
  });
});
