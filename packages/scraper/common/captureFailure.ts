import fs from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

import { classifyFailure } from "./classifyFailure.ts";
import type { FailedStep, FailureClassification, FailureRecord } from "./failureTypes.ts";

export interface CaptureFailureInput {
  municipality: string;
  facility: string;
  /**
   * 失敗時の任意コンテキスト（修復エージェントが読む）。`roomName` キーが
   * 文字列で存在する場合はファイル名の slug 生成に使われる。
   */
  context: Record<string, unknown>;
  failedStep: FailedStep;
  error: unknown;
  sourceRef: string;
  validationErrors?: string[];
  page?: Page;
  baseDir?: string;
  now?: () => Date;
}

function slugify(value: string): string {
  return value.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
}

function recordSlug(facility: string, context: Record<string, unknown>): string {
  const roomName = typeof context["roomName"] === "string" ? context["roomName"] : "";
  return [slugify(facility), slugify(roomName)].filter(Boolean).join("-") || "failure";
}

function safeErrorMessage(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error);
  } catch {
    return "<unstringifiable error>";
  }
}

export async function captureFailure(input: CaptureFailureInput): Promise<FailureRecord> {
  const validationErrors = input.validationErrors ?? [];
  let classification: FailureClassification;
  try {
    classification = classifyFailure(input.failedStep, input.error, validationErrors);
  } catch {
    classification = "unknown";
  }
  const baseDir = input.baseDir ?? "test-results";
  const slug = recordSlug(input.facility, input.context);
  const dir = path.join(baseDir, input.municipality, "_failures");

  let domSnapshotPath: string | null = null;
  let screenshotPath: string | null = null;
  const page = input.page;

  // 永続化はすべてベストエフォート。capture は元のスクレイパー失敗を決してマスク
  // してはならないため、ここから先の IO 例外はすべて握りつぶす。
  try {
    await fs.mkdir(dir, { recursive: true });
    if (page) {
      try {
        const html = await page.content();
        const p = path.join(dir, `${slug}.html`);
        await fs.writeFile(p, html);
        domSnapshotPath = p;
      } catch {
        domSnapshotPath = null;
      }
      try {
        const p = path.join(dir, `${slug}.png`);
        await page.screenshot({ path: p, fullPage: true });
        screenshotPath = p;
      } catch {
        screenshotPath = null;
      }
    }
  } catch {
    // ディレクトリ作成に失敗した場合はスナップショットなしで続行する。
  }

  const error = input.error;
  const now = input.now ?? (() => new Date());
  const record: FailureRecord = {
    municipality: input.municipality,
    facility: input.facility,
    context: input.context,
    failedStep: input.failedStep,
    classification,
    errorMessage: safeErrorMessage(error),
    errorStack: error instanceof Error ? (error.stack ?? null) : null,
    validationErrors,
    domSnapshotPath,
    screenshotPath,
    sourceRef: input.sourceRef,
    capturedAt: now().toISOString(),
  };

  try {
    await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(record, null, 2));
  } catch {
    // JSON 書き出し失敗も握りつぶす（テストは別途 red になるため検知は失われない）。
  }
  return record;
}

export async function clearFailure(input: {
  municipality: string;
  facility: string;
  context: Record<string, unknown>;
  baseDir?: string;
}): Promise<void> {
  const baseDir = input.baseDir ?? "test-results";
  const slug = recordSlug(input.facility, input.context);
  const dir = path.join(baseDir, input.municipality, "_failures");
  try {
    await Promise.all(
      ["json", "html", "png"].map((ext) => fs.rm(path.join(dir, `${slug}.${ext}`), { force: true }))
    );
  } catch {
    // ベストエフォート。成功パスから呼ばれるため、削除失敗で合格テストを落とさない。
  }
}
