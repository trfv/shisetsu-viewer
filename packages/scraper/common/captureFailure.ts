import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import type { FailedStep, FailureRecord } from "./failureTypes.ts";
import { classifyFailure } from "./classifyFailure.ts";

export interface CaptureFailureInput {
  municipality: string;
  facility: string;
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

export async function captureFailure(input: CaptureFailureInput): Promise<FailureRecord> {
  const validationErrors = input.validationErrors ?? [];
  const classification = classifyFailure(input.failedStep, input.error, validationErrors);
  const baseDir = input.baseDir ?? "test-results";
  const roomName = typeof input.context["roomName"] === "string" ? input.context["roomName"] : "";
  const slug = [slugify(input.facility), slugify(roomName)].filter(Boolean).join("-") || "failure";
  const dir = path.join(baseDir, input.municipality, "_failures");
  await fs.mkdir(dir, { recursive: true });

  let domSnapshotPath: string | null = null;
  let screenshotPath: string | null = null;
  const page = input.page;
  if (page) {
    // スナップショットはベストエフォート。元のエラーを決してマスクしない。
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

  const error = input.error;
  const record: FailureRecord = {
    municipality: input.municipality,
    facility: input.facility,
    context: input.context,
    failedStep: input.failedStep,
    classification,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? (error.stack ?? null) : null,
    validationErrors,
    domSnapshotPath,
    screenshotPath,
    sourceRef: input.sourceRef,
    capturedAt: (input.now ?? (() => new Date()))().toISOString(),
  };
  await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(record, null, 2));
  return record;
}
