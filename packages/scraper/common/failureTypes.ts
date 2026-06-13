export type FailedStep = "prepare" | "extract" | "transform" | "validate";

export type FailureClassification = "transient" | "structural" | "unknown";

export interface FailureRecord {
  readonly municipality: string;
  readonly facility: string;
  readonly context: Record<string, unknown>;
  readonly failedStep: FailedStep;
  readonly classification: FailureClassification;
  readonly errorMessage: string;
  readonly errorStack: string | null;
  readonly validationErrors: readonly string[];
  readonly domSnapshotPath: string | null;
  readonly screenshotPath: string | null;
  /** スクレイパーのソースファイルパス（例: "tokyo-kita/index.ts"） */
  readonly sourceRef: string;
  readonly capturedAt: string;
}
