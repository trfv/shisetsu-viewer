import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startData), 7);
  return differenceInWeeks(endDate, startData) + 1;
}

const facilityNames = [
  "社会福祉会館",
  "すみだ生涯学習センター",
  "曳舟文化センター",
  "みどりコミュニティセンター",
];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-sumida",
      facility: name,
      context: {},
      sourceRef: "tokyo-sumida/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy-MM-dd"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-sumida", name, name, to),
    });
  });
});
