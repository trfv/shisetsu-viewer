import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startData), 5);
  return differenceInDays(endDate, startData) + 1;
}

type ScrapeTarget = {
  facilityName: string;
  roomName: string;
  category: string;
  buildingName: string;
  siteRoomName?: string;
};

const scrapeTargets: ScrapeTarget[] = [
  // 集会室・会議室
  {
    facilityName: "池上文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "池上文化センター",
  },
  {
    facilityName: "糀谷文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "糀谷文化センター",
  },
  {
    facilityName: "萩中文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "萩中文化センター",
  },
  {
    facilityName: "嶺町文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "嶺町文化センター",
  },
  {
    facilityName: "嶺町文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "嶺町文化センター",
  },
  {
    facilityName: "雪谷文化センター",
    roomName: "第一集会室",
    category: "集会室・会議室",
    buildingName: "雪谷文化センター",
  },
  {
    facilityName: "雪谷文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "雪谷文化センター",
  },
  // 音楽室
  {
    facilityName: "大田区民ホール・アプリコ",
    roomName: "Aスタジオ",
    siteRoomName: "Ａスタジオ",
    category: "音楽室",
    buildingName: "大田区民ホール・アプリコ",
  },
  {
    facilityName: "大田区民ホール・アプリコ",
    roomName: "Bスタジオ",
    siteRoomName: "Ｂスタジオ",
    category: "音楽室",
    buildingName: "大田区民ホール・アプリコ",
  },
  {
    facilityName: "大田文化の森",
    roomName: "第一音楽スタジオ",
    category: "音楽室",
    buildingName: "大田文化の森",
  },
  {
    facilityName: "大田文化の森",
    roomName: "第二音楽スタジオ",
    category: "音楽室",
    buildingName: "大田文化の森",
  },
  {
    facilityName: "大田文化の森",
    roomName: "第三音楽スタジオ",
    category: "音楽室",
    buildingName: "大田文化の森",
  },
  // スタジオ
  {
    facilityName: "大田区民プラザ",
    roomName: "第一音楽スタジオ",
    category: "スタジオ",
    buildingName: "大田区民プラザ",
  },
  {
    facilityName: "大田区民プラザ",
    roomName: "第二音楽スタジオ",
    category: "スタジオ",
    buildingName: "大田区民プラザ",
  },
  // リハーサル室
  {
    facilityName: "大田区民プラザ",
    roomName: "リハーサル室",
    category: "リハーサル室",
    buildingName: "大田区民プラザ",
  },
  // ホール
  {
    facilityName: "大田区民ホール・アプリコ",
    roomName: "小ホール",
    category: "ホール",
    buildingName: "大田区民ホール・アプリコ",
  },
  {
    facilityName: "大田文化の森",
    roomName: "ホール",
    category: "ホール",
    buildingName: "大田文化の森",
  },
  {
    facilityName: "新蒲田区民活動施設",
    roomName: "多目的室（大）",
    category: "ホール",
    buildingName: "新蒲田区民活動施設",
  },
  // 多目的室
  {
    facilityName: "田園調布せせらぎ館",
    roomName: "第一多目的室A",
    siteRoomName: "第一多目的室Ａ",
    category: "多目的室",
    buildingName: "田園調布せせらぎ館",
  },
  {
    facilityName: "田園調布せせらぎ館",
    roomName: "第一多目的室B",
    siteRoomName: "第一多目的室Ｂ",
    category: "多目的室",
    buildingName: "田園調布せせらぎ館",
  },
  {
    facilityName: "田園調布せせらぎ館",
    roomName: "第二多目的室",
    category: "多目的室",
    buildingName: "田園調布せせらぎ館",
  },
  // 和室
  {
    facilityName: "雪谷文化センター",
    roomName: "和室",
    category: "和室",
    buildingName: "雪谷文化センター",
  },
];

scrapeTargets.forEach((target) => {
  const { facilityName, roomName, category, buildingName, siteRoomName } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    console.time(title);

    let searchPage;
    try {
      searchPage = await prepare(page, category, buildingName, siteRoomName ?? roomName);
    } catch (e) {
      console.error(`Failed to prepare page for ${title}, and skip to next.`);
      throw e;
    }
    const extractOutput = await extract(searchPage, calculateCount());
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(roomName, extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(title);

    await writeTestResult(
      "tokyo-ota",
      `${facilityName}-${roomName}`,
      facilityName,
      transformOutput
    );

    await searchPage.close();
    await page.close();
  });
});
