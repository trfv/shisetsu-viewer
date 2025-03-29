import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { prepare, extract, transform } from "./index";

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

    const searchPage = await prepare(page, name);
    const extractOutput = await extract(
      searchPage,
      format(new Date(), "yyyy-MM-dd"),
      calculateCount()
    );
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);

    console.timeEnd(name);

    await fs.mkdir("test-results/tokyo-sumida", { recursive: true });
    await fs.writeFile(
      `test-results/tokyo-sumida/${name}.json`,
      JSON.stringify({ facility_name: name, data: transformOutput })
    );

    await searchPage.close();
    await page.close();
  });
});
