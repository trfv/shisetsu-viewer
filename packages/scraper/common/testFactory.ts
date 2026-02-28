import fs from "fs/promises";
import { test, expect, type Page } from "@playwright/test";
import type { ScraperModule } from "@shisetsu-viewer/shared";
import { validateTransformOutput } from "./validation.ts";

/**
 * Creates Playwright tests for scrapers that follow the standard pattern:
 *   prepare(page, facilityName) → extract(page, count) → transform(output)
 *
 * Scrapers with non-standard signatures (e.g. tokyo-chuo, kanagawa-kawasaki)
 * should continue to use hand-written test files.
 */
export function createScraperTests<ExtractOutput extends { length: number }>(options: {
  outputDir: string;
  facilityNames: string[];
  scraper: ScraperModule<ExtractOutput, Page>;
  calculateCount: () => number;
}) {
  const { outputDir, facilityNames, scraper, calculateCount } = options;

  facilityNames.forEach((name) => {
    test(name, async ({ page }) => {
      console.time(name);

      let searchPage: Page;
      try {
        searchPage = await scraper.prepare(page, name);
      } catch (e) {
        console.error(`Failed to prepare page for ${name}, and skip to next.`);
        throw e;
      }
      const extractOutput = await scraper.extract(searchPage, calculateCount());
      expect(extractOutput.length).toBeGreaterThan(0);
      const transformOutput = await scraper.transform(extractOutput);
      expect(transformOutput.length).toBeGreaterThan(0);
      expect(validateTransformOutput(transformOutput)).toEqual([]);

      console.timeEnd(name);

      await fs.mkdir(`test-results/${outputDir}`, { recursive: true });
      await fs.writeFile(
        `test-results/${outputDir}/${name}.json`,
        JSON.stringify({ facility_name: name, data: transformOutput })
      );

      await searchPage.close();
      await page.close();
    });
  });
}
