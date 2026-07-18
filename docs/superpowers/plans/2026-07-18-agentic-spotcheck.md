# agentic spot check 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 実サイトの表示と D1 の保存値を突合する第三の検証層 `/spot-check`（決定論 plan → エージェント盲検観測 → 決定論 judge）を作り、あわせて `/repair-scraper` にライブ探索基準とコスト規律を追記する。

**Architecture:** 決定論スクリプトでエージェントを挟む 3 段パイプライン。`plan.ts` が parity tracker Issue の MISSING キーからサンプルを選び D1 期待値を取得、slash command のエージェントが Playwright MCP で実サイトの生表示を記録（期待値は見せない盲検）、`judge.ts` が独立記号表で突合して `SPOTCHECK_RESULT` を 1 行出力する。spec: `docs/superpowers/specs/2026-07-18-agentic-spotcheck-design.md`

**Tech Stack:** Node 24 の TS 直接実行（ビルドなし）、`node --test` ユニットテスト、`wrangler d1 execute --remote`（D1 読取）、`gh` CLI（Issue 読取）、Playwright MCP（エージェントのサイト観測）

## Global Constraints

- scraper パッケージの依存は `@playwright/test` と `date-fns` のみ。**新規依存を追加しない**（node 組込 + `@shisetsu-viewer/shared` import のみ使う）
- TypeScript は `erasableSyntaxOnly`。enum 構文や namespace を書かない。`as` キャストは避け、ガードで絞る
- typecheck は `npm run typecheck -w @shisetsu-viewer/scraper`（**素の `tsc` 禁止**）
- Prettier: printWidth 100、double quotes、trailing commas es5
- コミットは `PATH="$PWD/node_modules/.bin:$PATH" git commit ...`（`--no-verify` 禁止）。メッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 実装ブランチ: `feat/agentic-spotcheck`（master ベース）。**作業開始時に EnterWorktree で隔離する**（ユーザーの標準運用）
- D1 読取の前提: ローカルで `wrangler login` 済み。未ログインなら `! npx wrangler login` をユーザーに依頼する
- `test-results/` は gitignore 済み。spot check の出力（`test-results/_spotcheck/`）はコミットしない

## 前提知識（実装者向け）

- **parity tracker Issue**: タイトル `[parity] Hasura と D1 の乖離`、本文にマーカー `<!-- parity-tracker -->`。サンプル行は ```` ``` ```` ブロック内に `<target>: MISSING in D1: <institution_id> <date>` 形式（例: `tokyo-koutou: MISSING in D1: d1a12a0c-… 2026-12-01`）。自治体あたり最大 5 件
- **D1 スキーマ**: `reservations(institution_id TEXT, date TEXT, reservation TEXT(JSON), …)`、`institutions(id, municipality, building_system_name, institution_system_name, …)`。`reservation` は `{"RESERVATION_DIVISION_MORNING": "RESERVATION_STATUS_VACANT", …}` 形式の JSON テキスト
- **shared registry**（`@shisetsu-viewer/shared`）: `MUNICIPALITIES[key].reservationStatus` が enum → 表示ラベル（「空き」「予約あり」等）、`reservationDivision` が enum → 区分ラベル（「午前」「①」等）。`getMunicipalityBySlug(slug)` で slug から引ける
- **独立性の原則**（spec 参照）: judge は scraper の STATUS_MAP を import しない。期待値側のカテゴリ化は registry の表示ラベル、観測側は独自記号表と凡例で行う

---

### Task 1: symbolMap.ts（記号とラベルのカテゴリ化）

> 実装開始時にまず EnterWorktree（不可なら `git worktree`）で隔離し、master から `feat/agentic-spotcheck` を切ること。

**Files:**
- Create: `packages/scraper/tools/spotcheck/symbolMap.ts`
- Create: `packages/scraper/tools/spotcheck/symbolMap.test.ts`
- Modify: `packages/scraper/package.json:13`（test:unit の glob に `'tools/spotcheck/*.test.ts'` を追加）

**Interfaces:**
- Consumes: なし
- Produces: `type SlotCategory = "AVAILABLE" | "UNAVAILABLE" | "OUT_OF_SCOPE" | "UNKNOWN"` / `categorizeLabel(label: string): SlotCategory` / `categorizeSymbol(symbol: string, legend?: Readonly<Record<string, string>>): SlotCategory`

- [ ] **Step 1: test:unit の glob を拡張する**

`packages/scraper/package.json` の 13 行目を変更:

```json
    "test:unit": "node --test --test-isolation=none 'common/*.test.ts' 'tools/backend/*.test.ts' 'tools/spotcheck/*.test.ts'",
```

- [ ] **Step 2: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/symbolMap.test.ts`:

```ts
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
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`symbolMap.ts` が存在しない旨の import エラー）

- [ ] **Step 4: 実装を書く**

`packages/scraper/tools/spotcheck/symbolMap.ts`:

```ts
// spot check の記号・ラベルのカテゴリ化。scraper の STATUS_MAP から独立させる。
// STATUS_MAP 自体の誤りを検出したいのに判定に使うと同じ誤りを再現するため、
// 根拠は「予約システムで通用している記号」「サイトの凡例」「shared registry の表示ラベル」に限る。

export type SlotCategory = "AVAILABLE" | "UNAVAILABLE" | "OUT_OF_SCOPE" | "UNKNOWN";

const SYMBOL_CATEGORIES: Readonly<Record<string, SlotCategory>> = {
  "○": "AVAILABLE",
  "◯": "AVAILABLE",
  "〇": "AVAILABLE",
  "△": "AVAILABLE",
  "×": "UNAVAILABLE",
  "✕": "UNAVAILABLE",
  "✖": "UNAVAILABLE",
  "●": "UNAVAILABLE",
  "－": "OUT_OF_SCOPE",
  "-": "OUT_OF_SCOPE",
  "−": "OUT_OF_SCOPE",
  "ー": "OUT_OF_SCOPE",
  "＊": "OUT_OF_SCOPE",
  "*": "OUT_OF_SCOPE",
};

// UNAVAILABLE を先に置く（「空きなし」が「空き」に誤マッチしないように順序で優先度を表す）。
const LABEL_CATEGORIES: readonly (readonly [RegExp, SlotCategory])[] = [
  [/空きなし|予約あり|予約済|予約不可|使用中|音出し|抽選/, "UNAVAILABLE"],
  [/一部空き|空き/, "AVAILABLE"],
  [/休館|保守|点検|期間外|受付|対象外|閉館|休止/, "OUT_OF_SCOPE"],
];

