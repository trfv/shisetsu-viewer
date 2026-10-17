/**
 * factory の制御層。状態を読み、作業項目 Issue への操作を計算して適用する。
 *
 * 使い方: node packages/factory/src/cli/reconcile.ts [--dry-run]
 * 環境変数: FACTORY_MODE（off | observe | on、既定 observe）、FACTORY_OWNER（needs-human の assign 先）、
 *           GH_TOKEN、GH_REPO
 */
import { applyOps, ensureLabels } from "../applyOps.ts";
import {
  downloadRunSummary,
  latestMasterCi,
  listDependabotPrs,
  listFactoryItems,
  listScheduledScraperRuns,
} from "../gh.ts";
import { reconcile, THRESHOLD } from "../reconcile.ts";
import type { RunSummary } from "../types.ts";

// 連続回数を閾値より少し長く数えられるだけの run を読む。
const SUMMARY_WINDOW = THRESHOLD + 4;

const mode = process.env["FACTORY_MODE"] || "observe";
const owner = process.env["FACTORY_OWNER"];
const dryRun = process.argv.includes("--dry-run");

if (mode === "off") {
  console.log("FACTORY_MODE=off のため何もしない");
  process.exit(0);
}
if (mode !== "observe") {
  console.warn(`FACTORY_MODE=${mode} はフェーズ 2 では observe として扱う`);
}
if (!owner) {
  console.error("FACTORY_OWNER が未設定");
  process.exit(2);
}

const summaries = listScheduledScraperRuns(SUMMARY_WINDOW)
  .map((run) => downloadRunSummary(run.databaseId))
  .filter((s): s is RunSummary => s !== null);

const ops = reconcile({
  summaries,
  masterCi: latestMasterCi(),
  dependabotPrs: listDependabotPrs(),
  items: listFactoryItems(),
});

console.log(`summaries=${summaries.map((s) => s.runId).join(",") || "(none)"} ops=${ops.length}`);
console.log(JSON.stringify(ops, null, 2));
if (!dryRun) {
  ensureLabels();
  applyOps(ops, owner);
}
