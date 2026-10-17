// "municipality" は scraper.yml の municipality 入力と同じく、スクレイパーのディレクトリ名を指す
// （例 tokyo-kita-cocokita）。1 つの区に複数のスクレイパーがありうる。
export type MunicipalityStatus = "ok" | "transient" | "structural" | "unknown" | "infra";

export interface MunicipalitySummary {
  readonly municipality: string;
  readonly status: MunicipalityStatus;
  readonly failedFacilities: readonly string[];
}

export interface RunSummary {
  readonly runId: number;
  readonly runUrl: string;
  readonly createdAt: string;
  readonly municipalities: readonly MunicipalitySummary[];
}

export interface JobInfo {
  readonly name: string;
  readonly conclusion: string | null;
}

export type RecordClassification = "transient" | "structural" | "unknown" | "infra";

export interface FailureRecordLite {
  readonly municipality: string;
  readonly facility: string;
  readonly classification: RecordClassification;
}
