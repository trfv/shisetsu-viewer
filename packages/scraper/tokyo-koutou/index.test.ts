import { test } from "@playwright/test";
import { addDays, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";

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
      await runScrapeTest({
        municipality: "tokyo-koutou",
        facility: name,
        context: { dateRangeStart: format(dateRange[0], "yyyyMM") },
        sourceRef: "tokyo-koutou/index.ts",
        page,
        label: title,
        prepare: () => prepare(page, name, dateRange[0], index),
        extract: (sp) => extract(sp, dateRange[2]),
        transform: (eo) => transform(eo),
        persist: (to) =>
          writeTestResult("tokyo-koutou", `${name}_${format(dateRange[0], "yyyyMM")}`, name, to),
      });
    });
  });
});
