import assert from "node:assert/strict";
import { test } from "node:test";

import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";

import { categorizeLabel, categorizeSymbol } from "./symbolMap.ts";

test("categorizeLabel は registry の表示ラベルを 3 カテゴリに割り当てる", () => {
  assert.equal(categorizeLabel("空き"), "AVAILABLE");
  assert.equal(categorizeLabel("一部空き"), "AVAILABLE");
  assert.equal(categorizeLabel("空きなし"), "UNAVAILABLE");
  assert.equal(categorizeLabel("予約あり"), "UNAVAILABLE");
  assert.equal(categorizeLabel("予約済"), "UNAVAILABLE");
  assert.equal(categorizeLabel("音出し予約"), "UNAVAILABLE");
  assert.equal(categorizeLabel("休館日"), "OUT_OF_SCOPE");
  assert.equal(categorizeLabel("保守日"), "OUT_OF_SCOPE");
  assert.equal(categorizeLabel("期間外"), "OUT_OF_SCOPE");
  assert.equal(categorizeLabel("謎のラベル"), "UNKNOWN");
});

test("categorizeSymbol は記号表で判定する", () => {
  assert.equal(categorizeSymbol("○"), "AVAILABLE");
  assert.equal(categorizeSymbol("〇"), "AVAILABLE");
  assert.equal(categorizeSymbol("△"), "AVAILABLE");
  assert.equal(categorizeSymbol("×"), "UNAVAILABLE");
  assert.equal(categorizeSymbol("－"), "OUT_OF_SCOPE");
  assert.equal(categorizeSymbol("?"), "UNKNOWN");
});

test("categorizeSymbol は全角/半角の X も UNAVAILABLE として扱う（荒川区が実サイトで使用）", () => {
  assert.equal(categorizeSymbol("Ｘ"), "UNAVAILABLE");
  assert.equal(categorizeSymbol("X"), "UNAVAILABLE");
  assert.equal(categorizeSymbol("x"), "UNAVAILABLE");
});

test("categorizeSymbol は大田区の img alt 文言（「空いています」「予約済みです」）を判定できる", () => {
  assert.equal(categorizeSymbol("空いています"), "AVAILABLE");
  assert.equal(categorizeSymbol("予約済みです"), "UNAVAILABLE");
  assert.equal(categorizeSymbol("空いていません"), "UNAVAILABLE");
});

test("categorizeSymbol は凡例を記号表より優先する", () => {
  assert.equal(categorizeSymbol("△", { "△": "抽選申込あり" }), "UNAVAILABLE");
  assert.equal(categorizeSymbol("△", { "△": "意味不明な説明" }), "AVAILABLE");
});

test("categorizeSymbol は記号でなく文言が直接表示されるサイトも受ける", () => {
  assert.equal(categorizeSymbol("予約あり"), "UNAVAILABLE");
  assert.equal(categorizeSymbol(" 空き "), "AVAILABLE");
});

test("categorizeSymbol は全自治体（reservationExcluded を除く）の reservationStatus 表示ラベルを UNKNOWN にしない", () => {
  const unknown: string[] = [];
  for (const municipality of Object.values<MunicipalityConfig>(MUNICIPALITIES)) {
    if (municipality.reservationExcluded) continue;
    for (const [status, label] of Object.entries(municipality.reservationStatus)) {
      if (categorizeSymbol(label) === "UNKNOWN") {
        unknown.push(`${municipality.key}.${status} = ${JSON.stringify(label)}`);
      }
    }
  }
  assert.deepEqual(
    unknown,
    [],
    `symbolMap.ts の LABEL_CATEGORIES / SYMBOL_CATEGORIES が未対応のラベルがあります:\n${unknown.join("\n")}`
  );
});
