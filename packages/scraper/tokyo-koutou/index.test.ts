import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { addDays, endOfMonth, format } from "date-fns";
import { prepare, extract, transform } from "./index";

function buildDateRanges(): [Date, Date, number][] {
  let tmp = new Date();
  const ret: [Date, Date, number][] = [];
  for (let i = 0; i < 5; i++) {
    const end = endOfMonth(tmp);
    ret.push([tmp, end, end.getDate() - tmp.getDate() + 1]);
    tmp = addDays(end, 1);
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
];

const dateRanges = buildDateRanges();

facilityNames.forEach((name) => {
  dateRanges.forEach((dateRange, index) => {
    const title = `${name} (${index + 1} / ${dateRanges.length})`;
    test(title, async ({ page }) => {
      console.time(title);

      let searchPage;
      try {
        searchPage = await prepare(page, name, dateRange[0], index);
      } catch (e) {
        console.error(`Failed to prepare page for ${title}, and skip to next.`);
        throw e;
      }
      const extractOutput = await extract(searchPage, dateRange[2]);
      expect(extractOutput.length).toBeGreaterThan(0);
      const transformOutput = await transform(extractOutput);
      expect(transformOutput.length).toBeGreaterThan(0);

      console.timeEnd(title);

      await fs.mkdir("test-results/tokyo-koutou", { recursive: true });
      await fs.writeFile(
        `test-results/tokyo-koutou/${name}_${format(dateRange[0], "yyyyMM")}.json`,
        JSON.stringify({ facility_name: name, data: transformOutput })
      );

      await searchPage.close();
      await page.close();
    });
  });
});
