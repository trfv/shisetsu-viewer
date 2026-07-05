import { test } from "@playwright/test";
import { runScrapeTarget, scrapeTestTitle } from "../common/scrapeTest.ts";
import { scraper } from "./index.ts";

for (const target of scraper.targets) {
  test(scrapeTestTitle(scraper, target), async ({ page }) => {
    await runScrapeTarget(scraper, target, page);
  });
}
