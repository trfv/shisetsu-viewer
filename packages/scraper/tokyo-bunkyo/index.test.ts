import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startDate = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startDate), 7);
  return differenceInWeeks(endDate, startDate) + 1;
}

const facilityNames = [
  "男女平等センター",
  "大原地域活動センター",
  "駒込地域活動センター",
  "不忍通りふれあい館",
  "福祉センター江戸川橋",
  "勤労福祉会館",
  "シビックホール大ホール",
  "シビックホール小ホール",
  "シビックホールその他施設",
  "アカデミー文京",
  "アカデミー湯島",
  "アカデミー音羽",
  "アカデミー茗台",
  "アカデミー向丘",
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

    await writeTestResult("tokyo-bunkyo", name, name, transformOutput);

    await searchPage.close();
    await page.close();
  });
});
