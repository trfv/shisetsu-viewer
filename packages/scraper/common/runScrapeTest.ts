import type { Page } from "@playwright/test";
import type { TransformOutput } from "./types.ts";
import type { FailedStep } from "./failureTypes.ts";
import { validateTransformOutput } from "./validation.ts";
import { captureFailure, clearFailure } from "./captureFailure.ts";

/**
 * partial extraction 検出のしきい値。distinct date / expectedDateCount が
 * これを下回ると structural として throw する。初期値は緩めの 0.5。
 * 季節休館などのノイズで誤検出しない最低ラインで、サイト構造変化で半減
 * 以上欠落するケース（次へ進む不能・テーブル消失）はしっかり拾う。
 */
export const PARTIAL_EXTRACTION_THRESHOLD = 0.5;

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
  /**
   * 期待する distinct date 件数。指定時は validate 後に
   * `distinct(date) / expectedDateCount >= PARTIAL_EXTRACTION_THRESHOLD` を
   * 検証し、未満なら `partial extraction: ...` で throw（structural 分類）。
   * 各 scraper の calculateCount() などから渡す。
   */
  expectedDateCount?: number;
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
    if (opts.expectedDateCount !== undefined && opts.expectedDateCount > 0) {
      const distinctDates = new Set(transformOutput.map((r) => r.date)).size;
      const ratio = distinctDates / opts.expectedDateCount;
      if (ratio < PARTIAL_EXTRACTION_THRESHOLD) {
        throw new Error(
          `partial extraction for ${label}: covered ${distinctDates}/${opts.expectedDateCount} expected days (${Math.round(ratio * 100)}%, threshold ${Math.round(PARTIAL_EXTRACTION_THRESHOLD * 100)}%)`
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
