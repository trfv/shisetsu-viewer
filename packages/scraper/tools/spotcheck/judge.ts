import fs from "node:fs/promises";
import path from "node:path";

import {
  judgeSample,
  needsInvestigation,
  type ExpectedSample,
  type ObservedSample,
  type PlanSample,
  type SampleJudgement,
} from "./judgeReport.ts";

const OUT_DIR = path.join("test-results", "_spotcheck");

async function readJson<T>(file: string): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    console.error(
      `ERROR: ${file} を読めません（plan.ts → エージェント観測の順で実行してください）: ${String(e)}`
    );
    process.exit(2);
  }
}

const plan = await readJson<{ samples: PlanSample[] }>(path.join(OUT_DIR, "plan.json"));
const expected = await readJson<{ samples: ExpectedSample[] }>(path.join(OUT_DIR, "expected.json"));
const expectedById = new Map(expected.samples.map((s) => [s.id, s]));

const observedById = new Map<string, ObservedSample>();
const observedDir = path.join(OUT_DIR, "observed");
let observedFiles: string[] = [];
try {
  observedFiles = (await fs.readdir(observedDir)).filter((f) => f.endsWith(".json"));
} catch {
  // observed が 1 件も無いのは全滅（全 UNREACHABLE）として扱う。
}
for (const file of observedFiles) {
  const sample = await readJson<ObservedSample>(path.join(observedDir, file));
  observedById.set(sample.id, sample);
}

// エージェントの id タイプミスは黙って UNREACHABLE を招くので、捨てる前に可視化する。
const planIds = new Set(plan.samples.map((s) => s.id));
const orphanIds = [...observedById.keys()].filter((id) => !planIds.has(id));
if (orphanIds.length > 0) {
  console.warn(`WARN: plan.json に無い id の observed を無視しました: ${orphanIds.join(", ")}`);
}

const judgements: SampleJudgement[] = plan.samples.map((sample) =>
  judgeSample(sample, expectedById.get(sample.id), observedById.get(sample.id))
);

const counts: Record<string, number> = {};
for (const j of judgements) {
  counts[j.verdict] = (counts[j.verdict] ?? 0) + 1;
  const flag = needsInvestigation(j.verdict) ? "!" : " ";
  console.log(`${flag} ${j.verdict.padEnd(26)} ${j.id} ${j.detail}`);
}
const investigate = judgements.filter((j) => needsInvestigation(j.verdict)).length;

console.log(`SPOTCHECK_RESULT ${JSON.stringify({ judgements, counts, investigate })}`);
process.exit(investigate > 0 ? 1 : 0);
