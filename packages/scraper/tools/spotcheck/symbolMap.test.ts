import { test } from "node:test";
import assert from "node:assert/strict";
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
