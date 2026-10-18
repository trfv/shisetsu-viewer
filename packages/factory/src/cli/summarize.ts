// GH_TOKEN と GH_REPO が要る（手元では gh の認証とカレントリポジトリで代わる）
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { gh, ghJson } from "../gh.ts";
import { buildRunSummary, parseFailureRecord } from "../runSummary.ts";
import type { FailureRecordLite, JobInfo } from "../types.ts";

const { values } = parseArgs({
  options: {
    "run-id": { type: "string" },
    "failures-dir": { type: "string" },
    out: { type: "string" },
  },
});
const runId = values["run-id"];
const failuresDir = values["failures-dir"];
const out = values.out;
if (!runId || !failuresDir || !out) {
  console.error("usage: summarize.ts --run-id <id> --failures-dir <dir> --out <file>");
  process.exit(2);
}

function readRecords(dir: string): FailureRecordLite[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return readRecords(p);
    if (!entry.name.endsWith(".json")) return [];
    try {
      const record = parseFailureRecord(JSON.parse(fs.readFileSync(p, "utf8")));
      return record === null ? [] : [record];
    } catch {
      return [];
    }
  });
}

const run = ghJson<{ html_url: string; created_at: string }>([
  "api",
  `repos/{owner}/{repo}/actions/runs/${runId}`,
]);
const jobs = gh([
  "api",
  "--paginate",
  `repos/{owner}/{repo}/actions/runs/${runId}/jobs?per_page=100`,
  "--jq",
  ".jobs[] | {name, conclusion}",
])
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as JobInfo);

const summary = buildRunSummary(
  { runId: Number(runId), runUrl: run.html_url, createdAt: run.created_at },
  jobs,
  readRecords(failuresDir)
);
fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);

const stepSummary = process.env["GITHUB_STEP_SUMMARY"];
if (stepSummary) {
  const rows = summary.municipalities.map(
    (m) => `| ${m.municipality} | ${m.status} | ${m.failedFacilities.join("、")} |`
  );
  fs.appendFileSync(
    stepSummary,
    ["## 自治体別の結果", "", "| 自治体 | 状態 | 失敗施設 |", "|---|---|---|", ...rows, ""].join(
      "\n"
    )
  );
}
console.log(JSON.stringify(summary));
