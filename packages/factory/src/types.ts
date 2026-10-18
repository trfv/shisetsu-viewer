// "municipality" は自治体キーではなくスクレイパーのディレクトリ名（例 tokyo-kita-cocokita）
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

export interface ItemState {
  readonly consecutive: number;
  readonly lastRunId: number | null;
}

export interface WorkItem {
  readonly number: number;
  readonly key: string;
  readonly labels: readonly string[];
  readonly state: ItemState | null;
}

export type CiConclusion = "success" | "failure" | "pending";

export interface DependabotPr {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly ci: CiConclusion;
  readonly labels: readonly string[];
}

export interface MasterCi {
  readonly conclusion: string;
  readonly url: string;
}

export type Op =
  | {
      readonly type: "create";
      readonly key: string;
      readonly title: string;
      readonly body: string;
      readonly labels: readonly string[];
      readonly assignOwner: boolean;
    }
  | {
      readonly type: "edit";
      readonly number: number;
      readonly body: string | null;
      readonly addLabels: readonly string[];
      readonly removeLabels: readonly string[];
      readonly assignOwner: boolean;
      readonly comment: string | null;
    }
  | { readonly type: "close"; readonly number: number; readonly comment: string };
