import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ciFromRollup } from "./dependabot.ts";
import type { DependabotPr, MasterCi, RunSummary, WorkItem } from "./types.ts";
import { parseKey, parseState } from "./workItem.ts";

/** gh CLI を呼ぶ。{owner}/{repo} のプレースホルダは GH_REPO かカレントリポジトリで解決される。 */
export function gh(args: readonly string[], input?: string): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
}

export function ghJson<T>(args: readonly string[]): T {
  return JSON.parse(gh(args)) as T;
}

/** 定期実行の Run Scraper を新しい順に返す。 */
export function listScheduledScraperRuns(
  limit: number
): { databaseId: number; url: string; createdAt: string }[] {
  return ghJson([
    "run",
    "list",
    "--workflow",
    "scraper.yml",
    "--branch",
    "master",
    "--event",
    "schedule",
    "--status",
    "completed",
    "--limit",
    String(limit),
    "--json",
    "databaseId,url,createdAt",
  ]);
}

/** artifact run-summary を読む。run-summary 導入前の run や cancel された run では null。 */
export function downloadRunSummary(runId: number): RunSummary | null {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "run-summary-"));
  try {
    gh(["run", "download", String(runId), "-n", "run-summary", "-D", dir]);
    return JSON.parse(fs.readFileSync(path.join(dir, "run-summary.json"), "utf8")) as RunSummary;
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function latestMasterCi(): MasterCi | null {
  const runs = ghJson<MasterCi[]>([
    "run",
    "list",
    "--workflow",
    "nodejs.yml",
    "--branch",
    "master",
    "--event",
    "push",
    "--status",
    "completed",
    "--limit",
    "1",
    "--json",
    "conclusion,url",
  ]);
  return runs[0] ?? null;
}

/** ラベル factory の開いた Issue のうち、key マーカーを持つものを返す（PR は含まない）。 */
export function listFactoryItems(): WorkItem[] {
  const issues = ghJson<{ number: number; body: string; labels: { name: string }[] }[]>([
    "issue",
    "list",
    "--label",
    "factory",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,body,labels",
  ]);
  return issues.flatMap((i) => {
    const key = parseKey(i.body);
    if (key === null) return [];
    return [
      { number: i.number, key, labels: i.labels.map((l) => l.name), state: parseState(i.body) },
    ];
  });
}

export function listDependabotPrs(): DependabotPr[] {
  const prs = ghJson<
    {
      number: number;
      title: string;
      body: string;
      labels: { name: string }[];
      statusCheckRollup: { name?: string; conclusion?: string | null }[];
    }[]
  >([
    "pr",
    "list",
    "--author",
    "app/dependabot",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,body,labels,statusCheckRollup",
  ]);
  return prs.map((p) => ({
    number: p.number,
    title: p.title,
    body: p.body,
    ci: ciFromRollup(p.statusCheckRollup),
    labels: p.labels.map((l) => l.name),
  }));
}

/** master 上の最新 run の作成時刻。event を指定すればその種類に絞る。 */
export function latestRunCreatedAt(workflow: string, event: string | null): string | null {
  const runs = ghJson<{ createdAt: string }[]>([
    "run",
    "list",
    "--workflow",
    workflow,
    "--branch",
    "master",
    ...(event === null ? [] : ["--event", event]),
    "--limit",
    "1",
    "--json",
    "createdAt",
  ]);
  return runs[0]?.createdAt ?? null;
}
