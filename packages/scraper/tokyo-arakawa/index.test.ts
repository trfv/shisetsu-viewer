import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { addMonths, differenceInDays, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation";
import { prepare, extract, transform } from "./index";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 13);
  return differenceInDays(endDate, startData) + 1;
}

const facilityNames = [
  "三河島ひろば館",
  // "熊野前ひろば館",
  // "宮地ひろば館",
  "石浜ふれあい館",
  "南千住ふれあい館",
  // "南千住駅前ふれあい館",
  "汐入ふれあい館",
  "峡田ふれあい館",
  "荒川山吹ふれあい館",
  "町屋ふれあい館",
  "荒木田ふれあい館",
  "尾久ふれあい館",
  "西尾久ふれあい館",
  "東日暮里ふれあい館",
  "夕やけこやけふれあい館",
  "西日暮里ふれあい館",
  "東尾久本町通りふれあい館",
  "ひぐらしふれあい館",
  "アクト２１",
  "生涯学習センター",
  "町屋文化センター",
  "アクロスあらかわ",
  "ムーブ町屋",
  "日暮里サニーホール",
  "サンパール荒川",
];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    console.time(name);

    let searchPage;
    try {
      searchPage = await prepare(page, name);
    } catch (e) {
      console.error(`Failed to prepare page for ${name}, and skip to next.`);
      throw e;
    }
    const extractOutput = await extract(searchPage, calculateCount());
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(name);

    await fs.mkdir("test-results/tokyo-arakawa", { recursive: true });
    await fs.writeFile(
      `test-results/tokyo-arakawa/${name}.json`,
      JSON.stringify({ facility_name: name, data: transformOutput })
    );

    await searchPage.close();
    await page.close();
  });
});
