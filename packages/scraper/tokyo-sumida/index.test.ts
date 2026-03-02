import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
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
    console.time(name);

    let searchPage;
    try {
      searchPage = await prepare(page, name);
    } catch (e) {
      console.error(`Failed to prepare page for ${name}, and skip to next.`);
      throw e;
    }
    const extractOutput = await extract(
      searchPage,
      format(new Date(), "yyyy-MM-dd"),
      calculateCount()
    );
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(name);

    await writeTestResult("tokyo-sumida", name, name, transformOutput);

    await searchPage.close();
    await page.close();
  });
});
