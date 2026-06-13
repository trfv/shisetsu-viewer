export type FailedStep = "prepare" | "extract" | "transform" | "validate";

export type FailureClassification = "transient" | "structural" | "unknown";

export interface FailureRecord {
  municipality: string;
  facility: string;
  context: Record<string, unknown>;
  failedStep: FailedStep;
  classification: FailureClassification;
  errorMessage: string;
  errorStack: string | null;
  validationErrors: string[];
  domSnapshotPath: string | null;
  screenshotPath: string | null;
  sourceRef: string;
  capturedAt: string;
}
