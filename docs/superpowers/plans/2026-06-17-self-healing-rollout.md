# 自己修復キャプチャ全自治体展開 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** kita 以外の全10自治体のスクレイパーテストに失敗キャプチャ（`captureFailure`/`clearFailure`）を配線し、共有ハーネス `common/runScrapeTest.ts` で kita を含む全11自治体を統一する。

**Architecture:** 各 `index.test.ts` の「prepare → extract → transform → validate → persist」骨格を `common/runScrapeTest.ts` に抽出。自治体固有の差分（各関数のシグネチャ）はクロージャで渡す。CI レーンは既に自治体非依存なので変更しない。

**Tech Stack:** TypeScript（`tsgo`）, Playwright（テストランナー）, `node --test`（ハーネスの単体テスト）, date-fns。

## Global Constraints

- Node >= 24, ES Modules, `.ts` 拡張子付き相対 import（`allowImportingTsExtensions`）。
- Prettier: printWidth 100, tabWidth 2, double quotes, trailing commas es5。
- scraper パッケージの依存は `@playwright/test` と `date-fns` のみ（新規依存禁止）。
- ハーネスは Playwright の `expect` を**値として import しない**（`node --test` 互換のためプレーン `throw`）。
- ユニットテストは `common/*.test.ts` に置き `node --test 'common/*.test.ts'` で動く（`npm run test:unit -w @shisetsu-viewer/scraper`）。
- 既存シグネチャ（verbatim）:
  - `writeTestResult(outputDir: string, fileName: string, facilityName: string, data: TransformOutput): Promise<void>`
  - `captureFailure({ municipality, facility, context, failedStep, error, sourceRef, validationErrors?, page?, baseDir?, now? }): Promise<FailureRecord>`
  - `clearFailure({ municipality, facility, context, baseDir? }): Promise<void>`
  - `validateTransformOutput(output: TransformOutput): string[]`（空配列なら正常）
  - `FailedStep = "prepare" | "extract" | "transform" | "validate" | "persist"`

## File Structure

- **Create** `packages/scraper/common/runScrapeTest.ts` — 共有ハーネス（唯一の新規ロジック）。
- **Create** `packages/scraper/common/runScrapeTest.test.ts` — ハーネスの単体テスト（`node --test`）。
- **Modify** 全11自治体の `packages/scraper/<muni>/index.test.ts` — ループ本体を `runScrapeTest({...})` 呼び出しに置換。
- CI（`.github/workflows/scraper.yml` / `.github/actions/scrape`）は変更しない。

---

### Task 1: 共有ハーネス `common/runScrapeTest.ts` + 単体テスト

**Files:**
- Create: `packages/scraper/common/runScrapeTest.ts`
- Test: `packages/scraper/common/runScrapeTest.test.ts`

**Interfaces:**
- Consumes: `validateTransformOutput`（`common/validation.ts`）, `captureFailure`/`clearFailure`（`common/captureFailure.ts`）, `FailedStep`（`common/failureTypes.ts`）, `TransformOutput`（`common/types.ts`）。
- Produces:
  ```ts
  export interface RunScrapeTestOptions<E extends { length: number }> {
    municipality: string;
    facility: string;
    context: Record<string, unknown>;
    sourceRef: string;
    page: import("@playwright/test").Page;
    label?: string;
    prepare: () => Promise<import("@playwright/test").Page>;
    extract: (searchPage: import("@playwright/test").Page) => Promise<E>;
    transform: (extractOutput: E) => Promise<TransformOutput>;
    persist: (transformOutput: TransformOutput) => Promise<void>;
    baseDir?: string;
  }
  export function runScrapeTest<E extends { length: number }>(
    opts: RunScrapeTestOptions<E>
  ): Promise<void>;
  ```

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/common/runScrapeTest.test.ts`:

```ts
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
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`Cannot find module './runScrapeTest.ts'` 相当のエラーで全テストが落ちる）

- [ ] **Step 3: ハーネスを実装**

`packages/scraper/common/runScrapeTest.ts`:

