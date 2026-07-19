import { test } from "node:test";
import assert from "node:assert/strict";
import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";
import { categorizeLabel, categorizeSymbol } from "./symbolMap.ts";

test("categorizeLabel は registry の表示ラベルを 3 カテゴリに割り当てる", () => {
  assert.equal(categorizeLabel("空き"), "AVAILABLE");
  assert.equal(categorizeLabel("一部空き"), "AVAILABLE");
  assert.equal(categorizeLabel("空きなし"), "UNAVAILABLE"); // 「空き」を含むが UNAVAILABLE が優先
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
  assert.equal(categorizeSymbol("Ｘ"), "UNAVAILABLE"); // 全角ラテン大文字 X (U+FF38)
  assert.equal(categorizeSymbol("X"), "UNAVAILABLE"); // 半角大文字 X (U+0058)
  assert.equal(categorizeSymbol("x"), "UNAVAILABLE"); // 半角小文字 x (U+0078)
});

test("categorizeSymbol は凡例を記号表より優先する", () => {
  // このサイトでは △ が「抽選申込あり」= 埋まり系だと凡例が言っている
  assert.equal(categorizeSymbol("△", { "△": "抽選申込あり" }), "UNAVAILABLE");
  // 凡例の文言が未知カテゴリなら記号表へフォールバック
  assert.equal(categorizeSymbol("△", { "△": "意味不明な説明" }), "AVAILABLE");
});

test("categorizeSymbol は記号でなく文言が直接表示されるサイトも受ける", () => {
  assert.equal(categorizeSymbol("予約あり"), "UNAVAILABLE");
  assert.equal(categorizeSymbol(" 空き "), "AVAILABLE"); // 前後空白は無視
});

// registry drift: 判定器（categorizeSymbol）が実際に registry の全表示ラベルを消化できることを
// 継続的に検証する。judgeReport.ts の期待側カテゴリ化は categorizeSymbol を通すため、
// registry に UNKNOWN な表示ラベルが 1 件でもあると、そのラベルを持つ自治体は
// silent に UNMAPPED（判定不能）になってしまう（C1 の再発防止）。
// スコープは spot check がサンプル対象にしうる自治体（reservationExcluded な自治体は
// スクレイパー自体が無くサンプル化されないため除く）。
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