export function categorizeLabel(label: string): SlotCategory {
  for (const [pattern, category] of LABEL_CATEGORIES) {
    if (pattern.test(label)) return category;
  }
  return "UNKNOWN";
}

export function categorizeSymbol(
  symbol: string,
  legend?: Readonly<Record<string, string>>
): SlotCategory {
  const trimmed = symbol.trim();
  const legendText = legend?.[trimmed];
  if (legendText !== undefined) {
    const byLegend = categorizeLabel(legendText);
    if (byLegend !== "UNKNOWN") return byLegend;
  }
  const bySymbol = SYMBOL_CATEGORIES[trimmed];
  if (bySymbol !== undefined) return bySymbol;
  // 記号でなく「予約あり」等の文言が直接表示されるサイト向けフォールバック。
  return categorizeLabel(trimmed);
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（既存テストすべて + 新規 4 件。`tools/spotcheck` の glob がここで効いていることも確認する）

- [ ] **Step 6: typecheck とコミット**

```bash
npm run typecheck -w @shisetsu-viewer/scraper
git add packages/scraper/tools/spotcheck/symbolMap.ts packages/scraper/tools/spotcheck/symbolMap.test.ts packages/scraper/package.json
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): spot check の独立記号表を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: sampling.ts（tracker Issue のパースとサンプル選定）

**Files:**
- Create: `packages/scraper/tools/spotcheck/sampling.ts`
- Create: `packages/scraper/tools/spotcheck/sampling.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `interface SampleKey { target: string; institutionId: string; date: string }` / `parseTrackerSamples(issueBody: string): SampleKey[]` / `selectSamples(opts: { trackerKeys: SampleKey[]; explicitKeys: SampleKey[]; municipalityFilter?: string | undefined; cap?: number | undefined }): SampleKey[]` / `SAMPLE_CAP = 12`

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/sampling.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTrackerSamples, selectSamples } from "./sampling.ts";

const BODY = `<!-- parity-tracker -->

定期実行で Hasura と D1 の予約データに **5 件の乖離** を検出しました。

| 自治体 | Hasura | D1 | MISSING | EXTRA | DIFF | STALE |
|---|---|---|---|---|---|---|
| tokyo-koutou | 5617 | 5576 | 2 | 0 | 0 | 39 |

<details><summary>サンプル（自治体あたり最大 5 件）</summary>

\`\`\`
tokyo-koutou: MISSING in D1: d1a12a0c-aaaa-bbbb-cccc-000000000001 2026-12-01
tokyo-koutou: MISSING in D1: d1a12a0c-aaaa-bbbb-cccc-000000000002 2026-12-02
tokyo-kita: MISSING in D1: 4c79dcb5-e7f1-18fd-8f9a-000000000003 2026-08-01
tokyo-kita: DIFF: 4c79dcb5-e7f1-18fd-8f9a-000000000003 2026-08-02
\`\`\`
</details>
`;

test("parseTrackerSamples は MISSING 行だけを抽出する", () => {
  const keys = parseTrackerSamples(BODY);
  assert.equal(keys.length, 3); // DIFF 行は対象外
  assert.deepEqual(keys[0], {
    target: "tokyo-koutou",
    institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000001",
    date: "2026-12-01",
  });
});

test("selectSamples は自治体ラウンドロビンで cap まで詰める", () => {
  const keys = parseTrackerSamples(BODY);
  const picked = selectSamples({ trackerKeys: keys, explicitKeys: [], cap: 2 });
  // 1 巡目で koutou と kita から 1 件ずつ取り、cap=2 で打ち切る
  assert.equal(picked.length, 2);
  assert.deepEqual(new Set(picked.map((k) => k.target)), new Set(["tokyo-koutou", "tokyo-kita"]));
});

test("selectSamples は明示キーを tracker より優先する", () => {
  const explicit = [
    { target: "tokyo-arakawa", institutionId: "28bbef1f-aaaa-bbbb-cccc-000000000009", date: "2026-07-19" },
  ];
  const picked = selectSamples({
    trackerKeys: parseTrackerSamples(BODY),
    explicitKeys: explicit,
  });
  assert.deepEqual(picked, explicit);
});

