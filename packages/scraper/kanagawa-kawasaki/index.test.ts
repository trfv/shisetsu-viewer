import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { addMonths, differenceInCalendarWeeks, endOfMonth } from "date-fns";
import { prepare, extract, transform } from "./index";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 13);
  return differenceInCalendarWeeks(endDate, startData) + 1;
}

const facilityNames = [
  "国際交流センター",
  "すくらむ２１",
  "ミューザ川崎シンフォニーホール",
  "川崎市民プラザ",
  "産業振興会館",
  "かわさき老人福祉・地域交流Ｃ",
  "総合福祉センター（エポック）",
  "幸市民館",
  "中原市民館",
  "高津市民館",
  "宮前市民館",
  "多摩市民館",
  "麻生市民館",
  "川崎マリエン",
  "とどろきアリーナ",
  "カルッツかわさき",
];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    console.time(name);

    const searchPage = await prepare(page, name, new Date());
    const extractOutput = await extract(searchPage, calculateCount());
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput, name);
    expect(transformOutput.length).toBeGreaterThan(0);

    console.timeEnd(name);

    await fs.mkdir("test-results/kanagawa-kawasaki", { recursive: true });
    await fs.writeFile(
      `test-results/kanagawa-kawasaki/${name}.json`,
      JSON.stringify({ facility_name: name, data: transformOutput })
    );

    await searchPage.close();
    await page.close();
  });
});
