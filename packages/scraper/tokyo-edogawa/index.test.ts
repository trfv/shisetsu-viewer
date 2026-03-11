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

const scrapeTargets = [
  // 地域施設・図書館
  { facilityName: "松江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "一之江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "コミュニティプラザ一之江", category: "地域施設・図書館" },
  { facilityName: "松江区民プラザ", category: "地域施設・図書館" },
  { facilityName: "松島コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "グリーンパレス", category: "地域施設・図書館" },
  { facilityName: "文化スポーツプラザ", category: "地域施設・図書館" },
  { facilityName: "小松川区民館", category: "地域施設・図書館" },
  { facilityName: "小松川さくらホール", category: "地域施設・図書館" },
  { facilityName: "平井コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "中平井コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "葛西区民館", category: "地域施設・図書館" },
  { facilityName: "船堀コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "北葛西コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "二之江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "南葛西会館", category: "地域施設・図書館" },
  { facilityName: "新田コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "清新町コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "臨海町コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "東葛西コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "長島桑川コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "新川さくら館", category: "地域施設・図書館" },
  { facilityName: "小岩区民館", category: "地域施設・図書館" },
  { facilityName: "小岩アーバンプラザ", category: "地域施設・図書館" },
  { facilityName: "西小岩コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "北小岩コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "南小岩コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "上一色コミュニティセンター", category: "地域施設・図書館" },
  { facilityName: "東部区民館", category: "地域施設・図書館" },
  { facilityName: "東部フレンドホール", category: "地域施設・図書館" },
  { facilityName: "瑞江コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "江戸川コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "鹿骨区民館", category: "地域施設・図書館" },
  { facilityName: "篠崎コミュニティ会館", category: "地域施設・図書館" },
  { facilityName: "篠崎コミュニティホール", category: "地域施設・図書館" },
  { facilityName: "篠崎文化プラザ", category: "地域施設・図書館" },
  { facilityName: "西葛西図書館", category: "地域施設・図書館" },
  { facilityName: "小岩図書館", category: "地域施設・図書館" },
  // 大型文化施設
  { facilityName: "総合文化センター", category: "大型文化施設" },
  { facilityName: "タワーホール船堀", category: "大型文化施設" },
];

scrapeTargets.forEach((target) => {
  const { facilityName, category } = target;
  test(facilityName, async ({ page }) => {
    console.time(facilityName);

    let searchPage;
    try {
      searchPage = await prepare(page, facilityName, category);
    } catch (e) {
      console.error(`Failed to prepare page for ${facilityName}, and skip to next.`);
      throw e;
    }
    const extractOutput = await extract(searchPage, calculateCount());
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(facilityName);

    const roomNames = [...new Set(transformOutput.map((t) => t.room_name))];
    for (const roomName of roomNames) {
      const roomData = transformOutput.filter((t) => t.room_name === roomName);
      await writeTestResult("tokyo-edogawa", `${facilityName}-${roomName}`, facilityName, roomData);
    }

    await page.close();
  });
});
