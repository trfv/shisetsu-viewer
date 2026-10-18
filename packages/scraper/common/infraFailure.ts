import type { FailureRecord } from "./failureTypes.ts";

/** run-summary が通常の失敗レコードと同じ形で読んで infra と判定する */
export function buildInfraFailureRecord(input: {
  municipality: string;
  reason: string;
  now: Date;
}): FailureRecord {
  return {
    municipality: input.municipality,
    facility: "(国内 proxy)",
    context: {},
    failedStep: "prepare",
    classification: "infra",
    errorMessage: input.reason,
    errorStack: null,
    validationErrors: [],
    domSnapshotPath: null,
    screenshotPath: null,
    sourceRef: "",
    capturedAt: input.now.toISOString(),
  };
}
