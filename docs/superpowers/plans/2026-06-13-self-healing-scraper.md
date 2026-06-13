# 決定論的スクレイパー + 別レーン AI 自己修復 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スクレイパーの定期実行を決定論的に保ったまま、構造変化で壊れた時に失敗を分類・可視化（Issue）し、別レーンの AI が「実サイトで検証済みの修正 PR」を出せる土台を `tokyo-kita` で構築する。

**Architecture:** 決定論レーン（scraper.yml）に「失敗の分類・キャプチャ・集約」だけを副作用として追加し、AI は一切挟まない。修復は実行環境非依存の成果物（決定論的検証ハーネス + `/repair-scraper` コマンド）として分離し、当面は手元の Claude Code で実行する。検証の合否は既存 `validateTransformOutput()` を流用する。

**Tech Stack:** TypeScript（tsgo / 型ストリップ）、Playwright、Node 組み込み `node --test`（追加依存なし）、GitHub Actions（`actions/github-script` で Issue upsert）。

参照スペック: `docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md`

---

## File Structure

新規作成：
- `packages/scraper/common/failureTypes.ts` — 失敗レコードの型定義（責務：型のみ、ロジックなし）
- `packages/scraper/common/classifyFailure.ts` — 失敗を transient / structural / unknown に分類する純粋関数
- `packages/scraper/common/classifyFailure.test.ts` — 上記のユニットテスト（`node --test`）
- `packages/scraper/common/captureFailure.ts` — 失敗レコード（JSON + DOM HTML + screenshot）を書き出す
- `packages/scraper/common/captureFailure.test.ts` — 上記のユニットテスト（`node --test`）
- `packages/scraper/tools/repair/verify.ts` — 決定論的検証ハーネス（実サイトで対象テストを再実行し構造化結果を返す）
- `.claude/commands/repair-scraper.md` — `/repair-scraper` スラッシュコマンド（AI 修復ループ）

変更：
- `packages/scraper/package.json` — `test:unit` スクリプト追加
- `packages/scraper/tokyo-kita/index.test.ts` — 失敗キャプチャを配線（パイロット）
- `.github/actions/scrape/action.yml` — 失敗レコードをアーティファクトとしてアップロード
- `.github/workflows/scraper.yml` — `collect_failures` ジョブ追加（structural のみ集約 → Issue upsert）
- `docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md` — ステータス更新

各ファイルは単一責務：型 / 分類 / 書き出し / 検証 / 配線 / CI / コマンド を分離している。

---

## Task 1: 失敗の型定義と分類関数（classifyFailure）

**Files:**
- Create: `packages/scraper/common/failureTypes.ts`
- Create: `packages/scraper/common/classifyFailure.ts`
- Test: `packages/scraper/common/classifyFailure.test.ts`
- Modify: `packages/scraper/package.json`

- [ ] **Step 1: ユニットテスト実行スクリプトを追加**

`packages/scraper/package.json` の `scripts` に1行追加する（`scrape` の次の行）：

```json
    "test:unit": "node --test common/*.test.ts",
```

変更後の `scripts` ブロックは以下になる：

```json
  "scripts": {
    "typecheck": "tsgo",
    "test": "npx playwright test",
    "test:unit": "node --test common/*.test.ts",
    "scrape": "node --env-file=.env scripts/run.ts",
    "update:reservations": "node --env-file=.env tools/updateReservations.ts",
    "update:institutions": "node --env-file=.env tools/updateInstitutions.ts",
    "export:institutions": "node --env-file=.env tools/exportInstitutions.ts"
  },
```

- [ ] **Step 2: 型定義ファイルを作成**

`packages/scraper/common/failureTypes.ts`：

```typescript
export type FailedStep = "prepare" | "extract" | "transform" | "validate";

export type FailureClassification = "transient" | "structural" | "unknown";

export interface FailureRecord {
  municipality: string;
  facility: string;
  context: Record<string, unknown>;
  failedStep: FailedStep;
  classification: FailureClassification;
  errorMessage: string;
  errorStack: string | null;
  validationErrors: string[];
  domSnapshotPath: string | null;
  screenshotPath: string | null;
  sourceRef: string;
  capturedAt: string;
}
```