test("selectSamples は municipalityFilter で絞り、cap は 12 を超えない", () => {
  const keys = parseTrackerSamples(BODY);
  const filtered = selectSamples({
    trackerKeys: keys,
    explicitKeys: [],
    municipalityFilter: "tokyo-kita",
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.target, "tokyo-kita");

  const many = Array.from({ length: 30 }, (_, i) => ({
    target: "tokyo-koutou",
    institutionId: `id-${String(i).padStart(2, "0")}`,
    date: "2026-08-01",
  }));
  assert.equal(selectSamples({ trackerKeys: many, explicitKeys: [], cap: 99 }).length, 12);
});

test("selectSamples は入力順によらず決定論的に選ぶ", () => {
  const keys = parseTrackerSamples(BODY);
  const a = selectSamples({ trackerKeys: keys, explicitKeys: [], cap: 3 });
  const b = selectSamples({ trackerKeys: [...keys].reverse(), explicitKeys: [], cap: 3 });
  assert.deepEqual(a, b);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`sampling.ts` が存在しない）

- [ ] **Step 3: 実装を書く**

`packages/scraper/tools/spotcheck/sampling.ts`:

```ts
// parity tracker Issue のサンプル行から spot check のサンプルキーを選ぶ純関数群。
// 乱数は使わない。同じ Issue 本文からは常に同じサンプルが選ばれる（再実行で比較可能にするため）。

export interface SampleKey {
  target: string; // 例: "tokyo-koutou"
  institutionId: string;
  date: string; // "YYYY-MM-DD"
}

/** 1 実行あたりのサンプル数の上限。コスト規律によるハードキャップ（spec 参照）。 */
export const SAMPLE_CAP = 12;

// Issue 本文のサンプル行: `<target>: MISSING in D1: <institution_id> <date>`
// institution_id は非 RFC UUID を含むため [0-9a-fA-F-]+ で受ける（SQL に埋めるので厳格に検証する）。
const SAMPLE_LINE = /^([a-z]+-[a-z]+): MISSING in D1: ([0-9a-fA-F-]+) (\d{4}-\d{2}-\d{2})$/;

export function parseTrackerSamples(issueBody: string): SampleKey[] {
  const keys: SampleKey[] = [];
  for (const raw of issueBody.split("\n")) {
    const match = SAMPLE_LINE.exec(raw.trim());
    if (!match) continue;
    const [, target, institutionId, date] = match;
    if (target !== undefined && institutionId !== undefined && date !== undefined) {
      keys.push({ target, institutionId, date });
    }
  }
  return keys;
}

function compareKeys(a: SampleKey, b: SampleKey): number {
  return (
    a.target.localeCompare(b.target) ||
    a.institutionId.localeCompare(b.institutionId) ||
    a.date.localeCompare(b.date)
  );
}

export function selectSamples(opts: {
  trackerKeys: SampleKey[];
  explicitKeys: SampleKey[];
  municipalityFilter?: string | undefined;
  cap?: number | undefined;
}): SampleKey[] {
  const cap = Math.min(opts.cap ?? 8, SAMPLE_CAP);
  const pool = opts.explicitKeys.length > 0 ? opts.explicitKeys : opts.trackerKeys;
  const filtered =
    opts.municipalityFilter !== undefined
      ? pool.filter((k) => k.target === opts.municipalityFilter)
      : pool;

  // 自治体間で偏らないよう、ソートしてからラウンドロビンで詰める。
  const byTarget = new Map<string, SampleKey[]>();
  for (const key of [...filtered].sort(compareKeys)) {
    const group = byTarget.get(key.target);
    if (group) {
      group.push(key);
    } else {
      byTarget.set(key.target, [key]);
    }
  }
  const groups = [...byTarget.values()];
  const picked: SampleKey[] = [];
  for (let round = 0; picked.length < cap; round++) {
    let added = false;
    for (const group of groups) {
      if (picked.length >= cap) break;
      const item = group[round];
      if (item !== undefined) {
        picked.push(item);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS

- [ ] **Step 5: typecheck とコミット**

```bash
npm run typecheck -w @shisetsu-viewer/scraper
git add packages/scraper/tools/spotcheck/sampling.ts packages/scraper/tools/spotcheck/sampling.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): spot check のサンプル選定を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: judgeReport.ts(判定の純関数)

**Files:**
- Create: `packages/scraper/tools/spotcheck/judgeReport.ts`
- Create: `packages/scraper/tools/spotcheck/judgeReport.test.ts`

**Interfaces:**
- Consumes: Task 1 の `categorizeLabel` / `categorizeSymbol`
- Produces:

```ts
interface PlanSample {
  id: string; // `${target}:${institutionId}:${date}`
  target: string;
  institutionId: string;
  date: string;
  buildingSystemName: string;
  institutionSystemName: string;
}
interface ExpectedSample {
  id: string;
  reservation: Record<string, string> | null; // null = D1 に行なし
}
interface ObservedSample {
  id: string;
  reached: boolean;
  dateDisplayed: boolean;
  outOfWindow: boolean;
  cells: { divisionLabel: string; symbol: string }[];
  legend: Record<string, string> | null;
  url: string;
  screenshotPath: string;
  note: string;
}
type Verdict =
  | "MATCH" | "MISMATCH" | "SITE_HAS_DATA_D1_MISSING" | "SITE_NO_DATA"
  | "SITE_NO_DATA_D1_STALE" | "OUT_OF_WINDOW" | "UNREACHABLE" | "UNMAPPED";
interface SampleJudgement { id: string; verdict: Verdict; detail: string }
judgeSample(plan: PlanSample, expected: ExpectedSample | undefined, observed: ObservedSample | undefined): SampleJudgement
needsInvestigation(verdict: Verdict): boolean
```

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/judgeReport.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeSample, needsInvestigation } from "./judgeReport.ts";
import type { ExpectedSample, ObservedSample, PlanSample } from "./judgeReport.ts";

const PLAN: PlanSample = {
  id: "tokyo-koutou:d1a12a0c-aaaa-bbbb-cccc-000000000001:2026-12-01",
  target: "tokyo-koutou",
  institutionId: "d1a12a0c-aaaa-bbbb-cccc-000000000001",
  date: "2026-12-01",
  buildingSystemName: "豊洲文化センター",
  institutionSystemName: "音楽練習室",
};

function observed(overrides: Partial<ObservedSample>): ObservedSample {
  return {
    id: PLAN.id,
    reached: true,
    dateDisplayed: true,
    outOfWindow: false,
    cells: [],
    legend: null,
    url: "https://example.test/",
    screenshotPath: "screenshots/1.png",
    note: "",
    ...overrides,
  };
}

const EXPECTED_VACANT: ExpectedSample = {
  id: PLAN.id,
  reservation: {
    RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
    RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1", // koutou では「予約あり」
  },
};

test("全区分のカテゴリが一致すれば MATCH", () => {
  const result = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({
      cells: [
        { divisionLabel: "午前", symbol: "○" },
        { divisionLabel: "午後", symbol: "×" },
      ],
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("カテゴリが食い違えば MISMATCH で区分と両値を detail に載せる", () => {
  const result = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({
      cells: [
        { divisionLabel: "午前", symbol: "×" }, // D1 は VACANT
        { divisionLabel: "午後", symbol: "×" },
      ],
    })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /午前/);
  assert.match(result.detail, /RESERVATION_STATUS_VACANT/);
});

test("サイトに表示があり D1 に行が無ければ SITE_HAS_DATA_D1_MISSING", () => {
  const result = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: null },
    observed({ cells: [{ divisionLabel: "午前", symbol: "○" }] })
  );
  assert.equal(result.verdict, "SITE_HAS_DATA_D1_MISSING");
});

test("サイトにも D1 にも無ければ SITE_NO_DATA、D1 にだけあれば SITE_NO_DATA_D1_STALE", () => {
  const none = judgeSample(PLAN, { id: PLAN.id, reservation: null }, observed({ dateDisplayed: false }));
  assert.equal(none.verdict, "SITE_NO_DATA");
  const stale = judgeSample(PLAN, EXPECTED_VACANT, observed({ dateDisplayed: false }));
  assert.equal(stale.verdict, "SITE_NO_DATA_D1_STALE");
});

test("受付期間外は OUT_OF_WINDOW、未到達は UNREACHABLE、記録なしも UNREACHABLE", () => {
  const window = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: null },
    observed({ dateDisplayed: false, outOfWindow: true })
  );
  assert.equal(window.verdict, "OUT_OF_WINDOW");
  assert.equal(judgeSample(PLAN, EXPECTED_VACANT, observed({ reached: false })).verdict, "UNREACHABLE");
  assert.equal(judgeSample(PLAN, EXPECTED_VACANT, undefined).verdict, "UNREACHABLE");
});