```ts
import type { Page } from "@playwright/test";
import type { TransformOutput } from "./types.ts";
import type { FailedStep } from "./failureTypes.ts";
import { validateTransformOutput } from "./validation.ts";
import { captureFailure, clearFailure } from "./captureFailure.ts";

export interface RunScrapeTestOptions<E extends { length: number }> {
  /** 自治体スラッグ（例 "tokyo-arakawa"）。 */
  municipality: string;
  /** 施設名。FailureRecord.facility / clearFailure のキーになる。 */
  facility: string;
  /**
   * 失敗時に修復エージェントが読むコンテキスト。`roomName` キーが文字列なら
   * 失敗レコードの slug 生成に使われる（captureFailure 側の仕様）。
   */
  context: Record<string, unknown>;
  /** 壊れた可能性が高いソースファイル（例 "tokyo-arakawa/index.ts"）。 */
  sourceRef: string;
  /** テストの root page。capture のフォールバックと close に使う。 */
  page: Page;
  /** console.time のラベル。省略時は facility。 */
  label?: string;
  prepare: () => Promise<Page>;
  extract: (searchPage: Page) => Promise<E>;
  transform: (extractOutput: E) => Promise<TransformOutput>;
  persist: (transformOutput: TransformOutput) => Promise<void>;
  /** テスト用シーム。capture/clear の baseDir に委譲（既定 "test-results"）。 */
  baseDir?: string;
}

/**
 * 全自治体スクレイパーテスト共通の実行骨格。
 * prepare → extract → transform → validate → persist を実行し、成功時は失敗レコードを
 * 除去、失敗時は分類済みの失敗レコード（DOM/screenshot 付き）を保存して例外を再 throw する。
 */
export async function runScrapeTest<E extends { length: number }>(
  opts: RunScrapeTestOptions<E>
): Promise<void> {
  const { municipality, facility, context, sourceRef, page, baseDir } = opts;
  const label = opts.label ?? facility;
  console.time(label);

  let searchPage: Page | undefined;
  let step: FailedStep = "prepare";
  let validationErrors: string[] = [];
  try {
    searchPage = await opts.prepare();
    step = "extract";
    const extractOutput = await opts.extract(searchPage);
    if (extractOutput.length === 0) {
      throw new Error(`extract returned no rows for ${label}`);
    }
    step = "transform";
    const transformOutput = await opts.transform(extractOutput);
    if (transformOutput.length === 0) {
      throw new Error(`transform produced no records for ${label}`);
    }
    step = "validate";
    validationErrors = validateTransformOutput(transformOutput);
    if (validationErrors.length > 0) {
      throw new Error(`validation failed for ${label}: ${validationErrors.join("; ")}`);
    }
    console.timeEnd(label);

    step = "persist";
    await opts.persist(transformOutput);
    await clearFailure({ municipality, facility, context, baseDir });
  } catch (e) {
    await captureFailure({
      municipality,
      facility,
      context,
      failedStep: step,
      error: e,
      validationErrors,
      sourceRef,
      page: searchPage ?? page,
      baseDir,
    });
    throw e;
  } finally {
    if (searchPage) await searchPage.close().catch(() => {});
    if (searchPage !== page) await page.close().catch(() => {});
  }
}
```

- [ ] **Step 4: テストを実行して合格を確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（5 テストすべて pass）

- [ ] **Step 5: 型チェック**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなしで終了

- [ ] **Step 6: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/common/runScrapeTest.ts packages/scraper/common/runScrapeTest.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): add shared runScrapeTest self-healing harness

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: tokyo-kita を共有ハーネスに乗せ替え

**Files:**
- Modify: `packages/scraper/tokyo-kita/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`（Task 1）, `prepare`/`extract`/`transform`（`tokyo-kita/index.ts`）, `writeTestResult`。

- [ ] **Step 1: テストファイルを置換**

`packages/scraper/tokyo-kita/index.test.ts` の `import` 行と `scrapeTargets.forEach(...)` ブロックを以下に置換（`scrapeTargets` 配列と `calculateCount` は現状維持）。先頭 import を次に差し替える:

