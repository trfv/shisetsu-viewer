import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "./classifyFailure.ts";
import {
  MaintenanceWindowError,
  PartialExtractionError,
  ScrapeStructureError,
  TargetNotFoundError,
} from "./errors.ts";

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

test("自治体サイトのメンテナンス窓は transient", () => {
  assert.equal(
    classifyFailure(
      "prepare",
      new Error("システム休止: site under maintenance window (02:00-05:00 JST)")
    ),
    "transient"
  );
  assert.equal(
    classifyFailure("prepare", new Error("受付時間外のためご利用いただけません")),
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

test("型付きエラーは文言に依存せず instanceof で分類される", () => {
  // メッセージが構造系パターンに一致しても、型が transient なら transient
  assert.equal(
    classifyFailure("prepare", new MaintenanceWindowError("locator.click failed somehow")),
    "transient"
  );
  assert.equal(classifyFailure("prepare", new PartialExtractionError("...")), "structural");
  assert.equal(classifyFailure("prepare", new ScrapeStructureError("...")), "structural");
  assert.equal(classifyFailure("prepare", new TargetNotFoundError("Room not found")), "structural");
});

test("Node システムエラーコードは transient（cause 連鎖も辿る）", () => {
  const direct = Object.assign(new Error("fetch failed"), { code: "ECONNRESET" });
  assert.equal(classifyFailure("prepare", direct), "transient");

  const wrapped = new Error("upload failed", {
    cause: Object.assign(new Error("socket"), { code: "ETIMEDOUT" }),
  });
  assert.equal(classifyFailure("persist", wrapped), "transient");
});

test("Playwright TimeoutError は name で分類（navigation は transient、要素待ちは structural）", () => {
  const navTimeout = Object.assign(new Error("page.goto: Timeout 30000ms exceeded"), {
    name: "TimeoutError",
  });
  assert.equal(classifyFailure("prepare", navTimeout), "transient");

  const locatorTimeout = Object.assign(new Error("Timeout 5000ms exceeded waiting for element"), {
    name: "TimeoutError",
  });
  assert.equal(classifyFailure("extract", locatorTimeout), "structural");
});
