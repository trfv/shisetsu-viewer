import { test, expect } from "@playwright/test";
import { addMonths, differenceInDays, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 14);
  return differenceInDays(endDate, startData) + 1;
}

const facilityNames = ["北とぴあ", "滝野川会館", "赤羽会館"];

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
    await writeTestResult("tokyo-kita", name, name, transformOutput);
    await searchPage.close();
    await page.close();
  });
});
