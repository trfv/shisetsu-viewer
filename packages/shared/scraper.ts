import type { TransformOutput } from "./types.ts";

/**
 * Standard scraper module interface for the most common pattern:
 *   prepare(page, facilityName) → extract(page, count) → transform(output)
 *
 * Page type is generic to avoid depending on @playwright/test in shared.
 * Not all scrapers conform to this exact interface (e.g. tokyo-chuo uses links,
 * kanagawa-kawasaki's transform takes facilityName). Those remain hand-written.
 */
export interface ScraperModule<ExtractOutput, Page = unknown> {
  prepare(page: Page, facilityName: string): Promise<Page>;
  extract(page: Page, maxCount: number): Promise<ExtractOutput>;
  transform(extractOutput: ExtractOutput): Promise<TransformOutput>;
}