test("未知の記号・未知の区分ラベルは UNMAPPED", () => {
  const symbol = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({ cells: [{ divisionLabel: "午前", symbol: "☆" }] })
  );
  assert.equal(symbol.verdict, "UNMAPPED");
  const division = judgeSample(
    PLAN,
    EXPECTED_VACANT,
    observed({ cells: [{ divisionLabel: "深夜", symbol: "○" }] })
  );
  assert.equal(division.verdict, "UNMAPPED");
});

test("凡例があれば記号表より優先される", () => {
  // 凡例が △=抽選申込あり（埋まり系）と言うサイトでは、D1 の STATUS_1（予約あり）と一致する
  const result = judgeSample(
    PLAN,
    { id: PLAN.id, reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1" } },
    observed({
      cells: [{ divisionLabel: "午前", symbol: "△" }],
      legend: { "△": "抽選申込あり" },
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("needsInvestigation は要調査の判定だけ true", () => {
  assert.equal(needsInvestigation("MATCH"), false);
  assert.equal(needsInvestigation("SITE_NO_DATA"), false);
  assert.equal(needsInvestigation("OUT_OF_WINDOW"), false);
  assert.equal(needsInvestigation("MISMATCH"), true);
  assert.equal(needsInvestigation("SITE_HAS_DATA_D1_MISSING"), true);
  assert.equal(needsInvestigation("SITE_NO_DATA_D1_STALE"), true);
  assert.equal(needsInvestigation("UNREACHABLE"), true);
  assert.equal(needsInvestigation("UNMAPPED"), true);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`judgeReport.ts` が存在しない）

- [ ] **Step 3: 実装を書く**

`packages/scraper/tools/spotcheck/judgeReport.ts`:

```ts
// spot check の判定半分。AI を含まない純関数（parityReport.ts と同じ役割分担）。
// 観測側（記号 + 凡例）と期待側（D1 enum + registry ラベル）を独立にカテゴリ化して比べる。
// scraper の STATUS_MAP は import しない（同じ誤りを再現して MATCH を出さないため）。
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";
import { categorizeLabel, categorizeSymbol } from "./symbolMap.ts";

export interface PlanSample {
  id: string;
  target: string;
  institutionId: string;
  date: string;
  buildingSystemName: string;
  institutionSystemName: string;
}

export interface ExpectedSample {
  id: string;
  reservation: Record<string, string> | null;
}

export interface ObservedSample {
  id: string;
  reached: boolean;
  dateDisplayed: boolean;
  outOfWindow: boolean;
  cells: { divisionLabel: string; symbol: string }[];
  legend: Record<string, string> | null;
  url: string;
  screenshotPath: string;
  note: string;
}

export type Verdict =
  | "MATCH"
  | "MISMATCH"
  | "SITE_HAS_DATA_D1_MISSING"
  | "SITE_NO_DATA"
  | "SITE_NO_DATA_D1_STALE"
  | "OUT_OF_WINDOW"
  | "UNREACHABLE"
  | "UNMAPPED";

export interface SampleJudgement {
  id: string;
  verdict: Verdict;
  detail: string;
}

/** exit code と報告の強調に使う。「人間の調査が要る判定」だけ true。 */
export function needsInvestigation(verdict: Verdict): boolean {
  return verdict !== "MATCH" && verdict !== "SITE_NO_DATA" && verdict !== "OUT_OF_WINDOW";
}

export function judgeSample(
  plan: PlanSample,
  expected: ExpectedSample | undefined,
  observed: ObservedSample | undefined
): SampleJudgement {
  const judgement = (verdict: Verdict, detail: string): SampleJudgement => ({
    id: plan.id,
    verdict,
    detail,
  });

  if (!observed || !observed.reached) {
    return judgement("UNREACHABLE", observed?.note || "観測記録なし");
  }
  const reservation = expected?.reservation ?? null;
  if (!observed.dateDisplayed) {
    if (observed.outOfWindow) {
      return judgement("OUT_OF_WINDOW", `サイトの受付期間外: ${plan.date}`);
    }
    return reservation === null
      ? judgement("SITE_NO_DATA", `サイトにも D1 にも ${plan.date} の表示がない`)
      : judgement("SITE_NO_DATA_D1_STALE", `サイトに ${plan.date} の表示が無いが D1 に行がある`);
  }
  if (reservation === null) {
    return judgement(
      "SITE_HAS_DATA_D1_MISSING",
      `サイトは ${plan.date} を表示しているが D1 に行がない（${observed.cells.length} 区分観測）`
    );
  }

  const slug = plan.target.split("-")[1];
  const municipality = slug !== undefined ? getMunicipalityBySlug(slug) : undefined;
  if (!municipality) {
    return judgement("UNMAPPED", `未知の自治体: ${plan.target}`);
  }
  const labelToDivision = new Map(
    Object.entries(municipality.reservationDivision).map(([division, label]) => [label, division])
  );

  const mismatches: string[] = [];
  for (const cell of observed.cells) {
    const division = labelToDivision.get(cell.divisionLabel);
    if (division === undefined) {
      return judgement("UNMAPPED", `区分ラベル不明: ${cell.divisionLabel}`);
    }
    const enumValue = reservation[division];
    if (enumValue === undefined) {
      mismatches.push(`${cell.divisionLabel}: D1 に区分なし`);
      continue;
    }
    const observedCategory = categorizeSymbol(cell.symbol, observed.legend ?? undefined);
    if (observedCategory === "UNKNOWN") {
      return judgement("UNMAPPED", `記号不明: ${cell.symbol}（凡例にも無い）`);
    }
    const expectedCategory = categorizeLabel(municipality.reservationStatus[enumValue] ?? "");
    if (expectedCategory === "UNKNOWN") {
      return judgement("UNMAPPED", `enum の表示ラベルをカテゴリ化できない: ${enumValue}`);
    }
    if (observedCategory !== expectedCategory) {
      mismatches.push(
        `${cell.divisionLabel}: サイト ${cell.symbol}(${observedCategory}) vs D1 ${enumValue}(${expectedCategory})`
      );
    }
  }
  return mismatches.length === 0
    ? judgement("MATCH", `${observed.cells.length} 区分一致`)
    : judgement("MISMATCH", mismatches.join(" / "));
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS

- [ ] **Step 5: typecheck とコミット**

```bash
npm run typecheck -w @shisetsu-viewer/scraper
git add packages/scraper/tools/spotcheck/judgeReport.ts packages/scraper/tools/spotcheck/judgeReport.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): spot check の判定純関数を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: plan.ts(段 1 の CLI)

**Files:**
- Create: `packages/scraper/tools/spotcheck/plan.ts`

**Interfaces:**
- Consumes: Task 2 の `parseTrackerSamples` / `selectSamples` / `SampleKey`、Task 3 の `PlanSample` / `ExpectedSample` 型（出力 JSON の形として）
- Produces: `test-results/_spotcheck/plan.json`（`{ samples: PlanSample[] }`）と `test-results/_spotcheck/expected.json`（`{ samples: ExpectedSample[] }`）。stdout 末尾に `SPOTCHECK_PLAN <json>`（`{ samples: number, planPath: string }`）

- [ ] **Step 1: 実装を書く**

CLI は gh / wrangler への薄い皮なのでユニットテストは書かない（純関数部分は Task 2/3 で担保済み。spec の方針）。動作確認は Step 2 の実 D1 実行で行う。

`packages/scraper/tools/spotcheck/plan.ts`:

```ts
// spot check の段 1。サンプル選定と D1 期待値取得。AI を含まない決定論スクリプト。
// 使い方（packages/scraper で実行）:
//   node tools/spotcheck/plan.ts [--municipality tokyo-koutou] [--key <institution_id>:<date>]... [--samples 8]
// 前提: gh 認証済み + wrangler login 済み（D1 読取に使う）。
// 出力: test-results/_spotcheck/plan.json（エージェント用・期待値なし）/ expected.json（judge 用）。
// エージェントに期待値を見せない盲検構成のため、D1 読取は必ずこのスクリプトの中で行う。
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";
import type { ExpectedSample, PlanSample } from "./judgeReport.ts";
import { parseTrackerSamples, selectSamples, type SampleKey } from "./sampling.ts";

const OUT_DIR = path.join("test-results", "_spotcheck");
const TRACKER_MARKER = "<!-- parity-tracker -->";
const WRANGLER_CONFIG = path.join("..", "api", "wrangler.jsonc");

const { values } = parseArgs({
  options: {
    municipality: { type: "string" },
    key: { type: "string", multiple: true },
    samples: { type: "string" },
  },
});

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(2);
}

function d1Query<T>(sql: string): T[] {
  let out = "";
  try {
    out = execFileSync(
      "npx",
      ["wrangler", "d1", "execute", "shisetsu-db", "--remote", "--json", "--config", WRANGLER_CONFIG, "--command", sql],
      { encoding: "utf8", timeout: 120_000 }
    );
  } catch (e) {
    fail(
      `wrangler d1 execute に失敗しました。未ログインの場合は「! npx wrangler login」を実行してください。\n${String(e)}`
    );
  }
  // wrangler がバナー等を先頭に出す場合に備え、JSON 配列の開始位置から読む。
  const start = out.indexOf("[");
  if (start < 0) fail(`wrangler の出力に JSON がありません:\n${out}`);
  const parsed = JSON.parse(out.slice(start)) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

function quote(value: string): string {
  // SampleKey は正規表現で [0-9a-fA-F-] / 日付形式に検証済みだが、防御として引用符を重ねる。
  return `'${value.replaceAll("'", "''")}'`;
}

function fetchTrackerBody(): string | null {
  try {
    const out = execFileSync(
      "gh",
      ["issue", "list", "--state", "open", "--limit", "100", "--json", "body"],
      { encoding: "utf8" }
    );
    const issues = JSON.parse(out) as { body: string }[];
    return issues.find((issue) => issue.body.includes(TRACKER_MARKER))?.body ?? null;
  } catch {
    return null; // gh 不調は乱択フォールバックで続行する
  }
}

function parseExplicitKeys(raw: string[], municipality: string | undefined): SampleKey[] {
  return raw.map((entry) => {
    const [institutionId, date] = entry.split(":");
    if (!institutionId || !date || !/^[0-9a-fA-F-]+$/.test(institutionId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fail(`--key の形式が不正です（<institution_id>:<YYYY-MM-DD>）: ${entry}`);
    }
    if (!municipality) {
      fail("--key を使うときは --municipality も指定してください（施設名解決に使います）");
    }
    return { target: municipality, institutionId, date };
  });
}

/** target（tokyo-koutou）→ D1 の municipality 値（MUNICIPALITY_KOUTOU）。parity.ts と同じ変換。 */
function municipalityValue(target: string): string {
  const slug = target.split("-")[1];
  if (!slug) fail(`不正な自治体指定: ${target}`);
  return `MUNICIPALITY_${slug.toUpperCase()}`;
}

interface InstitutionRow {
  id: string;
  municipality: string;
  building_system_name: string;
  institution_system_name: string;
}
interface ReservationRow {
  institution_id: string;
  date: string;
  reservation: string;
}
interface FallbackRow extends ReservationRow {
  building_system_name: string;
  institution_system_name: string;
}

const explicitKeys = parseExplicitKeys(values.key ?? [], values.municipality);
const trackerBody = explicitKeys.length > 0 ? null : fetchTrackerBody();
const trackerKeys = trackerBody ? parseTrackerSamples(trackerBody) : [];
const cap = values.samples !== undefined ? Number(values.samples) : undefined;
if (cap !== undefined && (!Number.isInteger(cap) || cap < 1)) fail("--samples は正の整数で指定してください");

const keys = selectSamples({
  trackerKeys,
  explicitKeys,
  municipalityFilter: values.municipality,
  cap,
});

// 乖離ゼロ（または tracker 不在）のときの乱択フォールバック。
// CI 除外自治体（scraperCiExcluded）は外すが、--municipality の明示指定は除外より優先する
// （resolveParityTargets と同じ規則）。各自治体の先頭 1 施設 × 直近日を決定論的に取る。
const fallbackNames = new Map<string, { building: string; institution: string }>();
if (keys.length === 0) {
  const targets =
    values.municipality !== undefined
      ? [values.municipality]
      : Object.values<MunicipalityConfig>(MUNICIPALITIES)
          .filter((m) => !m.reservationExcluded && !m.scraperCiExcluded)
          .map((m) => `${m.prefecture}-${m.slug}`);
  for (const target of targets) {
    if (keys.length >= (cap ?? 8)) break;
    const rows = d1Query<FallbackRow>(
      `SELECT r.institution_id, r.date, r.reservation, i.building_system_name, i.institution_system_name
       FROM reservations r JOIN institutions i ON i.id = r.institution_id
       WHERE i.municipality = ${quote(municipalityValue(target))} AND r.date >= date('now')
       ORDER BY r.institution_id, r.date LIMIT 1`
    );
    const row = rows[0];
    if (row) {
      keys.push({ target, institutionId: row.institution_id, date: row.date });
      fallbackNames.set(row.institution_id, {
        building: row.building_system_name,
        institution: row.institution_system_name,
      });
    }
  }
}
if (keys.length === 0) fail("サンプルを 1 件も選べませんでした（tracker も D1 も空）");

// 施設名の解決と期待値の取得。
const ids = [...new Set(keys.map((k) => k.institutionId))];
const institutions = new Map(
  d1Query<InstitutionRow>(
    `SELECT id, municipality, building_system_name, institution_system_name
     FROM institutions WHERE id IN (${ids.map(quote).join(",")})`
  ).map((row) => [row.id, row])
);
const pairPredicate = keys
  .map((k) => `(institution_id = ${quote(k.institutionId)} AND date = ${quote(k.date)})`)
  .join(" OR ");
const reservations = new Map(
  d1Query<ReservationRow>(
    `SELECT institution_id, date, reservation FROM reservations WHERE ${pairPredicate}`
  ).map((row) => [`${row.institution_id}:${row.date}`, row.reservation])
);

const planSamples: PlanSample[] = [];
const expectedSamples: ExpectedSample[] = [];
for (const key of keys) {
  const inst = institutions.get(key.institutionId);
  const names = fallbackNames.get(key.institutionId);
  if (!inst && !names) {
    console.warn(`WARN: institution が D1 に無いためスキップ: ${key.institutionId}`);
    continue;
  }
  const id = `${key.target}:${key.institutionId}:${key.date}`;
  planSamples.push({
    id,
    target: key.target,
    institutionId: key.institutionId,
    date: key.date,
    buildingSystemName: inst?.building_system_name ?? names?.building ?? "",
    institutionSystemName: inst?.institution_system_name ?? names?.institution ?? "",
  });
  const raw = reservations.get(`${key.institutionId}:${key.date}`);
  expectedSamples.push({
    id,
    reservation: raw !== undefined ? (JSON.parse(raw) as Record<string, string>) : null,
  });
}

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(path.join(OUT_DIR, "observed"), { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
const planPath = path.join(OUT_DIR, "plan.json");
await fs.writeFile(planPath, JSON.stringify({ samples: planSamples }, null, 2));
await fs.writeFile(
  path.join(OUT_DIR, "expected.json"),
  JSON.stringify({ samples: expectedSamples }, null, 2)
);
console.log(`SPOTCHECK_PLAN ${JSON.stringify({ samples: planSamples.length, planPath })}`);
```

- [ ] **Step 2: typecheck を通す**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし

- [ ] **Step 3: 実 D1 で動作確認する**

```bash
cd packages/scraper && node tools/spotcheck/plan.ts --samples 2; cd ../..
cat packages/scraper/test-results/_spotcheck/plan.json
cat packages/scraper/test-results/_spotcheck/expected.json
```

Expected: `SPOTCHECK_PLAN {"samples":2,...}` が出力され、plan.json に施設名と日付、expected.json に reservation（または null）が入っている。plan.json に reservation キーが**含まれていない**ことを目視確認する（盲検の要）。
wrangler の JSON 出力形式が想定（配列先頭の `results`）と違う場合はここで `d1Query` のパースを実測に合わせて直す。

- [ ] **Step 4: コミット**

```bash
git add packages/scraper/tools/spotcheck/plan.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): spot check の plan CLI を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: judge.ts(段 3 の CLI)

**Files:**
- Create: `packages/scraper/tools/spotcheck/judge.ts`

**Interfaces:**
- Consumes: Task 3 の `judgeSample` / `needsInvestigation` と各型、Task 4 の出力ファイル
- Produces: stdout 末尾に `SPOTCHECK_RESULT <json>` 1 行（`{ judgements: SampleJudgement[], counts: Record<Verdict, number>, investigate: number }`）。exit 0 = 要調査なし、1 = 要調査あり、2 = 入力不備

- [ ] **Step 1: 実装を書く**

`packages/scraper/tools/spotcheck/judge.ts`:

```ts
// spot check の段 3。expected と observed を突合する決定論スクリプト。AI を含まない。
// 使い方（packages/scraper で実行）: node tools/spotcheck/judge.ts
// 入力: test-results/_spotcheck/{plan.json, expected.json, observed/*.json}
// 出力: stdout 末尾に `SPOTCHECK_RESULT <json>` 1 行。exit 0=要調査なし, 1=要調査あり, 2=入力不備。
import fs from "node:fs/promises";
import path from "node:path";
import {
  judgeSample,
  needsInvestigation,
  type ExpectedSample,
  type ObservedSample,
  type PlanSample,
  type SampleJudgement,
} from "./judgeReport.ts";

const OUT_DIR = path.join("test-results", "_spotcheck");

async function readJson<T>(file: string): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    console.error(`ERROR: ${file} を読めません（plan.ts → エージェント観測の順で実行してください）: ${String(e)}`);
    process.exit(2);
  }
}

const plan = await readJson<{ samples: PlanSample[] }>(path.join(OUT_DIR, "plan.json"));
const expected = await readJson<{ samples: ExpectedSample[] }>(path.join(OUT_DIR, "expected.json"));
const expectedById = new Map(expected.samples.map((s) => [s.id, s]));

const observedById = new Map<string, ObservedSample>();
const observedDir = path.join(OUT_DIR, "observed");
let observedFiles: string[] = [];
try {
  observedFiles = (await fs.readdir(observedDir)).filter((f) => f.endsWith(".json"));
} catch {
  // observed が 1 件も無いのは全滅（全 UNREACHABLE）として扱う。
}
for (const file of observedFiles) {
  const sample = await readJson<ObservedSample>(path.join(observedDir, file));
  observedById.set(sample.id, sample);
}

const judgements: SampleJudgement[] = plan.samples.map((sample) =>
  judgeSample(sample, expectedById.get(sample.id), observedById.get(sample.id))
);

const counts: Record<string, number> = {};
for (const j of judgements) {
  counts[j.verdict] = (counts[j.verdict] ?? 0) + 1;
  const flag = needsInvestigation(j.verdict) ? "!" : " ";
  console.log(`${flag} ${j.verdict.padEnd(26)} ${j.id} ${j.detail}`);
}
const investigate = judgements.filter((j) => needsInvestigation(j.verdict)).length;

console.log(`SPOTCHECK_RESULT ${JSON.stringify({ judgements, counts, investigate })}`);
process.exit(investigate > 0 ? 1 : 0);
```

- [ ] **Step 2: typecheck を通す**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし

- [ ] **Step 3: フィクスチャでスモークテストする**

```bash
cd packages/scraper
mkdir -p test-results/_spotcheck/observed
cat > test-results/_spotcheck/plan.json <<'EOF'
{ "samples": [{ "id": "tokyo-koutou:aaa-1:2026-08-01", "target": "tokyo-koutou", "institutionId": "aaa-1", "date": "2026-08-01", "buildingSystemName": "テスト会館", "institutionSystemName": "音楽室" }] }
EOF
cat > test-results/_spotcheck/expected.json <<'EOF'
{ "samples": [{ "id": "tokyo-koutou:aaa-1:2026-08-01", "reservation": { "RESERVATION_DIVISION_MORNING": "RESERVATION_STATUS_VACANT" } }] }
EOF
cat > test-results/_spotcheck/observed/0.json <<'EOF'
{ "id": "tokyo-koutou:aaa-1:2026-08-01", "reached": true, "dateDisplayed": true, "outOfWindow": false, "cells": [{ "divisionLabel": "午前", "symbol": "○" }], "legend": null, "url": "https://example.test/", "screenshotPath": "screenshots/0.png", "note": "" }
EOF
node tools/spotcheck/judge.ts; echo "exit=$?"
cd ../..
```

Expected: `MATCH` 1 行と `SPOTCHECK_RESULT {"judgements":[...],"counts":{"MATCH":1},"investigate":0}`、`exit=0`。
続けて observed/0.json の symbol を `"×"` に変えて再実行し、`MISMATCH` + `exit=1` になることを確認する。

- [ ] **Step 4: コミット**

```bash
git add packages/scraper/tools/spotcheck/judge.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): spot check の judge CLI を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: /spot-check コマンド

**Files:**
- Create: `.claude/commands/spot-check.md`

**Interfaces:**
- Consumes: Task 4 の `SPOTCHECK_PLAN` と plan.json、Task 5 の `SPOTCHECK_RESULT`、`ObservedSample` 型（observed/*.json の形式）
- Produces: なし（終端の手順書）

- [ ] **Step 1: コマンドファイルを書く**

`.claude/commands/spot-check.md`:

````markdown
---
description: 実サイトの空き表示と D1 の保存値を少数サンプルで突合し、silent failure を検出する。例：/spot-check tokyo-koutou
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot
argument-hint: "[municipality-slug] [--key <institution_id>:<date>]... [--samples N]"
---

# agentic spot check ワークフロー

あなたは施設予約データの検証者です。
実サイトの空き状況表示を人間のように読み取り、D1 の保存値と突合します。
設計は `docs/superpowers/specs/2026-07-18-agentic-spotcheck-design.md` にあります。

**最重要原則（盲検）**: あなたは D1 の期待値（`expected.json`）を**絶対に読まない**。
期待値を知ると観測がそれに引っ張られ、silent failure 検出器としての独立性が失われる。
あなたの仕事は「サイトに表示されているものをそのまま記録する」ことだけで、判定は決定論スクリプト `judge.ts` が行う。

同じ理由で、スクレイパーの `STATUS_MAP` / `DIVISION_MAP` の**値の解釈を観測に使わない**。
スクレイパーのファイルを開いてよいのは、サイト URL と対象施設への到達経路を知る目的に限る。

## 引数の解析

ユーザー入力: $ARGUMENTS

- 第1引数（省略可）: `<prefecture>-<slug>` 形式の自治体。`plan.ts` に `--municipality` として渡す
- `--key` / `--samples` はそのまま `plan.ts` へパススルー

## フェーズ 1: plan（決定論）

```bash
cd packages/scraper && node tools/spotcheck/plan.ts <引数をパススルー>; cd ../..
```

- `SPOTCHECK_PLAN` の JSON からサンプル数を確認し、`test-results/_spotcheck/plan.json` を Read する
- エラーで止まったら（wrangler 未ログイン等）、メッセージをそのままユーザーに伝えて停止する

## フェーズ 2: サイト観測（Playwright MCP）

plan.json の各サンプル（`id` / `target` / `date` / `buildingSystemName` / `institutionSystemName`）について:

1. その自治体のサイト URL と到達経路を知るために `packages/scraper/<target>/index.ts` を Read する（エンジン使用時はエンジンファイルも）。**STATUS_MAP の解釈は読み取っても使わない**
2. `browser_navigate` でサイトを開き、対象施設（buildingSystemName / institutionSystemName）の `date` の空き状況ページへ遷移する
3. 表示を記録する:
   - 区分ごとの**生の記号・文言**（「○」「×」「予約あり」等）を、画面の区分ラベル（「午前」「①」等）と対にして記録する
   - ページに凡例（「○=空き」等）があれば `legend` に記録する
   - `browser_take_screenshot` で `test-results/_spotcheck/screenshots/<連番>.png` に保存する
4. サンプルごとに `test-results/_spotcheck/observed/<連番>.json` を Write する（1 サンプル 1 ファイル）:

```json
{
  "id": "<plan.json の id>",
  "reached": true,
  "dateDisplayed": true,
  "outOfWindow": false,
  "cells": [{ "divisionLabel": "午前", "symbol": "○" }],
  "legend": { "○": "空き", "×": "予約あり" },
  "url": "<観測したページの URL>",
  "screenshotPath": "screenshots/<連番>.png",
  "note": ""
}
```

- 対象日がカレンダーに表示されない場合: `dateDisplayed: false`。それがサイトの受付期間（表示可能な日付範囲）の外だからなら `outOfWindow: true` とし、`note` に受付期間を書く
- 到達失敗は 1 サンプルにつき**試行 2 回まで**。2 回失敗したら `reached: false` + `note` に状況を書いて次のサンプルへ進む（深追いしない）

**コスト規律**:

- タブは 1 つを使い回す
- `browser_snapshot` はページ遷移ごとに 1 回まで。同一ページを再 snapshot しない
- observed はサンプルごとに逐次 Write し、snapshot の内容を会話に持ち越さない

## フェーズ 3: judge(決定論)

```bash
cd packages/scraper && node tools/spotcheck/judge.ts; echo "exit=$?"; cd ../..
```

`SPOTCHECK_RESULT` の JSON を読む。

## フェーズ 4: 報告

1. 判定の表（verdict / サンプル / detail / スクショパス）を提示する
2. 原因層の推論を添える:
   - `MISMATCH` → スクレイパー解釈バグの疑い。該当自治体の STATUS_MAP と観測記号を並べて指摘する
   - `SITE_HAS_DATA_D1_MISSING` → 書き込み経路バグの疑い。`gh issue view` で parity tracker Issue の現況（Hasura 側の有無）と突き合わせる
   - `SITE_NO_DATA` → parity の STALE 境界（updated_at）では拾えない遺物の存在を示す。ゲート基準の再検討材料
   - `UNREACHABLE` が過半 → サイト構造変化の疑い。`/repair-scraper <municipality>` を提案する
3. AskUserQuestion で parity tracker Issue へ結果コメントを追記するか確認し、希望があれば `gh issue comment` で判定表を追記する

## 完了報告

- サンプル数と判定の内訳（counts）
- 要調査（investigate > 0）の各サンプルの詳細と推論
- スクリーンショットの場所
- 本コマンドの改善案
````

- [ ] **Step 2: コミット**

```bash
git add .claude/commands/spot-check.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat: /spot-check コマンドを追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: repair-scraper.md の改修(ライブ探索基準とコスト規律)

**Files:**
- Modify: `.claude/commands/repair-scraper.md:39-41`(フェーズ 2 手順 2〜3)

**Interfaces:**
- Consumes: なし
- Produces: なし(手順書の改修)

- [ ] **Step 1: フェーズ 2 手順 2〜3 を置き換える**

現在の手順 2〜3:

```markdown
2. 失敗レコードの `domSnapshotPath`（失敗時の HTML）を Read し、スクレイパーが期待するセレクタ（リンク名・XPath・ステータス記号など）が現在の DOM のどこに・どう変わったかを突き合わせる。
3. 必要なら **Playwright MCP** で実サイトを開いて最新構造を確認する（`browser_navigate` → `browser_snapshot`）。
```

これを次に置き換える:

```markdown
2. 失敗レコードの `domSnapshotPath`（失敗時の HTML）と現行セレクタを突き合わせる。**コスト規律**: キャプチャ HTML は丸ごと Read しない。まず Grep で失敗セレクタ（リンク名・XPath・ステータス記号など）の周辺行番号を特定し、offset/limit 付きで部分 Read する。同一キャプチャを再度読み直さない（コストの大半は既読内容の再送で発生する）。
3. 次のどちらかに該当したら、**Playwright MCP** のライブ探索に切り替える（`browser_navigate` → `browser_snapshot`。同一ページの再 snapshot はしない）:
   - キャプチャ DOM との突き合わせで仮説が立たない
   - フェーズ 3 の verify が 2 回連続で fail した
   静的キャプチャからの状態再構築は多段遷移で壊れやすく、ライブビューの方が堅牢である。全面リニューアル（手順 5）の判定根拠にもライブ探索の結果を使う。
```

- [ ] **Step 2: 変更後の整合を目視確認する**

Run: `grep -n "コスト規律\|ライブ探索" .claude/commands/repair-scraper.md`
Expected: 手順 2 と 3 にそれぞれ 1 箇所ずつ現れる。フェーズ 3 の「5 回試しても pass しない」等、他の手順番号への参照が壊れていないことを確認する。

- [ ] **Step 3: コミット**

```bash
git add .claude/commands/repair-scraper.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "docs: /repair-scraper にライブ探索基準とコスト規律を追記

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: PR 作成と初回実運用(#1622 サンプル)

**Files:**
- なし(実行と PR)

**Interfaces:**
- Consumes: Task 1〜7 の全成果物
- Produces: PR、および初回実運用の結果(spec への追記は結果を見て別コミット)

- [ ] **Step 1: 全チェックを回す**

```bash
npm run test:unit -w @shisetsu-viewer/scraper
npm run typecheck:all
npm run lint:all
npm run format:check:all
```

Expected: すべて成功

- [ ] **Step 2: PR を作成する**

```bash
git push -u origin feat/agentic-spotcheck
gh pr create --title "feat(scraper): agentic spot check（実サイトと D1 の実地照合）" --body "$(cat <<'EOF'
## 背景

Slack engineering の agentic testing の知見適用。spec: `docs/superpowers/specs/2026-07-18-agentic-spotcheck-design.md`

スクレイプテスト（コードの手順検証）とパリティ CI（Hasura↔D1）のどちらも「保存データが現実と一致するか」を検証しない。/spot-check はこの空白を埋める第三の検証層で、直近は Issue #1622 の原因層の切り分けに使う。

## 変更

- `tools/spotcheck/`: plan.ts（決定論サンプル選定 + D1 期待値）/ judge.ts（決定論突合）/ symbolMap.ts・sampling.ts・judgeReport.ts（純関数 + node --test）
- `.claude/commands/spot-check.md`: エージェントの盲検観測手順（Playwright MCP）
- `.claude/commands/repair-scraper.md`: ライブ探索のエスカレーション基準とコスト規律を追記

## 検証

- ユニットテスト（test:unit）: symbolMap / sampling / judgeReport 全 pass
- plan.ts は実 D1 で動作確認済み（SPOTCHECK_PLAN 出力・盲検分離を目視確認）
- judge.ts はフィクスチャで MATCH/MISMATCH と exit code を確認済み

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: 初回実運用(マージ後でも可)**

`/spot-check` を引数なしで実行する（tracker Issue #1622 の MISSING サンプルが既定で選ばれる）。
結果（特に `SITE_HAS_DATA_D1_MISSING` か `SITE_NO_DATA` か）を確認し、判定に応じて:

- `SITE_HAS_DATA_D1_MISSING` → dual-write 書き込み経路（`d1Api.upsertReservations` のチャンク欠落等）の調査タスクを起こす
- `SITE_NO_DATA` → parity の STALE 境界の再検討を Issue #1622 にコメントする

結果の要約を `docs/superpowers/specs/2026-07-18-agentic-spotcheck-design.md` の末尾に「初回実運用の記録」として追記し、コミットする。

---

## 実行順とレビュー境界

Task 1 → 2 → 3 は純関数のみで独立にレビュー可能。Task 4 → 5 は CLI（実 D1 / フィクスチャで確認）。Task 6 → 7 は手順書。Task 8 が統合。
Task 7 は他タスクと独立なので、先に単独で進めてもよい。