```ts
import { test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`scrapeTargets.forEach(...)` 全体を次に置換:

```ts
scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }: { page: Page }) => {
    await runScrapeTest({
      municipality: "tokyo-kita",
      facility: facilityName,
      context: { roomName, links },
      sourceRef: "tokyo-kita/index.ts",
      page,
      label: title,
      prepare: () => prepare(page, links),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(roomName, eo),
      persist: (to) =>
        writeTestResult("tokyo-kita", `${facilityName}-${roomName}`, facilityName, to),
    });
  });
});
```

注意: 旧 import の `expect`, `validateTransformOutput`, `writeTestResult` の `captureFailure`/`clearFailure`/`FailedStep` は削除済みであること（`writeTestResult` と `Page` 型は残す）。

- [ ] **Step 2: 型チェック**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-kita/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "refactor(scraper): migrate tokyo-kita to runScrapeTest harness

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: tokyo-arakawa を配線

**Files:**
- Modify: `packages/scraper/tokyo-arakawa/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name)`, `extract(sp, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: ファイル全体を置換**

`packages/scraper/tokyo-arakawa/index.test.ts`（`facilityNames` 配列の中身は現状のまま維持）:

```ts
import { test } from "@playwright/test";
import { addMonths, differenceInDays, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 13);
  return differenceInDays(endDate, startData) + 1;
}

const facilityNames = [
  // 既存の施設名配列をそのまま維持（変更しない）
];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-arakawa",
      facility: name,
      context: {},
      sourceRef: "tokyo-arakawa/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-arakawa", name, name, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-arakawa/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-arakawa

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: tokyo-bunkyo を配線

**Files:**
- Modify: `packages/scraper/tokyo-bunkyo/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name)`, `extract(sp, dateStr, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `facilityNames.forEach(...)` を置換**（`calculateCount` と `facilityNames` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`facilityNames.forEach(...)`:

```ts
facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-bunkyo",
      facility: name,
      context: {},
      sourceRef: "tokyo-bunkyo/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy-MM-dd"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-bunkyo", name, name, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-bunkyo/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-bunkyo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: tokyo-chuo を配線（room 単位）

**Files:**
- Modify: `packages/scraper/tokyo-chuo/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, links)`, `extract(sp, count)`, `transform(roomName, eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `scrapeTargets.forEach(...)` を置換**（`calculateCount` と `scrapeTargets` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`scrapeTargets.forEach(...)`:

```ts
scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-chuo",
      facility: facilityName,
      context: { roomName, links },
      sourceRef: "tokyo-chuo/index.ts",
      page,
      label: title,
      prepare: () => prepare(page, links),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(roomName, eo),
      persist: (to) =>
        writeTestResult("tokyo-chuo", `${facilityName}-${roomName}`, facilityName, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-chuo/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-chuo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: tokyo-edogawa を配線（room ループ persist）

**Files:**
- Modify: `packages/scraper/tokyo-edogawa/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, facilityName, category)`, `extract(sp, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `scrapeTargets.forEach(...)` を置換**（`calculateCount` と `scrapeTargets` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`scrapeTargets.forEach(...)`:

```ts
scrapeTargets.forEach((target) => {
  const { facilityName, category } = target;
  test(facilityName, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-edogawa",
      facility: facilityName,
      context: { category },
      sourceRef: "tokyo-edogawa/index.ts",
      page,
      prepare: () => prepare(page, facilityName, category),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(eo),
      persist: async (to) => {
        const roomNames = [...new Set(to.map((t) => t.room_name))];
        for (const roomName of roomNames) {
          const roomData = to.filter((t) => t.room_name === roomName);
          await writeTestResult(
            "tokyo-edogawa",
            `${facilityName}-${roomName}`,
            facilityName,
            roomData
          );
        }
      },
    });
  });
});
```

注意: 旧実装は `page` のみ close していたが、ハーネスは searchPage（prepare の戻り値）と page を `searchPage !== page` ガード付きで close する。prepare が root page を返す場合は二重 close を避ける。

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-edogawa/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-edogawa

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: tokyo-koutou を配線（施設×日付レンジ）

**Files:**
- Modify: `packages/scraper/tokyo-koutou/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name, date, index)`, `extract(sp, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `facilityNames.forEach(...)` を置換**（`buildDateRanges`, `facilityNames`, `dateRanges` は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`facilityNames.forEach(...)`:

```ts
facilityNames.forEach((name) => {
  dateRanges.forEach((dateRange, index) => {
    const title = `${name} (${index + 1} / ${dateRanges.length})`;
    test(title, async ({ page }) => {
      await runScrapeTest({
        municipality: "tokyo-koutou",
        facility: name,
        context: { dateRangeStart: format(dateRange[0], "yyyyMM") },
        sourceRef: "tokyo-koutou/index.ts",
        page,
        label: title,
        prepare: () => prepare(page, name, dateRange[0], index),
        extract: (sp) => extract(sp, dateRange[2]),
        transform: (eo) => transform(eo),
        persist: (to) =>
          writeTestResult("tokyo-koutou", `${name}_${format(dateRange[0], "yyyyMM")}`, name, to),
      });
    });
  });
});
```

注意: 1施設につき複数の日付レンジテストがあるが、`captureFailure` の slug は施設名（+`roomName`）からのみ生成されるため、失敗レコードは施設単位に集約される（設計どおりの割り切り）。

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-koutou/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-koutou

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: tokyo-meguro を配線

**Files:**
- Modify: `packages/scraper/tokyo-meguro/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name)`, `extract(sp, dateStr, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `facilityNames.forEach(...)` を置換**（`calculateCount` と `facilityNames` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`facilityNames.forEach(...)`:

```ts
facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-meguro",
      facility: name,
      context: {},
      sourceRef: "tokyo-meguro/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy/M/d"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-meguro", name, name, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-meguro/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-meguro

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: tokyo-ota を配線（room 単位）

**Files:**
- Modify: `packages/scraper/tokyo-ota/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, category, building, room)`, `extract(sp, count)`, `transform(roomName, eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `scrapeTargets.forEach(...)` を置換**（`calculateCount`, `type ScrapeTarget`, `scrapeTargets` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`scrapeTargets.forEach(...)`:

```ts
scrapeTargets.forEach((target) => {
  const { facilityName, roomName, category, buildingName, siteRoomName } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-ota",
      facility: facilityName,
      context: { roomName, category, buildingName },
      sourceRef: "tokyo-ota/index.ts",
      page,
      label: title,
      prepare: () => prepare(page, category, buildingName, siteRoomName ?? roomName),
      extract: (sp) => extract(sp, calculateCount()),
      transform: (eo) => transform(roomName, eo),
      persist: (to) =>
        writeTestResult("tokyo-ota", `${facilityName}-${roomName}`, facilityName, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-ota/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-ota

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: tokyo-sumida を配線

**Files:**
- Modify: `packages/scraper/tokyo-sumida/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name)`, `extract(sp, dateStr, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `facilityNames.forEach(...)` を置換**（`calculateCount` と `facilityNames` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`facilityNames.forEach(...)`:

```ts
facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-sumida",
      facility: name,
      context: {},
      sourceRef: "tokyo-sumida/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy-MM-dd"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-sumida", name, name, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-sumida/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-sumida

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: tokyo-toshima を配線

**Files:**
- Modify: `packages/scraper/tokyo-toshima/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name)`, `extract(sp, dateStr, count)`, `transform(eo)`, `writeTestResult`。

- [ ] **Step 1: import 行と `facilityNames.forEach(...)` を置換**（`calculateCount` と `facilityNames` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`facilityNames.forEach(...)`:

```ts
facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-toshima",
      facility: name,
      context: {},
      sourceRef: "tokyo-toshima/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy/M/d"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-toshima", name, name, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tokyo-toshima/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into tokyo-toshima

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: kanagawa-kawasaki を配線

