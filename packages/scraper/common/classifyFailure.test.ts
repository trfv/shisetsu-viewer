import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "./classifyFailure.ts";

test("validate 失敗は step だけで structural", () => {
  assert.equal(classifyFailure("validate", new Error("x")), "structural");
});

test("transform 失敗は常に structural", () => {
  assert.equal(classifyFailure("transform", new Error("x")), "structural");
});

test("validationErrors があれば structural", () => {
  assert.equal(classifyFailure("extract", new Error("x"), ["bad"]), "structural");
});

test("ナビゲーションタイムアウトは transient", () => {
  assert.equal(
    classifyFailure("prepare", new Error("page.goto: Timeout 30000ms exceeded")),
    "transient"
  );
});

test("ネットワークエラーは transient", () => {
  assert.equal(classifyFailure("prepare", new Error("net::ERR_CONNECTION_RESET")), "transient");
});

test("Turnstile 検知は transient", () => {
  assert.equal(
    classifyFailure("prepare", new Error("Turnstile challenge not completed")),
    "transient"
  );
});

test("要素が見つからない locator タイムアウトは structural", () => {
  const message =
    "locator.click: Timeout 10000ms exceeded.\nCall log: waiting for getByRole('link', { name: '次の一覧' })";
  assert.equal(classifyFailure("extract", new Error(message)), "structural");
});

test("期待日数比チェック未満は structural", () => {
  assert.equal(
    classifyFailure(
      "validate",
      new Error("partial extraction for 施設A: covered 5/30 expected days (17%, threshold 50%)")
    ),
    "structural"
  );
});

test("認識できないエラーは unknown", () => {
  assert.equal(classifyFailure("prepare", new Error("something weird happened")), "unknown");
});

test("Error 以外の値が throw されても分類できる", () => {
  assert.equal(classifyFailure("prepare", "net::ERR_CONNECTION_RESET"), "transient");
  assert.equal(
    classifyFailure("extract", { toString: () => "locator.click: Timeout 5000ms exceeded" }),
    "structural"
  );
});
