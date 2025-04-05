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

test.use({
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  actionTimeout: 5 * 60 * 1000,
  navigationTimeout: 5 * 60 * 1000,
});

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    console.time(name);

    page.on("request", (request) => {
      console.log(
        "Request:",
        JSON.stringify({
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          postData: request.postData(),
        })
      );
    });
    page.on("response", (response) => {
      console.log(
        "Response:",
        JSON.stringify({
          status: response.status(),
          url: response.url(),
          headers: response.headers(),
        })
      );
    });

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