**Files:**
- Modify: `packages/scraper/kanagawa-kawasaki/index.test.ts`

**Interfaces:**
- Consumes: `runScrapeTest`, `prepare(page, name, date)`, `extract(sp, count, name, rooms)`, `transform(eo, name)`, `writeTestResult`。

- [ ] **Step 1: import 行と `scrapeTargets.forEach(...)` を置換**（`calculateCount` と `scrapeTargets` 配列は現状維持）。

import 行:

```ts
import { test } from "@playwright/test";
import { addMonths, differenceInCalendarWeeks, endOfMonth } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";
```

`scrapeTargets.forEach(...)`:

```ts
scrapeTargets.forEach(({ facilityName, roomNames }) => {
  test(facilityName, async ({ page }) => {
    await runScrapeTest({
      municipality: "kanagawa-kawasaki",
      facility: facilityName,
      context: { roomNames },
      sourceRef: "kanagawa-kawasaki/index.ts",
      page,
      prepare: () => prepare(page, facilityName, new Date()),
      extract: (sp) => extract(sp, calculateCount(), facilityName, roomNames),
      transform: (eo) => transform(eo, facilityName),
      persist: (to) => writeTestResult("kanagawa-kawasaki", facilityName, facilityName, to),
    });
  });
});
```

- [ ] **Step 2: 型チェック** — Run: `npm run typecheck -w @shisetsu-viewer/scraper` / Expected: エラーなし
- [ ] **Step 3: コミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/kanagawa-kawasaki/index.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): wire self-healing capture into kanagawa-kawasaki

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: 全体検証（lint / format / knip / unit）

