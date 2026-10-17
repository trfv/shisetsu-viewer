import type {
  FailureRecordLite,
  JobInfo,
  MunicipalityStatus,
  MunicipalitySummary,
  RecordClassification,
  RunSummary,
} from "./types.ts";

// scraper.yml のジョブ名。prepare_retry も同じ形を前提にしている。
const SCRAPE_RE = /^Scrape (\S+) \((\d+)\/(\d+)\)$/;
const RETRY_RE = /^Retry Scrape (\S+) \((\d+)\/(\d+)\)$/;

const CLASSIFICATIONS: readonly RecordClassification[] = [
  "transient",
  "structural",
  "unknown",
  "infra",
];

export function parseFailureRecord(value: unknown): FailureRecordLite | null {
  if (typeof value !== "object" || value === null) return null;
  const { municipality, facility, classification } = value as Record<string, unknown>;
  if (typeof municipality !== "string" || typeof facility !== "string") return null;
  if (!CLASSIFICATIONS.includes(classification as RecordClassification)) return null;
  return { municipality, facility, classification: classification as RecordClassification };
}

function statusFromRecords(records: readonly FailureRecordLite[]): MunicipalityStatus {
  if (records.some((r) => r.classification === "infra")) return "infra";
  if (records.some((r) => r.classification === "structural")) return "structural";
  // レコードの無い失敗（ジョブのタイムアウトやクラッシュ）は原因不明として扱い、ok にしない。
  if (records.length === 0 || records.some((r) => r.classification === "unknown")) {
    return "unknown";
  }
  return "transient";
}

/**
 * 1 回の Run Scraper のジョブ結果と retry 後の失敗レコードから、自治体別の状態を組み立てる。
 * scrape で落ちても retry で成功したシャードは成功とみなす。
 */
export function buildRunSummary(
  meta: { runId: number; runUrl: string; createdAt: string },
  jobs: readonly JobInfo[],
  records: readonly FailureRecordLite[]
): RunSummary {
  const retryConclusion = new Map<string, string | null>();
  for (const job of jobs) {
    const m = RETRY_RE.exec(job.name);
    if (m) retryConclusion.set(`${m[1]}#${m[2]}/${m[3]}`, job.conclusion);
  }

  const municipalities = new Set<string>();
  const failed = new Set<string>();
  for (const job of jobs) {
    const m = SCRAPE_RE.exec(job.name);
    if (!m) continue;
    const municipality = m[1] ?? "";
    municipalities.add(municipality);
    if (job.conclusion === "success" || job.conclusion === "skipped") continue;
    if (retryConclusion.get(`${municipality}#${m[2]}/${m[3]}`) === "success") continue;
    failed.add(municipality);
  }

  const summaries = [...municipalities].sort().map((municipality): MunicipalitySummary => {
    if (!failed.has(municipality)) return { municipality, status: "ok", failedFacilities: [] };
    const own = records.filter((r) => r.municipality === municipality);
    return {
      municipality,
      status: statusFromRecords(own),
      failedFacilities: [...new Set(own.map((r) => r.facility))].sort(),
    };
  });
  return { ...meta, municipalities: summaries };
}
