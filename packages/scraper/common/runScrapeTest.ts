import type { Page } from "@playwright/test";

import { captureFailure, clearFailure } from "./captureFailure.ts";
import { MaintenanceWindowError, PartialExtractionError } from "./errors.ts";
import type { FailedStep } from "./failureTypes.ts";
import { isWithinMaintenanceWindow } from "./maintenanceWindow.ts";
import {
  drainPaginationEvents,
  resetPaginationEvents,
  type PaginationTruncation,
} from "./paginate.ts";
import type { TransformOutput } from "./types.ts";
import { validateTransformOutput } from "./validation.ts";

/** 季節休館などのノイズで誤検出せず、構造変化で半減以上欠落するケースは拾う下限 */
const PARTIAL_EXTRACTION_THRESHOLD = 0.5;

export interface RunScrapeTestOptions<E extends { length: number }> {
  municipality: string;
  facility: string;
  /** roomName キーは失敗レコードの slug 生成に使われる */
  context: Record<string, unknown>;
  sourceRef: string;
  page: Page;
  label?: string;
  prepare: () => Promise<Page>;
  extract: (searchPage: Page) => Promise<E>;
  transform: (extractOutput: E) => Promise<TransformOutput>;
  persist: (transformOutput: TransformOutput) => Promise<void>;
  baseDir?: string;
  expectedDateCount?: number;
  /** [開始時, 終了時)（JST の時） */
  maintenanceWindowJst?: readonly [number, number];
  now?: Date;
}

export async function runScrapeTest<E extends { length: number }>(
  opts: RunScrapeTestOptions<E>
): Promise<void> {
  const { municipality, facility, context, sourceRef, page, baseDir } = opts;
  const label = opts.label ?? facility;
  console.time(label);

  let searchPage: Page | undefined;
  let step: FailedStep = "prepare";
  let validationErrors: string[] = [];
  let truncations: PaginationTruncation[] = [];
  resetPaginationEvents();
  try {
    if (
      opts.maintenanceWindowJst &&
      isWithinMaintenanceWindow(opts.maintenanceWindowJst, opts.now ?? new Date())
    ) {
      const [start, end] = opts.maintenanceWindowJst;
      throw new MaintenanceWindowError(
        `${label}: within site maintenance window (${start}:00-${end}:00 JST)`
      );
    }
    searchPage = await opts.prepare();
    step = "extract";
    const extractOutput = await opts.extract(searchPage);
    truncations = drainPaginationEvents();
    if (extractOutput.length === 0) {
      throw new Error(`extract returned no rows for ${label}`);
    }
    step = "transform";
    const transformOutput = await opts.transform(extractOutput);
    if (transformOutput.length === 0) {
      throw new Error(`transform produced no records for ${label}`);
    }
    step = "validate";
    validationErrors = validateTransformOutput(transformOutput);
    if (validationErrors.length > 0) {
      throw new Error(`validation failed for ${label}: ${validationErrors.join("; ")}`);
    }
    if (opts.expectedDateCount !== undefined && opts.expectedDateCount > 0) {
      const distinctDates = new Set(transformOutput.map((r) => r.date)).size;
      const ratio = distinctDates / opts.expectedDateCount;
      if (ratio < PARTIAL_EXTRACTION_THRESHOLD) {
        const cause = truncations.at(-1);
        const causeSuffix = cause
          ? ` (pagination aborted at page ${cause.page} during ${cause.phase}: ${cause.message})`
          : "";
        throw new PartialExtractionError(
          `partial extraction for ${label}: covered ${distinctDates}/${opts.expectedDateCount} expected days (${Math.round(ratio * 100)}%, threshold ${Math.round(PARTIAL_EXTRACTION_THRESHOLD * 100)}%)${causeSuffix}`
        );
      }
    }
    console.timeEnd(label);

    step = "persist";
    await opts.persist(transformOutput);
    await clearFailure({
      municipality,
      facility,
      context,
      ...(baseDir !== undefined && { baseDir }),
    });
  } catch (e) {
    // extract で throw した場合はまだ drain していない
    if (truncations.length === 0) truncations = drainPaginationEvents();
    const failureContext =
      truncations.length > 0 ? { ...context, paginationTruncations: truncations } : context;
    await captureFailure({
      municipality,
      facility,
      context: failureContext,
      failedStep: step,
      error: e,
      validationErrors,
      sourceRef,
      page: searchPage ?? page,
      ...(baseDir !== undefined && { baseDir }),
    });
    throw e;
  } finally {
    if (searchPage) await searchPage.close().catch(() => {});
    if (searchPage !== page) await page.close().catch(() => {});
  }
}
