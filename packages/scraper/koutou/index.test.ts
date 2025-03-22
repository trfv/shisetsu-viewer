import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { prepare, extract, transform } from "./index";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";

function buildDateRanges(): [Date, Date][] {
  let tmp = new Date();
  const ret: [Date, Date][] = [];
  for (let i = 0; i < 6; i++) {
    ret.push([tmp, endOfMonth(tmp)]);
    tmp = addMonths(startOfMonth(tmp), 1);
  }
  return ret;
}

const facilityNames = [
  "江東区文化センター",
  "東大島文化センター",
  "豊洲文化センター",
  "砂町文化センター",
  "森下文化センター",
  "古石場文化センター",
  "亀戸文化センター",
  "総合区民センター",
  "江東公会堂（ティアラこうとう）",
  "深川江戸資料館",
  "芭蕉記念館",
  "中川船番所資料館",
  "商工情報センター",
];

const dateRanges = buildDateRanges();

facilityNames.forEach((name) => {
  dateRanges.forEach((dateRange, index) => {
    const title = `${name} (${index + 1} / ${dateRanges.length})`;
    test(title, async ({ page }) => {
      console.time(title);
      console.log(`start scraping for ${title}`);

      const searchPage = await prepare(page, name, dateRange[0], index);
      const extractOutput = await extract(searchPage, dateRange[0], dateRange[1]);
      expect(extractOutput.length).toBeGreaterThan(1);
      const transformOutput = await transform(extractOutput);
      expect(transformOutput.length).toBeGreaterThan(1);

      console.log(`finish scraping for ${title}`);
      console.timeEnd(title);

      await fs.mkdir("test-results/koutou", { recursive: true });
      await fs.writeFile(
        `test-results/koutou/${name}_${format(dateRange[0], "yyyyMM")}.json`,
        JSON.stringify(transformOutput)
      );

      await searchPage.close();
      await page.close();
    });
  });
});
