import type { Page } from "@playwright/test";

import type { DiscoveredTarget } from "./discover.ts";
import type { HorizonSpec } from "./horizon.ts";
import type { TransformOutput } from "./types.ts";

interface OutputFile {
  fileName: string;
  /** updateReservations が institution 解決に使う */
  facilityName: string;
  data: TransformOutput;
}

export interface ScraperDefinition<T, E> {
  municipality: string;
  targets: readonly T[];
  horizon: HorizonSpec | ((target: T) => number);
  facility: (target: T) => string;
  title?: (target: T) => string;
  /** roomName キーは失敗レコードの slug 生成に使われる */
  context?: (target: T) => Record<string, unknown>;
  prepare: (page: Page, target: T) => Promise<Page>;
  extract: (page: Page, target: T, pageCount: number) => Promise<E>;
  transform: (extracted: E, target: T) => TransformOutput | Promise<TransformOutput>;
  outputs?: (data: TransformOutput, target: T) => OutputFile[];
  expectedDateCount?: (target: T, pageCount: number) => number;
  discover?: (page: Page) => Promise<DiscoveredTarget[]>;
}

export function defineScraper<T, E>(definition: ScraperDefinition<T, E>): ScraperDefinition<T, E> {
  return definition;
}
