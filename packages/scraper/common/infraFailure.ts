import type { FailureRecord } from "./failureTypes.ts";

/**
 * Playwright に到達する前の経路断（国内 proxy の preflight 失敗など）を、
 * 通常の失敗レコードと同じ形で残す。run-summary はこれを見て infra と判定する。
 */
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
