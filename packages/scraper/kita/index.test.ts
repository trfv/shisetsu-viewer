import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { addMonths, differenceInDays, endOfMonth } from "date-fns";
import { prepare, extract, transform } from "./index";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 14);
  return differenceInDays(endDate, startData) + 1;
}

const facilityNames = ["北とぴあ", "滝野川会館", "赤羽会館"];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    console.time(name);

    const searchPage = await prepare(page, name);
    const extractOutput = await extract(searchPage, calculateCount());
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);

    console.timeEnd(name);

    await fs.mkdir("test-results/kita", { recursive: true });
    await fs.writeFile(
      `test-results/kita/${name}.json`,
      JSON.stringify({ facility_name: name, data: transformOutput })
    );

    await searchPage.close();
    await page.close();
  });
});
