import type { Page } from "@playwright/test";
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";

import type { ScraperDefinition } from "./defineScraper.ts";
import { pagesForHorizon } from "./horizon.ts";
import { runScrapeTest } from "./runScrapeTest.ts";
import { writeTestResult } from "./testUtils.ts";

/**
 * ScraperDefinition の 1 target 分のテストタイトル。
 * 各自治体の index.test.ts はこの 2 つを使ってテストを生成する:
 *
 *   import { test } from "@playwright/test";
 *   import { runScrapeTarget, scrapeTestTitle } from "../common/scrapeTest.ts";
 *   import { scraper } from "./index.ts";
 *
 *   for (const target of scraper.targets) {
 *     test(scrapeTestTitle(scraper, target), async ({ page }) => {
 *       await runScrapeTarget(scraper, target, page);
 *     });
 *   }
 */
export function scrapeTestTitle<T, E>(def: ScraperDefinition<T, E>, target: T): string {
  return def.title?.(target) ?? def.facility(target);
}

/**
 * ScraperDefinition の 1 target 分を実行する
 * （prepare → extract → transform → validate → persist + 失敗キャプチャ）。
 */
export async function runScrapeTarget<T, E extends { length: number }>(
  def: ScraperDefinition<T, E>,
  target: T,
  page: Page
): Promise<void> {
  const facility = def.facility(target);
  const title = scrapeTestTitle(def, target);
  const pageCount =
    typeof def.horizon === "function" ? def.horizon(target) : pagesForHorizon(def.horizon);
  const expectedDateCount = def.expectedDateCount?.(target, pageCount);
  // registry の maintenanceWindowJst（"tokyo-ota" → slug "ota"）
  const slug = def.municipality.slice(def.municipality.indexOf("-") + 1);
  const maintenanceWindowJst = getMunicipalityBySlug(slug)?.maintenanceWindowJst;

  await runScrapeTest({
    municipality: def.municipality,
    facility,
    context: def.context?.(target) ?? {},
    sourceRef: `${def.municipality}/index.ts`,
    page,
    label: title,
    prepare: () => def.prepare(page, target),
    extract: (searchPage) => def.extract(searchPage, target, pageCount),
    transform: async (extracted) => def.transform(extracted, target),
    persist: async (data) => {
      const files = def.outputs?.(data, target) ?? [
        { fileName: facility, facilityName: facility, data },
      ];
      for (const file of files) {
        await writeTestResult(def.municipality, file.fileName, file.facilityName, file.data);
      }
    },
    ...(expectedDateCount !== undefined && { expectedDateCount }),
    ...(maintenanceWindowJst !== undefined && { maintenanceWindowJst }),
  });
}
