import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  MUNICIPALITIES,
  getAllMunicipalityTargets,
  getReservationTargets,
  type MunicipalityConfig,
} from "@shisetsu-viewer/shared";

// 自治体一覧の単一ソースは shared/registry.ts。
// YAML / Markdown など TS から直接参照できない消費箇所は、このドリフト検査で一致を強制する。

const scraperRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function extractMunicipalityOptions(workflowPath: string): string[] {
  const lines = readFileSync(workflowPath, "utf8").split("\n");
  const muniIdx = lines.findIndex((l) => /^\s+municipality:\s*$/.test(l));
  assert.ok(muniIdx >= 0, `${workflowPath}: municipality input が見つかりません`);

  let optIdx = -1;
  for (let i = muniIdx + 1; i <= muniIdx + 6 && i < lines.length; i++) {
    if (/^\s+options:\s*$/.test(lines[i] ?? "")) {
      optIdx = i;
      break;
    }
  }
  assert.ok(optIdx >= 0, `${workflowPath}: municipality input に options がありません`);

  const options: string[] = [];
  for (let i = optIdx + 1; i < lines.length; i++) {
    const match = (lines[i] ?? "").match(/^\s+-\s+(\S+)\s*$/);
    const value = match?.[1];
    if (value === undefined) break;
    options.push(value);
  }
  return options;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("registry drift", () => {
  it("scraper.yml の choice が getReservationTargets() + all と一致している", () => {
    const options = extractMunicipalityOptions(join(repoRoot, ".github/workflows/scraper.yml"));
    assert.deepEqual(sorted(options), sorted([...getReservationTargets(), "all"]));
  });

  it("database.yml の choice が getAllMunicipalityTargets() + all と一致している", () => {
    const options = extractMunicipalityOptions(join(repoRoot, ".github/workflows/database.yml"));
    assert.deepEqual(sorted(options), sorted([...getAllMunicipalityTargets(), "all"]));
  });

  it("README の対応地区が registry の label 一覧と一致している", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    const section = readme.split("## 対応地区")[1]?.split("\n## ")[0] ?? "";
    const listed = section
      .split("\n")
      .map((line) => line.match(/^-\s+([^（\s]+)/)?.[1])
      .filter((label): label is string => label !== undefined);
    const labels = Object.values<MunicipalityConfig>(MUNICIPALITIES).map((m) => m.label);
    assert.deepEqual(sorted(listed), sorted(labels));
  });

  it("スクレイパーディレクトリが getReservationTargets() と一致している", () => {
    const dirs = readdirSync(scraperRoot, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(scraperRoot, entry.name, "index.test.ts"))
      )
      .map((entry) => entry.name);
    assert.deepEqual(sorted(dirs), sorted(getReservationTargets()));
  });

  it("全自治体の施設 JSON (data/institutions/<target>.json) が存在している", () => {
    for (const target of getAllMunicipalityTargets()) {
      assert.ok(
        existsSync(join(scraperRoot, "data/institutions", `${target}.json`)),
        `data/institutions/${target}.json がありません`
      );
    }
  });
});
