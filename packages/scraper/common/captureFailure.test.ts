import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import type { Page } from "@playwright/test";

import { captureFailure, clearFailure } from "./captureFailure.ts";

function fakePage(): Page {
  return {
    content: async () => "<html>broken</html>",
    screenshot: async ({ path: p }: { path: string }) => {
      await fs.writeFile(p, "fake-png");
      return Buffer.from("");
    },
  } as unknown as Page;
}

test("validate 失敗を structural レコードとして書き出す", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-"));
  const record = await captureFailure({
    municipality: "tokyo-kita",
    facility: "北とぴあ",
    context: { roomName: "カナリアホール", links: ["集会施設", "北とぴあ"] },
    failedStep: "validate",
    error: new Error("boom"),
    validationErrors: ["Empty room_name for date 2026-06-13"],
    sourceRef: "tokyo-kita/index.ts",
    baseDir,
    page: fakePage(),
    now: () => new Date("2026-06-13T00:00:00.000Z"),
  });

  assert.equal(record.classification, "structural");
  assert.equal(record.failedStep, "validate");
  assert.equal(record.capturedAt, "2026-06-13T00:00:00.000Z");

  const jsonPath = path.join(baseDir, "tokyo-kita", "_failures", "北とぴあ-カナリアホール.json");
  const json = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  assert.equal(json.municipality, "tokyo-kita");
  assert.equal(json.facility, "北とぴあ");
  assert.deepEqual(json.validationErrors, ["Empty room_name for date 2026-06-13"]);
  assert.ok(json.domSnapshotPath.endsWith(".html"));
  assert.ok(json.screenshotPath.endsWith(".png"));

  assert.equal(await fs.readFile(json.domSnapshotPath, "utf8"), "<html>broken</html>");
});

test("page なしでもレコードを書ける（スナップショットは null）", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-"));
  const record = await captureFailure({
    municipality: "tokyo-kita",
    facility: "赤羽会館",
    context: { roomName: "講堂" },
    failedStep: "prepare",
    error: new Error("net::ERR_CONNECTION_RESET"),
    sourceRef: "tokyo-kita/index.ts",
    baseDir,
  });
  assert.equal(record.classification, "transient");
  assert.equal(record.domSnapshotPath, null);
  assert.equal(record.screenshotPath, null);
});

test("スナップショットが throw しても capture は throw せず JSON は書かれる", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-"));
  const throwingPage = {
    content: async () => {
      throw new Error("content failed");
    },
    screenshot: async () => {
      throw new Error("screenshot failed");
    },
  } as unknown as Page;

  const record = await captureFailure({
    municipality: "tokyo-kita",
    facility: "北とぴあ",
    context: { roomName: "スカイホール" },
    failedStep: "extract",
    error: new Error("locator.click: Timeout 5000ms exceeded"),
    sourceRef: "tokyo-kita/index.ts",
    baseDir,
    page: throwingPage,
  });

  assert.equal(record.domSnapshotPath, null);
  assert.equal(record.screenshotPath, null);
  const jsonPath = path.join(baseDir, "tokyo-kita", "_failures", "北とぴあ-スカイホール.json");
  const json = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  assert.equal(json.classification, "structural");
});

test("clearFailure は当該 slug の失敗レコードを削除する", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-"));
  await captureFailure({
    municipality: "tokyo-kita",
    facility: "北とぴあ",
    context: { roomName: "ドームホール" },
    failedStep: "extract",
    error: new Error("locator.click: Timeout"),
    sourceRef: "tokyo-kita/index.ts",
    baseDir,
  });
  const jsonPath = path.join(baseDir, "tokyo-kita", "_failures", "北とぴあ-ドームホール.json");
  // 事前条件: レコードが存在する
  await fs.access(jsonPath);

  await clearFailure({
    municipality: "tokyo-kita",
    facility: "北とぴあ",
    context: { roomName: "ドームホール" },
    baseDir,
  });
  await assert.rejects(() => fs.access(jsonPath));
});

test("clearFailure はレコードが無くても throw しない", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-"));
  await clearFailure({
    municipality: "tokyo-kita",
    facility: "無い施設",
    context: { roomName: "無い室" },
    baseDir,
  });
  // 例外が出なければ成功（明示アサーション）
  assert.ok(true);
});
