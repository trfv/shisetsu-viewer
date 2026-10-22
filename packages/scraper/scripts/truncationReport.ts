import fs from "node:fs";
import path from "node:path";

import type { TruncationRecord } from "../common/truncationRecord.ts";
import {
  buildTruncationReport,
  type CollectedTruncation,
  parseArtifactName,
  type ShardRef,
} from "../common/truncationReport.ts";

const [dir, retriedJson, out] = process.argv.slice(2);
if (!dir || !retriedJson || !out) {
  console.error(
    "usage: node scripts/truncationReport.ts <artifacts-dir> <retried-shards-json> <out>"
  );
  process.exit(2);
}

function jsonFiles(p: string): string[] {
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => {
    const child = path.join(p, e.name);
    if (e.isDirectory()) return jsonFiles(child);
    return e.name.endsWith(".json") ? [child] : [];
  });
}

const collected: CollectedTruncation[] = [];
const artifacts = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
for (const artifact of artifacts) {
  const shard = artifact.isDirectory() ? parseArtifactName(artifact.name) : null;
  if (!shard) continue;
  for (const file of jsonFiles(path.join(dir, artifact.name))) {
    try {
      const record = JSON.parse(fs.readFileSync(file, "utf8")) as TruncationRecord;
      if (Array.isArray(record.truncations)) collected.push({ ...shard, record });
    } catch {}
  }
}

const retried = JSON.parse(retriedJson) as ShardRef[];
fs.writeFileSync(out, buildTruncationReport(collected, retried) ?? "");
