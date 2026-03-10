import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startDate = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startDate), 7);
  return Math.ceil(differenceInWeeks(endDate, startDate) / 2) + 1;
}

const facilityNames = [
  "池袋本町第一区民集会室",
  "区民ひろば西巣鴨第一",
  "区民ひろば富士見台",
  "区民ひろば南池袋",
  "駒込地域文化創造館",
  "巣鴨地域文化創造館",
  "雑司が谷公園丘の上テラス",
  "雑司が谷地域文化創造館",
  "高田第一区民集会室",
  "千早地域文化創造館",
  "としま区民センター",
  "としま産業振興プラザ※イケビズ",
  "ふるさと千川館",
  "南大塚地域文化創造館",
  "南長崎第一区民集会室",
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
      format(new Date(), "yyyy/M/d"),
      calculateCount()
    );
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(name);

    await writeTestResult("tokyo-toshima", name, name, transformOutput);

    await searchPage.close();
    await page.close();
  });
});
