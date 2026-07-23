import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";
import { STRATEGY_BY_MUNICIPALITY, strategyFor } from "./observeStrategy.ts";

test("strategyFor は既定で direct を返す", () => {
  assert.equal(strategyFor("tokyo-koutou"), "direct");
  assert.equal(strategyFor("tokyo-kita"), "direct");
  assert.equal(strategyFor("未知の自治体"), "direct");
});

test("strategyFor は区分フィルタ型の自治体に divisionFilter を返す", () => {
  assert.equal(strategyFor("tokyo-toshima"), "divisionFilter");
  assert.equal(strategyFor("tokyo-edogawa"), "divisionFilter");
});

test("戦略マップのキーは registry に実在する自治体である", () => {
  for (const key of Object.keys(STRATEGY_BY_MUNICIPALITY)) {
    const slug = key.split("-")[1];
    assert.ok(slug !== undefined, `${key} は <prefecture>-<slug> の形式ではない`);
    assert.ok(getMunicipalityBySlug(slug) !== undefined, `${key} が registry に存在しない`);
  }
});

const BLIND_SPOT_PATTERNS = [
  /\bSTATUS_MAP\b/,
  /\bDIVISION_MAP\b/,
  /scraper\.extract\b/,
  /scraper\.transform\b/,
  /\bfrom "\.\.\/\.\.\/common\/reservation\.ts"/,
];

const OBSERVER_SOURCES = [
  "tools/spotcheck/observeStrategy.ts",
  "tools/spotcheck/observeCore.ts",
  "tools/spotcheck/observe.ts",
];

test("観測側のソースはスクレイパーの解釈（STATUS_MAP / extract / transform）を参照しない", async () => {
  for (const file of OBSERVER_SOURCES) {
    const source = await readFile(file, "utf8");
    // コメントを除いた行だけを検査する（意図の説明で語を使うのは許す）
    const code = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    for (const pattern of BLIND_SPOT_PATTERNS) {
      assert.ok(
        !pattern.test(code),
        `${file} が ${pattern} を参照している。spot check は scraper の解釈を借りない（借りると同じ誤りを再現して MATCH を出す）`
      );
    }
  }
});
