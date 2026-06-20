import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";
import type { TransformOutput } from "./types.ts";
import { runScrapeTest } from "./runScrapeTest.ts";

function fakePage(closed: { count: number }): Page {
  return {
    content: async () => "<html>broken</html>",
    screenshot: async ({ path: p }: { path: string }) => {
      await fs.writeFile(p, "fake-png");
      return Buffer.from("");
    },
    close: async () => {
      closed.count += 1;
    },
  } as unknown as Page;
}

const validOutput = [
  {
    room_name: "ホールA",
    date: "2026-06-17",
    reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" },
  },
] as unknown as TransformOutput;

test("成功時に persist を呼び、既存の失敗レコードを clearFailure で除去する", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "runscrape-"));
  await fs.mkdir(path.join(baseDir, "tokyo-test", "_failures"), { recursive: true });
  const staleJson = path.join(baseDir, "tokyo-test", "_failures", "施設A.json");
  await fs.writeFile(staleJson, "{}");

  const closed = { count: 0 };
  let persisted = false;
  await runScrapeTest({
    municipality: "tokyo-test",
    facility: "施設A",
    context: {},
    sourceRef: "tokyo-test/index.ts",
    page: fakePage(closed),
    baseDir,
    prepare: async () => fakePage(closed),
    extract: async () => [1],
    transform: async () => validOutput,
    persist: async () => {
      persisted = true;
    },
  });

  assert.equal(persisted, true);
  await assert.rejects(() => fs.access(staleJson));
  assert.ok(closed.count >= 1);
});

test("prepare 失敗で step=prepare のレコードを書き、例外を再 throw する", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "runscrape-"));
  const closed = { count: 0 };
  const page = fakePage(closed);
  await assert.rejects(
    runScrapeTest({
      municipality: "tokyo-test",
      facility: "施設B",
      context: {},
      sourceRef: "tokyo-test/index.ts",
      page,
      baseDir,
      prepare: async () => {
        throw new Error("net::ERR_CONNECTION_RESET");
      },
      extract: async () => [1],
      transform: async () => validOutput,
      persist: async () => {},
    }),
    /net::ERR_CONNECTION_RESET/
  );
  const json = JSON.parse(
    await fs.readFile(path.join(baseDir, "tokyo-test", "_failures", "施設B.json"), "utf8")
  );
  assert.equal(json.failedStep, "prepare");
  assert.equal(json.classification, "transient");
  assert.equal(closed.count, 1);
});

test("extract が空配列なら step=extract・classification=unknown で捕捉する", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "runscrape-"));
  const closed = { count: 0 };
  const page = fakePage(closed);
  await assert.rejects(
    runScrapeTest({
      municipality: "tokyo-test",
      facility: "施設C",
      context: {},
      sourceRef: "tokyo-test/index.ts",
      page,
      baseDir,
      prepare: async () => fakePage(closed),
      extract: async () => [],
      transform: async () => validOutput,
      persist: async () => {},
    })
  );
  const json = JSON.parse(
    await fs.readFile(path.join(baseDir, "tokyo-test", "_failures", "施設C.json"), "utf8")
  );
  assert.equal(json.failedStep, "extract");
  assert.equal(json.classification, "unknown");
});

test("検証失敗で step=validate・classification=structural・validationErrors を記録する", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "runscrape-"));
  const closed = { count: 0 };
  const invalid = [
    {
      room_name: "",
      date: "2026-06-17",
      reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" },
    },
  ] as unknown as TransformOutput;
  const page = fakePage(closed);
  await assert.rejects(
    runScrapeTest({
      municipality: "tokyo-test",
      facility: "施設D",
      context: {},
      sourceRef: "tokyo-test/index.ts",
      page,
      baseDir,
      prepare: async () => fakePage(closed),
      extract: async () => [1],
      transform: async () => invalid,
      persist: async () => {},
    })
  );
  const json = JSON.parse(
    await fs.readFile(path.join(baseDir, "tokyo-test", "_failures", "施設D.json"), "utf8")
  );
  assert.equal(json.failedStep, "validate");
  assert.equal(json.classification, "structural");
  assert.ok(json.validationErrors.length > 0);
});

test("searchPage === page のとき二重 close しない", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "runscrape-"));
  const closed = { count: 0 };
  const page = fakePage(closed);
  await runScrapeTest({
    municipality: "tokyo-test",
    facility: "施設E",
    context: {},
    sourceRef: "tokyo-test/index.ts",
    page,
    baseDir,
    prepare: async () => page,
    extract: async () => [1],
    transform: async () => validOutput,
    persist: async () => {},
  });
  assert.equal(closed.count, 1);
});
