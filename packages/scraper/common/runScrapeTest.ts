import type { Page } from "@playwright/test";
import type { TransformOutput } from "./types.ts";
import type { FailedStep } from "./failureTypes.ts";
import { validateTransformOutput } from "./validation.ts";
import { captureFailure, clearFailure } from "./captureFailure.ts";

export interface RunScrapeTestOptions<E extends { length: number }> {
  /** 自治体スラッグ（例 "tokyo-arakawa"）。 */
  municipality: string;
  /** 施設名。FailureRecord.facility / clearFailure のキーになる。 */
  facility: string;
  /**
   * 失敗時に修復エージェントが読むコンテキスト。`roomName` キーが文字列なら
   * 失敗レコードの slug 生成に使われる（captureFailure 側の仕様）。
   */
  context: Record<string, unknown>;
  /** 壊れた可能性が高いソースファイル（例 "tokyo-arakawa/index.ts"）。 */
  sourceRef: string;
  /** テストの root page。capture のフォールバックと close に使う。 */
  page: Page;
  /** console.time のラベル。省略時は facility。 */
  label?: string;
  prepare: () => Promise<Page>;
  extract: (searchPage: Page) => Promise<E>;
  transform: (extractOutput: E) => Promise<TransformOutput>;
  persist: (transformOutput: TransformOutput) => Promise<void>;
  /** テスト用シーム。capture/clear の baseDir に委譲（既定 "test-results"）。 */
  baseDir?: string;
}

/**
 * 全自治体スクレイパーテスト共通の実行骨格。
 * prepare → extract → transform → validate → persist を実行し、成功時は失敗レコードを
 * 除去、失敗時は分類済みの失敗レコード（DOM/screenshot 付き）を保存して例外を再 throw する。
 */
export async function runScrapeTest<E extends { length: number }>(
  opts: RunScrapeTestOptions<E>
): Promise<void> {
  const { municipality, facility, context, sourceRef, page, baseDir } = opts;
  const label = opts.label ?? facility;
  console.time(label);

  let searchPage: Page | undefined;
  let step: FailedStep = "prepare";
  let validationErrors: string[] = [];
  try {
    searchPage = await opts.prepare();
    step = "extract";
    const extractOutput = await opts.extract(searchPage);
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
    await captureFailure({
      municipality,
      facility,
      context,
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