- [ ] **Step 3: 失敗するテストを書く**

`packages/scraper/common/classifyFailure.test.ts`：

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "./classifyFailure.ts";

test("validate 失敗は常に structural", () => {
  assert.equal(classifyFailure("validate", new Error("x"), ["err"]), "structural");
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

test("認識できないエラーは unknown", () => {
  assert.equal(classifyFailure("prepare", new Error("something weird happened")), "unknown");
});
```

- [ ] **Step 4: テストが失敗することを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`classifyFailure` が存在しないため import エラー）

- [ ] **Step 5: classifyFailure を実装**

`packages/scraper/common/classifyFailure.ts`：

```typescript
import type { FailedStep, FailureClassification } from "./failureTypes.ts";

// 一過性失敗のシグネチャ。これらは retry_scrape で救済されるため修復対象外。
const TRANSIENT_PATTERNS: RegExp[] = [
  /Turnstile/i,
  /net::ERR_/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i,
  /socket hang up/i,
  /page\.goto/i, // ナビゲーションタイムアウトは通常ネットワーク起因
];

// 構造変化のシグネチャ。要素が消えた／移動した時の典型的なメッセージ。
const STRUCTURAL_PATTERNS: RegExp[] = [
  /waiting for/i,
  /locator/i,
  /getByRole|getByText|getByLabel/i,
  /resolved to 0 element/i,
  /strict mode violation/i,
];

export function classifyFailure(
  failedStep: FailedStep,
  error: unknown,
  validationErrors: string[] = []
): FailureClassification {
  // データ品質・パース失敗は常に構造系。
  if (failedStep === "validate" || failedStep === "transform") {
    return "structural";
  }
  if (validationErrors.length > 0) {
    return "structural";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (TRANSIENT_PATTERNS.some((re) => re.test(message))) {
    return "transient";
  }
  if (STRUCTURAL_PATTERNS.some((re) => re.test(message))) {
    return "structural";
  }
  return "unknown";
}
```

- [ ] **Step 6: テストが通ることを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（8 tests pass）

- [ ] **Step 7: 型チェック**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし

- [ ] **Step 8: コミット**

```bash
git add packages/scraper/common/failureTypes.ts packages/scraper/common/classifyFailure.ts packages/scraper/common/classifyFailure.test.ts packages/scraper/package.json
git commit -m "feat(scraper): add failure classification for self-healing"
```

---

## Task 2: 失敗レコードの書き出し（captureFailure）

**Files:**
- Create: `packages/scraper/common/captureFailure.ts`
- Test: `packages/scraper/common/captureFailure.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/common/captureFailure.test.ts`：

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";
import { captureFailure } from "./captureFailure.ts";

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

  // DOM スナップショットと screenshot が実ファイルとして存在する
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`captureFailure` が存在しない）

- [ ] **Step 3: captureFailure を実装**

`packages/scraper/common/captureFailure.ts`：

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import type { FailedStep, FailureRecord } from "./failureTypes.ts";
import { classifyFailure } from "./classifyFailure.ts";

export interface CaptureFailureInput {
  municipality: string;
  facility: string;
  context: Record<string, unknown>;
  failedStep: FailedStep;
  error: unknown;
  sourceRef: string;
  validationErrors?: string[];
  page?: Page;
  baseDir?: string;
  now?: () => Date;
}

function slugify(value: string): string {
  return value.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
}

export async function captureFailure(input: CaptureFailureInput): Promise<FailureRecord> {
  const validationErrors = input.validationErrors ?? [];
  const classification = classifyFailure(input.failedStep, input.error, validationErrors);
  const baseDir = input.baseDir ?? "test-results";
  const roomName = typeof input.context.roomName === "string" ? input.context.roomName : "";
  const slug =
    [slugify(input.facility), slugify(roomName)].filter(Boolean).join("-") || "failure";
  const dir = path.join(baseDir, input.municipality, "_failures");
  await fs.mkdir(dir, { recursive: true });

  let domSnapshotPath: string | null = null;
  let screenshotPath: string | null = null;
  const page = input.page;
  if (page) {
    // スナップショットはベストエフォート。元のエラーを決してマスクしない。
    try {
      const html = await page.content();
      const p = path.join(dir, `${slug}.html`);
      await fs.writeFile(p, html);
      domSnapshotPath = p;
    } catch {
      domSnapshotPath = null;
    }
    try {
      const p = path.join(dir, `${slug}.png`);
      await page.screenshot({ path: p, fullPage: true });
      screenshotPath = p;
    } catch {
      screenshotPath = null;
    }
  }

  const error = input.error;
  const record: FailureRecord = {
    municipality: input.municipality,
    facility: input.facility,
    context: input.context,
    failedStep: input.failedStep,
    classification,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? (error.stack ?? null) : null,
    validationErrors,
    domSnapshotPath,
    screenshotPath,
    sourceRef: input.sourceRef,
    capturedAt: (input.now ?? (() => new Date()))().toISOString(),
  };
  await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(record, null, 2));
  return record;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（Task 1 の 8 tests + 本タスクの 2 tests）

- [ ] **Step 5: 型チェック**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add packages/scraper/common/captureFailure.ts packages/scraper/common/captureFailure.test.ts
git commit -m "feat(scraper): persist failure records with DOM snapshot"
```

---

## Task 3: tokyo-kita テストに失敗キャプチャを配線

**Files:**
- Modify: `packages/scraper/tokyo-kita/index.test.ts`

- [ ] **Step 1: テスト本体を書き換え（失敗時に captureFailure を呼ぶ）**

`packages/scraper/tokyo-kita/index.test.ts` の先頭 import 群を以下に置き換える（既存の import 5行 + 追加3行）：

```typescript
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { captureFailure } from "../common/captureFailure.ts";
import type { FailedStep } from "../common/failureTypes.ts";
import { prepare, extract, transform } from "./index.ts";
```

`calculateCount()` と `scrapeTargets` 配列はそのまま変更しない。末尾の `scrapeTargets.forEach(...)` ブロック全体を以下に置き換える：

```typescript
scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    console.time(title);

    let searchPage: Page | undefined;
    let step: FailedStep = "prepare";
    let validationErrors: string[] = [];
    try {
      searchPage = await prepare(page, links);
      step = "extract";
      const extractOutput = await extract(searchPage, calculateCount());
      expect(extractOutput.length).toBeGreaterThan(0);
      step = "transform";
      const transformOutput = await transform(roomName, extractOutput);
      expect(transformOutput.length).toBeGreaterThan(0);
      step = "validate";
      validationErrors = validateTransformOutput(transformOutput);
      expect(validationErrors).toEqual([]);

      console.timeEnd(title);

      await writeTestResult(
        "tokyo-kita",
        `${facilityName}-${roomName}`,
        facilityName,
        transformOutput
      );
    } catch (e) {
      await captureFailure({
        municipality: "tokyo-kita",
        facility: facilityName,
        context: { roomName, links },
        failedStep: step,
        error: e,
        validationErrors,
        sourceRef: "tokyo-kita/index.ts",
        page: searchPage ?? page,
      });
      throw e;
    } finally {
      await searchPage?.close();
      await page.close();
    }
  });
});
```

- [ ] **Step 2: 型チェックとフォーマット**

Run: `npm run typecheck -w @shisetsu-viewer/scraper && npx prettier --check packages/scraper/tokyo-kita/index.test.ts`
Expected: エラーなし

- [ ] **Step 3: 正常系がこれまで通り通ることを確認（実サイト）**

Run: `cd packages/scraper && npx playwright test tokyo-kita -g "赤羽会館 講堂" --retries=0; cd ../..`
Expected: PASS（実サイトが正常なら）。`test-results/tokyo-kita/赤羽会館-講堂.json` が生成される。
※ 実サイト都合で落ちる場合は次ステップの破壊実験で挙動を確認する。

- [ ] **Step 4: 意図的にセレクタを壊して失敗キャプチャを確認（手動・E2E）**

`packages/scraper/tokyo-kita/index.ts:41` の `"空き状況の確認"` を一時的に `"存在しないリンク__壊す"` に書き換える。

Run: `cd packages/scraper && rm -rf test-results/tokyo-kita/_failures && npx playwright test tokyo-kita -g "赤羽会館 講堂" --retries=0; cd ../..`
Expected: テストは FAIL し、`packages/scraper/test-results/tokyo-kita/_failures/赤羽会館-講堂.json` が生成される。

確認: `cat packages/scraper/test-results/tokyo-kita/_failures/赤羽会館-講堂.json`
- `failedStep` が `"prepare"`
- `classification` が `"structural"`（locator タイムアウトのため）
- `domSnapshotPath` / `screenshotPath` が `_failures/` 配下を指す

確認後、`index.ts:41` の改変を**元に戻す**（`"空き状況の確認"`）。

- [ ] **Step 5: コミット**

```bash
git add packages/scraper/tokyo-kita/index.test.ts
git commit -m "feat(scraper): wire failure capture into tokyo-kita test"
```

---

## Task 4: 決定論的検証ハーネス（repair/verify.ts）

**Files:**
- Create: `packages/scraper/tools/repair/verify.ts`

- [ ] **Step 1: 検証ハーネスを実装**

`packages/scraper/tools/repair/verify.ts`：

```typescript
// 修復ループの「検証」半分。AI を一切含まない決定論的スクリプト。
// 使い方: node tools/repair/verify.ts <municipality> "<facility>" ["<roomName>"]
// 出力: stdout 末尾に `REPAIR_VERIFY_RESULT <json>` を1行。exit code 0=pass, 1=fail。
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const [municipality, facility, roomName] = process.argv.slice(2);
if (!municipality || !facility) {
  console.error('Usage: node tools/repair/verify.ts <municipality> "<facility>" ["<roomName>"]');
  process.exit(2);
}

const failuresDir = path.join("test-results", municipality, "_failures");
// 前回の残骸を消し、今回の実行で出た失敗だけを読む。
await fs.rm(failuresDir, { recursive: true, force: true });

const grep = roomName ? `${facility} ${roomName}` : facility;

let pass = true;
try {
  execFileSync("npx", ["playwright", "test", municipality, "-g", grep, "--retries=0"], {
    stdio: "inherit",
  });
} catch {
  pass = false;
}

let failures: unknown[] = [];
try {
  const files = (await fs.readdir(failuresDir)).filter((f) => f.endsWith(".json"));
  failures = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(failuresDir, f), "utf8")))
  );
} catch {
  // _failures が無い（= 成功）なら空のまま
}

const result = { municipality, facility, roomName: roomName ?? null, pass, failures };
console.log("REPAIR_VERIFY_RESULT " + JSON.stringify(result));
process.exit(pass ? 0 : 1);
```

- [ ] **Step 2: 型チェックとフォーマット**

Run: `npm run typecheck -w @shisetsu-viewer/scraper && npx prettier --check packages/scraper/tools/repair/verify.ts`
Expected: エラーなし

- [ ] **Step 3: ハーネスが正常系で pass を返すことを確認（実サイト）**

Run: `cd packages/scraper && node tools/repair/verify.ts tokyo-kita "赤羽会館" "講堂"; echo "exit=$?"; cd ../..`
Expected: 末尾に `REPAIR_VERIFY_RESULT {...,"pass":true,"failures":[]}`、`exit=0`。

- [ ] **Step 4: ハーネスが破壊時に fail + 失敗レコードを返すことを確認（手動）**

`index.ts:41` の `"空き状況の確認"` を再度一時的に壊す。

Run: `cd packages/scraper && node tools/repair/verify.ts tokyo-kita "赤羽会館" "講堂"; echo "exit=$?"; cd ../..`
Expected: `REPAIR_VERIFY_RESULT {...,"pass":false,"failures":[{...}]}`、`exit=1`、`failures[0].classification` が `"structural"`。

確認後、`index.ts:41` を**元に戻す**。

- [ ] **Step 5: コミット**

```bash
git add packages/scraper/tools/repair/verify.ts
git commit -m "feat(scraper): add deterministic repair verification harness"
```

---

## Task 5: CI — 失敗アーティファクトのアップロードと集約 Issue

**Files:**
- Modify: `.github/actions/scrape/action.yml`
- Modify: `.github/workflows/scraper.yml`

- [ ] **Step 1: composite action に失敗レコードのアップロードを追加**

`.github/actions/scrape/action.yml` の末尾（`Save scraped data` ステップの後）に以下を追加する：

```yaml
    - name: Upload failure records
      if: ${{ always() }}
      uses: actions/upload-artifact@v4 # pin to SHA per repo convention
      with:
        name: failures-${{ inputs.shardIndex }}-${{ inputs.shardTotal }}
        path: packages/scraper/test-results/*/_failures/
        if-no-files-found: ignore
        overwrite: true
        retention-days: 7
```

補足: `overwrite: true` により、`retry_scrape` が同一シャードを再実行した場合は最新状態でアーティファクトを上書きする。`if-no-files-found: ignore` で失敗が無い時は無害にスキップ。

- [ ] **Step 2: scraper.yml に collect_failures ジョブを追加**

`.github/workflows/scraper.yml` の末尾（`retry_scrape` ジョブの後）に以下のジョブを追加する：

```yaml
  collect_failures:
    name: Collect structural failures
    runs-on: ubuntu-latest
    needs:
      - scrape
      - prepare_retry
      - retry_scrape
    if: ${{ !cancelled() }}
    permissions:
      contents: read
      issues: write
    steps:
      - name: Download failure artifacts
        uses: actions/download-artifact@v4 # pin to SHA per repo convention
        with:
          pattern: failures-*
          path: failures
          merge-multiple: true
      - name: Aggregate and upsert tracker issue
        uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const path = require('path');
            const MARKER = '<!-- scraper-repair-tracker -->';
            const TITLE = '[scraper-repair] 構造変化の疑い';

            const records = [];
            function walk(dir) {
              let entries = [];
              try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
              for (const e of entries) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) { walk(p); continue; }
                if (!e.name.endsWith('.json')) continue;
                try {
                  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
                  if (r && (r.classification === 'structural' || r.classification === 'unknown')) {
                    records.push(r);
                  }
                } catch (_) { /* skip malformed */ }
              }
            }
            walk('failures');

            const open = await github.paginate(github.rest.issues.listForRepo, {
              owner: context.repo.owner, repo: context.repo.repo, state: 'open', per_page: 100,
            });
            const tracker = open.find(
              (i) => i.title === TITLE && (i.body || '').includes(MARKER)
            );

            if (records.length === 0) {
              if (tracker) {
                await github.rest.issues.createComment({
                  owner: context.repo.owner, repo: context.repo.repo, issue_number: tracker.number,
                  body: '直近の定期実行で構造系失敗は検出されませんでした。自動クローズします。',
                });
                await github.rest.issues.update({
                  owner: context.repo.owner, repo: context.repo.repo, issue_number: tracker.number,
                  state: 'closed',
                });
              }
              return;
            }

            const runUrl =
              `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            let body = `${MARKER}\n\n`;
            body += `定期実行で **構造変化の疑い** がある失敗を検出しました（retry 後も解消せず）。\n\n`;
            body += `修復するには手元の Claude Code で \`/repair-scraper <municipality>\` を実行してください。\n\n`;
            body += `| 自治体 | 施設 | 失敗ステップ | 分類 | エラー |\n|---|---|---|---|---|\n`;
            for (const r of records) {
              const msg = String(r.errorMessage || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
              body += `| ${r.municipality} | ${r.facility} | ${r.failedStep} | ${r.classification} | ${msg} |\n`;
            }
            body += `\n[失敗時のアーティファクト（DOM/screenshot）をダウンロード](${runUrl})\n\n`;
            body += `_最終更新: run ${context.runId}_`;

            if (tracker) {
              await github.rest.issues.update({
                owner: context.repo.owner, repo: context.repo.repo, issue_number: tracker.number,
                body, state: 'open',
              });
            } else {
              await github.rest.issues.create({
                owner: context.repo.owner, repo: context.repo.repo, title: TITLE, body,
              });
            }
```

補足:
- ジョブ単位で `permissions: issues: write` を付与（トップレベルは `contents: read` のまま、最小権限）。
- `needs` に `retry_scrape` を含むが、失敗が無く `retry_scrape` がスキップされても `if: !cancelled()` により本ジョブは実行される。

- [ ] **Step 3: ワークフロー YAML の構文チェック**

Run: `npx --yes @action-validator/cli .github/workflows/scraper.yml 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/scraper.yml')); yaml.safe_load(open('.github/actions/scrape/action.yml')); print('YAML OK')"`
Expected: `YAML OK`（または action-validator がエラーなしで終了）

- [ ] **Step 4: コミット**

```bash
git add .github/actions/scrape/action.yml .github/workflows/scraper.yml
git commit -m "feat(ci): collect structural scraper failures into tracker issue"
```

---

## Task 6: /repair-scraper スラッシュコマンド（AI 修復ループ）

**Files:**
- Create: `.claude/commands/repair-scraper.md`

- [ ] **Step 1: コマンドファイルを作成**

`.claude/commands/repair-scraper.md`：

````markdown
---
description: 構造変化で壊れたスクレイパーを、実サイトで検証しながら自己修復し PR を作る。例：/repair-scraper tokyo-kita
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot
argument-hint: <municipality-slug>
---

# スクレイパー自己修復ワークフロー

あなたは施設予約システムのスクレイパー修復の専門家です。
構造変化（サイトの DOM 変更）で壊れたスクレイパーを、**実サイトで検証しながら**最小の差分で修復し、検証済みの修正 PR を作成します。

**最重要原則**: 検証を通っていない修正は PR にしない。各修正案は必ず決定論的ハーネス `tools/repair/verify.ts` で実サイト検証し、`validateTransformOutput()` が通ること（pass）を確認してから次に進む。

## 引数の解析

ユーザー入力: $ARGUMENTS

- 第1引数: `<prefecture>-<slug>` 形式の自治体（必須。例: `tokyo-kita`）

引数が無ければ AskUserQuestion で対象自治体を確認する。

## スクレイパーパッケージの規約

!cat packages/scraper/CLAUDE.md

## 手順

### フェーズ 1: 失敗スペックの把握

1. 失敗レコードを読む: `packages/scraper/test-results/<municipality>/_failures/*.json`
   - レコードが無い場合は、ユーザーに「CI のアーティファクト `failures-*` を `packages/scraper/test-results/<municipality>/_failures/` に展開してから再実行してください」と案内して停止する。
2. 各レコードの `failedStep` / `classification` / `errorMessage` / `validationErrors` / `domSnapshotPath` を確認。
3. `classification` が `transient` のみのレコードは修復対象外（retry で救済されるべきもの）。`structural` / `unknown` を対象とする。

### フェーズ 2: 原因特定

1. 現行スクレイパーを Read: `packages/scraper/<municipality>/index.ts`
2. 失敗レコードの `domSnapshotPath`（失敗時の HTML）を Read し、`index.ts` が期待するセレクタ（リンク名・XPath・ステータス記号など）が現在の DOM のどこに・どう変わったかを突き合わせる。
3. 必要なら **Playwright MCP** で実サイトを開いて最新構造を確認する（`browser_navigate` → `browser_snapshot`）。
4. 「どのセレクタが・何に変わったか」を1行で言語化する。推測が複数ある場合は最も確度の高いものから試す。

### フェーズ 3: 修復ループ（上限 5 回）

以下を pass するまで、または 5 回まで繰り返す:

1. `index.ts` に**最小の差分**で修正を適用（Edit）。マッピング（DIVISION_MAP/STATUS_MAP）の追加・セレクタ文字列の変更・テーブル XPath の修正など、原因に対応する一点のみ変更する。
2. 決定論ハーネスで実サイト検証:

   ```bash
   cd packages/scraper && node tools/repair/verify.ts <municipality> "<facility>" "<roomName>"; echo "exit=$?"; cd ../..
   ```

   - `<facility>` / `<roomName>` は失敗レコードの `facility` と `context.roomName`。
3. 出力末尾の `REPAIR_VERIFY_RESULT` の JSON を確認:
   - `pass: true` → この施設は修復成功。次の失敗施設へ。全施設が pass したらフェーズ 4 へ。
   - `pass: false` → `failures` 配列の新しい `errorMessage` / `validationErrors` を読み、フェーズ 2 に戻って次の仮説を立てる。
4. 5 回試しても pass しない施設があれば、フェーズ 5（エスカレーション）へ。

**型・lint の維持**: 修正後は `npm run typecheck -w @shisetsu-viewer/scraper` が通ること。pre-commit でも検証されるが、ループ中に都度確認してよい。

### フェーズ 4: PR 作成（全対象施設が検証済み pass のとき）

1. ブランチを作成:

   ```bash
   git switch -c fix/repair-<municipality>-$(date +%Y%m%d)
   ```

2. 変更をコミット（`index.ts` のみ）:

   ```bash
   git add packages/scraper/<municipality>/index.ts
   git commit -m "fix(scraper): repair <municipality> selectors after site change"
   ```

3. PR を作成（本文に before/after と検証ログを含める）:

   ```bash
   gh pr create --title "fix(scraper): repair <municipality> selectors" --body "$(cat <<'EOF'
## 背景
<municipality> のサイト構造変化により定期スクレイプが構造系失敗。

## 変更
- セレクタ修正: `<before>` → `<after>`（理由を1行）

## 検証
決定論ハーネス `tools/repair/verify.ts` により実サイトで検証済み（全対象施設 pass）:
- <facility> <roomName>: REPAIR_VERIFY_RESULT pass=true
- ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```

4. マージは人間が行う（このコマンドはマージしない）。

### フェーズ 5: エスカレーション（5 回で収束しない場合）

1. PR は作らない。
2. 何を試し、なぜ pass しなかったか（最後の `errorMessage` / `validationErrors`、残った仮説）を要約する。
3. tracker Issue（タイトル `[scraper-repair] 構造変化の疑い`）に `gh issue comment` でエスカレーション要約を追記し、人間に引き継ぐ:

   ```bash
   gh issue list --search '[scraper-repair] 構造変化の疑い in:title state:open'
   gh issue comment <issue-number> --body "<エスカレーション要約>"
   ```

## 完了報告

- 修復した自治体・施設
- セレクタの before/after と原因
- 検証結果（全施設 pass / 一部エスカレーション）
- 作成した PR 番号、またはエスカレーション内容
- 本コマンドの改善案
````

- [ ] **Step 2: フォーマットチェック**

Run: `npx prettier --check ".claude/commands/repair-scraper.md" || echo "prettier は md 対象外の可能性。スキップ可"`
Expected: エラーなし、またはスキップ

- [ ] **Step 3: コミット**

```bash
git add .claude/commands/repair-scraper.md
git commit -m "feat(scraper): add /repair-scraper self-healing command"
```

---

## Task 7: 仕上げ（全体検証とスペック更新）

**Files:**
- Modify: `docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md`

- [ ] **Step 1: 全ユニットテスト・型チェック・lint・format を通す**

Run:
```bash
npm run test:unit -w @shisetsu-viewer/scraper
npm run typecheck:all
npm run lint:all
npm run format:check:all
```
Expected: すべてエラーなし（unit tests は Task 1+2 の計 10 tests pass）

- [ ] **Step 2: スペックのステータスを更新**

`docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md:4` の
`- ステータス: 承認済み（実装計画へ移行）` を
`- ステータス: Phase 1 実装済み（tokyo-kita パイロット）` に変更する。

- [ ] **Step 3: コミット**

```bash
git add docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md
git commit -m "docs(scraper): mark self-healing phase 1 implemented"
```

---

## Self-Review メモ（実装者向け）

- **決定論レーンの不可侵**: Task 3/5 が追加するのは「失敗時の副作用（レコード保存・集約）」のみ。正常系のスクレイプ挙動・データアップロードは一切変えていない。
- **E2E 破壊実験（Task 3 Step 4 / Task 4 Step 4）は実サイトに依存**。サイトが一時的に落ちている場合は、`classification` が `transient` 寄りに出ることがある。その場合は壊し方を「リンク名変更」（locator タイムアウト = structural）に統一して再確認する。
- **将来の CI 自律化（Phase 2）**: `tools/repair/verify.ts` と `.claude/commands/repair-scraper.md` はそのまま `claude -p` から再利用できる。従量課金を許容する判断が出るまで着手しない（スコープ外）。