**Files:**
- なし（検証のみ。修正が必要なら該当ファイルを直す）

- [ ] **Step 1: 単体テスト**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（runScrapeTest の 5 テスト + 既存 capture/classify テストすべて pass）

- [ ] **Step 2: 全パッケージ型チェック**

Run: `npm run typecheck:all`
Expected: エラーなし

- [ ] **Step 3: Lint**

Run: `npm run lint:all`
Expected: エラーなし（未使用 import `expect` / `validateTransformOutput` が残っていれば削除して再実行）

- [ ] **Step 4: フォーマット**

Run: `npm run format:fix:all`
Expected: 差分があれば整形される

- [ ] **Step 5: 未使用検出**

Run: `npm run knip`
Expected: `runScrapeTest` 関連の未使用報告なし

- [ ] **Step 6: 整形差分があればコミット**

```bash
PATH="$PWD/node_modules/.bin:$PATH" git add -A
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "chore(scraper): lint and format self-healing rollout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" || echo "差分なし"
```

---

## Self-Review

**1. Spec coverage:**
- 共有ハーネス `common/runScrapeTest.ts`（spec ①）→ Task 1。
- プレーン throw / baseDir パススルー / close ガード（spec ①の設計ポイント）→ Task 1 の実装 + 単体テスト。
- 全11ファイルの配線（spec ②、context/persist 表）→ Task 2（kita）+ Task 3〜12（10自治体）。各自治体の context・persist・シグネチャは spec の表と一致。
- 単体テスト `common/runScrapeTest.test.ts`（spec ③の5観点）→ Task 1 の5テスト（成功 clear / prepare 失敗 / extract 空 / validate 失敗 / 二重 close ガード）。
- koutou 施設単位集約（spec の注意点）→ Task 7 に明記。
- edogawa の close 挙動（spec の注意点）→ Task 6 に明記。
- CI 無変更（spec スコープ外）→ 計画に CI タスクなし（意図的）。
- テスト戦略（typecheck/lint/format/knip）→ Task 13。

**2. Placeholder scan:** コード手順はすべて実コードを記載。`facilityNames` / `scrapeTargets` 配列は「現状維持」と明示（既存ファイルの内容を保持する指示であり、TBD ではない）。

**3. Type consistency:** `runScrapeTest` / `RunScrapeTestOptions` の名称・引数（`municipality`, `facility`, `context`, `sourceRef`, `page`, `label`, `prepare`, `extract`, `transform`, `persist`, `baseDir`）は Task 1 の定義と Task 2〜12 の呼び出しで一致。`writeTestResult(outputDir, fileName, facilityName, data)` の引数順も全タスクで一致。
