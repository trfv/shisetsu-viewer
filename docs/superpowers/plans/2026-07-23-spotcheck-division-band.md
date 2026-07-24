# spot check 区分ラベル band 照合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** spot check の judge が、サイトの時間帯レンジ表示（`09:00 ～ 12:00` 等）と registry の抽象区分ラベル（`午前`/`午後`/`夜間`）を、時刻の独立解釈だけで同じ時間帯バンドに畳んで突合できるようにし、arakawa / ota / chuo の `UNMAPPED（区分ラベル不明）` を解消する。

**Architecture:** 新規純関数モジュール `divisionBand.ts` が「時刻レンジ文字列 → 開始時（hour）→ band」と「区分 enum 名 → band」を提供する。`judgeReport.ts` はサンプルごとにモードを自動判別する（exact 優先、不成立かつ全セルが時刻レンジなら band）。band モードでは observed 側と D1 側をそれぞれ band ごとの `SlotCategory` マルチセットに畳んで比較する。scraper の `DIVISION_MAP` / `STATUS_MAP` は import しない（盲検の維持）。

**Tech Stack:** TypeScript 7（`tsc` 型検査のみ、ビルドなし）/ Node 組込テストランナー `node --test` / oxlint + oxfmt。追加依存なし。

## Global Constraints

- **judge は `DIVISION_MAP` / `STATUS_MAP` を import しない。** 検出器の独立性（盲検）の核心。`packages/scraper/tokyo-*/index.ts` からの import を新規に足してはならない。
- **registry (`packages/shared/registry.ts`) と各自治体の `DIVISION_MAP` は変更しない。** フラグ追加もしない。
- **exact モードは現行動作を 1 バイトも変えない**（`normalizeDivisionLabel` の内部空白除去を除く）。kita / koutou / toshima / edogawa / kawasaki が退行しないこと。
- band 境界は開始時刻ベースの固定値: `< 12 → morning` / `< 17 → afternoon` / それ以外 → `evening`。
- 想定外は握り潰さず `UNMAPPED` を返す（band モードで `parseStartHour` が `null`、`bandFromDivisionEnum` が `null`、`categorizeSymbol` が `UNKNOWN`）。
- ファイル名・コメントは日本語。コメントは「なぜ」を書く（既存 `symbolMap.ts` / `observeCore.ts` の密度に合わせる）。
- oxfmt 設定: printWidth 100, double quotes, trailing commas es5, sortImports。
- 作業ディレクトリは worktree `/Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band`。ブランチ `worktree-spotcheck-division-band`。**master に直 push しない。**
- コミットは `PATH="$PWD/node_modules/.bin:$PATH" git commit ...` で行う（非対話シェルで pre-commit がコマンド解決に失敗するため）。`--no-verify` は使わない。

## File Structure

| ファイル | 責務 |
|---|---|
| `packages/scraper/tools/spotcheck/divisionBand.ts`（新規） | 時刻レンジ文字列と区分 enum 名を band に畳む純関数。`symbolMap.ts` と同じ「独立知識だけを根拠にする純関数」の位置づけ |
| `packages/scraper/tools/spotcheck/divisionBand.test.ts`（新規） | 上記のユニットテスト。実データ（sample-dumps / registry）由来のラベルを literal で持つ |
| `packages/scraper/tools/spotcheck/judgeReport.ts`（変更） | モード自動判別と band 突合。`normalizeDivisionLabel` の内部空白除去 |
| `packages/scraper/tools/spotcheck/judgeReport.test.ts`（変更） | band モードの判定テストを追加。既存 exact テストは無変更で通ること |
| `docs/superpowers/specs/2026-07-23-spotcheck-division-band-design.md` | 既存。変更しない |

---

### Task 1: `divisionBand.ts` — 時刻とバンドの純関数

**Files:**
- Create: `packages/scraper/tools/spotcheck/divisionBand.ts`
- Test: `packages/scraper/tools/spotcheck/divisionBand.test.ts`

**Interfaces:**
- Consumes: なし（他モジュールに依存しない純関数モジュール）
- Produces:
  - `export type Band = "morning" | "afternoon" | "evening"`
  - `export function parseStartHour(label: string): number | null`
  - `export function bandFromHour(hour: number): Band`
  - `export function bandFromDivisionEnum(division: string): Band | null`

**背景（実装者向け）:** 対象自治体のサイトが実際に出す区分ラベルは以下（退避済み sample-dumps の実測値）。表記が三者三様なので正規化が要る。

- arakawa: `"09:00\n～\n12:00"` `"12:15\n～\n15:15"` `"15:30\n～\n18:30"` `"18:45\n～\n21:45"`（改行込み・全角波ダッシュ）
- ota: `"09:00 - 12:00"` `"13:00 - 17:00"` `"18:00 - 22:00"`（半角ハイフン・前後空白）
- chuo: `"9:00-12:00"` `"13:00-17:00"` `"18:00-21:00"`（区切りなし・時が 1 桁）

区分 enum の実在値は registry から: `RESERVATION_DIVISION_MORNING` / `_AFTERNOON` / `_AFTERNOON_ONE` / `_AFTERNOON_TWO` / `_EVENING` / `_EVENING_ONE` / `_EVENING_TWO` / `_MORNING_ONE` / `_MORNING_TWO`（koutou）/ `_DIVISION_1`〜`_DIVISION_5`（kita）/ `_INVALID`。`_DIVISION_N` と `_INVALID` は band に畳めないので `null`。

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/divisionBand.test.ts` を新規作成:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { bandFromDivisionEnum, bandFromHour, parseStartHour } from "./divisionBand.ts";

test("parseStartHour は 3 自治体の実表記から開始時を取り出す", () => {
  // tokyo-arakawa（改行込み・全角波ダッシュ）
  assert.equal(parseStartHour("09:00\n～\n12:00"), 9);
  assert.equal(parseStartHour("12:15\n～\n15:15"), 12);
  assert.equal(parseStartHour("15:30\n～\n18:30"), 15);
  assert.equal(parseStartHour("18:45\n～\n21:45"), 18);
  // tokyo-ota（半角ハイフン・前後空白）
  assert.equal(parseStartHour("09:00 - 12:00"), 9);
  assert.equal(parseStartHour("13:00 - 17:00"), 13);
  // tokyo-chuo / tokyo-kita（区切りなし・時が 1 桁）
  assert.equal(parseStartHour("9:00-12:00"), 9);
  assert.equal(parseStartHour("19:30-21:30"), 19);
});

test("parseStartHour は表記ゆれ（全角数字・全角コロン・各種ダッシュ）を吸収する", () => {
  assert.equal(parseStartHour("０９：００〜１２：００"), 9);
  assert.equal(parseStartHour("09:00−12:00"), 9);
  assert.equal(parseStartHour("09:00ー12:00"), 9);
  assert.equal(parseStartHour("  09:00 ～ 12:00  "), 9);
});

test("parseStartHour は時刻レンジでない文字列に null を返す", () => {
  assert.equal(parseStartHour("午前"), null);
  assert.equal(parseStartHour("午後1"), null);
  assert.equal(parseStartHour("①"), null);
  assert.equal(parseStartHour(""), null);
  assert.equal(parseStartHour("9:00"), null); // 片側だけはレンジではない
  assert.equal(parseStartHour("9時-12時"), null);
});

test("parseStartHour は時・分が範囲外なら null を返す", () => {
  assert.equal(parseStartHour("24:00-25:00"), null);
  assert.equal(parseStartHour("09:60-12:00"), null);
});

test("bandFromHour は 12 と 17 を境界にする", () => {
  assert.equal(bandFromHour(0), "morning");
  assert.equal(bandFromHour(9), "morning");
  assert.equal(bandFromHour(11), "morning");
  assert.equal(bandFromHour(12), "afternoon");
  assert.equal(bandFromHour(16), "afternoon");
  assert.equal(bandFromHour(17), "evening");
  assert.equal(bandFromHour(23), "evening");
});

test("bandFromDivisionEnum は registry の区分 enum を band に畳む", () => {
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_MORNING"), "morning");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_MORNING_ONE"), "morning");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_MORNING_TWO"), "morning");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_AFTERNOON"), "afternoon");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_AFTERNOON_ONE"), "afternoon");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_AFTERNOON_TWO"), "afternoon");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_EVENING"), "evening");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_EVENING_ONE"), "evening");
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_EVENING_TWO"), "evening");
});

test("bandFromDivisionEnum は畳めない enum に null を返す", () => {
  // 北区の時間帯コマ。band に落とす根拠が名前に無い（exact モードで扱う自治体）。
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_DIVISION_1"), null);
  // scraper が変換に失敗したときの値。握り潰さず UNMAPPED に落とすため null。
  assert.equal(bandFromDivisionEnum("RESERVATION_DIVISION_INVALID"), null);
  assert.equal(bandFromDivisionEnum("MORNING"), null); // 接頭辞なしは想定外
  assert.equal(bandFromDivisionEnum(""), null);
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band/packages/scraper
node --test 'tools/spotcheck/divisionBand.test.ts'
```

Expected: FAIL — `Cannot find module .../divisionBand.ts`（ERR_MODULE_NOT_FOUND）

- [ ] **Step 3: 最小の実装を書く**

`packages/scraper/tools/spotcheck/divisionBand.ts` を新規作成:

```ts
// spot check の区分同定を「時刻の独立解釈」だけで行うための純関数。
// scraper の DIVISION_MAP は参照しない。参照すると変換テーブルの誤りを
// 判定器が再現してしまい、silent failure 検出器としての独立性を失うため。
// 根拠にしてよいのは「サイトが表示する時刻そのもの」と「registry 由来の enum 識別子」だけ。

export type Band = "morning" | "afternoon" | "evening";

const DIVISION_PREFIX = "RESERVATION_DIVISION_";

/**
 * 時間帯レンジ表記を正規化する。全角数字→半角、全角コロン→半角、
 * 各種ダッシュ・波ダッシュ→ "-"、空白と改行は全除去。
 * 荒川区は "09:00\n～\n12:00"、大田区は "09:00 - 12:00"、中央区は "9:00-12:00" と
 * 同じ意味を三者三様に書くため、比較の前に一つの形へ寄せる。
 */
function normalizeRange(label: string): string {
  return label
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[：]/g, ":")
    .replace(/[～〜\-−ー]/g, "-")
    .replace(/\s+/g, "");
}

// 片側だけの "9:00" を弾くため、レンジ全体（開始と終了）の形を要求する。
// 「午前」「午後1」のような抽象ラベルを誤って時刻と解釈しないための門番。
const RANGE_PATTERN = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

/**
 * 時間帯レンジ表記から開始時（0-23）を返す。レンジとして読めなければ null。
 * null は「band モードに入れない／想定外」の合図であり、judge 側で UNMAPPED になる。
 */
export function parseStartHour(label: string): number | null {
  const matched = RANGE_PATTERN.exec(normalizeRange(label));
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  const endHour = Number(matched[3]);
  const endMinute = Number(matched[4]);
  if (hour > 23 || minute > 59 || endHour > 23 || endMinute > 59) return null;
  return hour;
}

/**
 * 開始時から band を決める。境界（12 / 17）は 3 自治体の実データで
 * enum 名由来の band と矛盾しないことを確認した固定値。
 */
export function bandFromHour(hour: number): Band {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * 区分 enum 名から band を決める。MORNING* / AFTERNOON* / EVENING* の接頭辞だけを根拠にする。
 * 北区の DIVISION_1..5 のように名前に時間帯の意味が無いものと、変換失敗の INVALID は
 * null を返す。null を「とりあえず morning」等に丸めると異常が判定から消えるため、
 * 呼び出し側で UNMAPPED に落とす。
 */
export function bandFromDivisionEnum(division: string): Band | null {
  if (!division.startsWith(DIVISION_PREFIX)) return null;
  const name = division.slice(DIVISION_PREFIX.length);
  if (name.startsWith("MORNING")) return "morning";
  if (name.startsWith("AFTERNOON")) return "afternoon";
  if (name.startsWith("EVENING")) return "evening";
  return null;
}
```

- [ ] **Step 4: テストを走らせて通ることを確認する**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band/packages/scraper
node --test 'tools/spotcheck/divisionBand.test.ts'
```

Expected: PASS — `# pass 6` / `# fail 0`

- [ ] **Step 5: 型検査・lint・format を通す**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
npm run typecheck -w @shisetsu-viewer/scraper
npx oxlint packages/scraper/tools/spotcheck/divisionBand.ts packages/scraper/tools/spotcheck/divisionBand.test.ts
npx oxfmt packages/scraper/tools/spotcheck/divisionBand.ts packages/scraper/tools/spotcheck/divisionBand.test.ts
```

Expected: typecheck はエラー出力なしで exit 0、oxlint は `Found 0 warnings and 0 errors`、oxfmt は整形（差分が出たら Step 4 を再実行して PASS を確認）

- [ ] **Step 6: コミット**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
git add packages/scraper/tools/spotcheck/divisionBand.ts packages/scraper/tools/spotcheck/divisionBand.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(spotcheck): 時刻レンジと区分 enum を時間帯バンドに畳む純関数を追加"
```

---

### Task 2: `judgeReport.ts` — モード自動判別と band 突合

**Files:**
- Modify: `packages/scraper/tools/spotcheck/judgeReport.ts`（`normalizeDivisionLabel` = 61-66 行、`judgeSample` の区分照合ループ = 103-140 行）
- Test: `packages/scraper/tools/spotcheck/judgeReport.test.ts`（既存テストは変更せず追記のみ）

**Interfaces:**
- Consumes: Task 1 の `Band` / `parseStartHour` / `bandFromHour` / `bandFromDivisionEnum`（`./divisionBand.ts`）、既存 `categorizeSymbol(symbol: string, legend?: Readonly<Record<string, string>>): SlotCategory`（`./symbolMap.ts`）
- Produces: `judgeSample(plan, expected, observed)` の外部シグネチャは不変。`Verdict` の集合も不変

**背景（実装者向け）:** 現行の `judgeSample` は 103 行で registry の表示ラベル → 区分 enum の `Map` を作り、110-137 行で observed の各セルを 1:1 で突き合わせている。この 1:1 照合を「exact モード」として温存し、その手前にモード判別を挟む。band モードは別関数に切り出して、exact 側のコードを触らない。

**判別規則（設計文書より）:**
1. observed の全セルの区分ラベルが registry ラベルに正規化一致 → **exact**（現行のまま）
2. exact 不成立、かつ observed の全セルが `parseStartHour` で時刻レンジとして読める → **band**
3. どちらも不成立 → 現行の exact 経路に流し、`UNMAPPED`（真に未知のラベル）

exact を先に見るのは、kita のように registry ラベル自体が時刻レンジの自治体を band に落として区分粒度を失わないため。

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/judgeReport.test.ts` の末尾（`needsInvestigation` のテストの直前）に追記:

```ts
// --- band モード（サイトが時間帯レンジ、registry が午前/午後/夜間の自治体） ---

const ARAKAWA_PLAN: PlanSample = {
  id: "tokyo-arakawa:9f0e1d2c-aaaa-bbbb-cccc-000000000001:2026-07-19",
  target: "tokyo-arakawa",
  institutionId: "9f0e1d2c-aaaa-bbbb-cccc-000000000001",
  date: "2026-07-19",
  buildingSystemName: "石浜ふれあい館",
  institutionSystemName: "３階和室１",
  divisionLabels: ["午前", "午後", "午後1", "午後2", "夜間"],
};

// 石浜ふれあい館の実観測（sample-dumps 由来）。4 区分が morning:1 / afternoon:2 / evening:1 に畳まれる。
const ARAKAWA_CELLS = [
  { divisionLabel: "09:00\n～\n12:00", symbol: "Ｘ" },
  { divisionLabel: "12:15\n～\n15:15", symbol: "Ｘ" },
  { divisionLabel: "15:30\n～\n18:30", symbol: "Ｘ" },
  { divisionLabel: "18:45\n～\n21:45", symbol: "○" },
];

test("registry が午前/午後・サイトが時間帯レンジの自治体は band モードで MATCH になる", () => {
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MATCH");
});

test("band が跨るカテゴリの取り違えは band モードでも MISMATCH になる", () => {
  // D1 の夜間だけ「予約あり」に取り違えたケース。サイトは夜間が空き。
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_1",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /evening/);
});

test("band 単位のコマ数の欠落（片側にしか無い band）は MISMATCH になる", () => {
  // D1 に夜間の行が無い＝サイトにある区分が D1 から落ちている silent failure。
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /evening/);
});

test("同一 band 内のコマ数の違いも MISMATCH になる（マルチセット比較）", () => {
  // サイトは afternoon 2 コマだが D1 は 1 コマしかない。
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "MISMATCH");
  assert.match(result.detail, /afternoon/);
});

test("大田区の表記（半角ハイフン・前後空白）も band モードで MATCH になる", () => {
  const plan: PlanSample = {
    id: "tokyo-ota:9f0e1d2c-aaaa-bbbb-cccc-000000000002:2026-07-19",
    target: "tokyo-ota",
    institutionId: "9f0e1d2c-aaaa-bbbb-cccc-000000000002",
    date: "2026-07-19",
    buildingSystemName: "雪谷文化センター",
    institutionSystemName: "音楽室",
    divisionLabels: ["午前", "午後", "午後1", "午後2", "夜間", "夜間1", "夜間2"],
  };
  const result = judgeSample(
    plan,
    {
      id: plan.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
        RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_1",
      },
    },
    observed({
      id: plan.id,
      cells: [
        { divisionLabel: "09:00 - 12:00", symbol: "空いています" },
        { divisionLabel: "13:00 - 17:00", symbol: "予約済みです" },
        { divisionLabel: "18:00 - 22:00", symbol: "予約済みです" },
      ],
    })
  );
  assert.equal(result.verdict, "MATCH");
});

test("band モードで D1 の区分 enum を band に畳めなければ UNMAPPED", () => {
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: {
        RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_ONE: "RESERVATION_STATUS_STATUS_1",
        RESERVATION_DIVISION_AFTERNOON_TWO: "RESERVATION_STATUS_STATUS_1",
        // scraper が区分の変換に失敗して INVALID が保存された状態。握り潰さない。
        RESERVATION_DIVISION_INVALID: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({ id: ARAKAWA_PLAN.id, cells: ARAKAWA_CELLS })
  );
  assert.equal(result.verdict, "UNMAPPED");
  assert.match(result.detail, /RESERVATION_DIVISION_INVALID/);
});

test("時刻レンジでも registry ラベルでもないセルが混じれば従来どおり UNMAPPED", () => {
  const result = judgeSample(
    ARAKAWA_PLAN,
    {
      id: ARAKAWA_PLAN.id,
      reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1" },
    },
    observed({
      id: ARAKAWA_PLAN.id,
      cells: [
        { divisionLabel: "09:00\n～\n12:00", symbol: "Ｘ" },
        { divisionLabel: "深夜帯", symbol: "Ｘ" },
      ],
    })
  );
  assert.equal(result.verdict, "UNMAPPED");
});

test("registry ラベルが時刻レンジの自治体は band に落ちず exact モードのまま（粒度維持）", () => {
  // tokyo-kita は registry も時刻レンジ。band に落ちると DIVISION_1..5 が畳めず UNMAPPED になる。
  const plan: PlanSample = {
    id: "tokyo-kita:4c79dcb5-e7f1-18fd-8f9a-000000000009:2026-07-19",
    target: "tokyo-kita",
    institutionId: "4c79dcb5-e7f1-18fd-8f9a-000000000009",
    date: "2026-07-19",
    buildingSystemName: "滝野川会館",
    institutionSystemName: "B201音楽スタジオ",
    divisionLabels: ["9:00-12:00", "13:00-17:00", "18:00-22:00", "9:30-11:30", "12:00-14:00", "14:30-16:30", "17:00-19:00", "19:30-21:30"],
  };
  const result = judgeSample(
    plan,
    {
      id: plan.id,
      reservation: {
        RESERVATION_DIVISION_DIVISION_1: "RESERVATION_STATUS_STATUS_3",
        RESERVATION_DIVISION_DIVISION_2: "RESERVATION_STATUS_STATUS_2",
        RESERVATION_DIVISION_DIVISION_3: "RESERVATION_STATUS_STATUS_2",
        RESERVATION_DIVISION_DIVISION_4: "RESERVATION_STATUS_VACANT",
        RESERVATION_DIVISION_DIVISION_5: "RESERVATION_STATUS_VACANT",
      },
    },
    observed({
      id: plan.id,
      cells: [
        { divisionLabel: "9:30-11:30", symbol: "-" },
        { divisionLabel: "12:00-14:00", symbol: "×" },
        { divisionLabel: "14:30-16:30", symbol: "×" },
        { divisionLabel: "17:00-19:00", symbol: "○" },
        { divisionLabel: "19:30-21:30", symbol: "○" },
      ],
    })
  );
  assert.equal(result.verdict, "MATCH");
  assert.match(result.detail, /区分一致/); // exact モードの detail であること
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band/packages/scraper
node --test 'tools/spotcheck/judgeReport.test.ts'
```

Expected: FAIL — 新規 band テストのうち MATCH を期待するものが `UNMAPPED` を返す（`Expected values to be strictly equal: 'UNMAPPED' !== 'MATCH'`）。既存の 10 テストは PASS。

- [ ] **Step 3: 実装する**

まず `judgeReport.ts` の import に Task 1 のモジュールを足す（6 行目 `import { categorizeSymbol } from "./symbolMap.ts";` の**前**に置く。oxfmt の sortImports がアルファベット順に並べるため）:

```ts
import { bandFromDivisionEnum, bandFromHour, parseStartHour, type Band } from "./divisionBand.ts";
import { categorizeSymbol, type SlotCategory } from "./symbolMap.ts";
```

次に `normalizeDivisionLabel`（61-66 行）を内部空白も落とす形に差し替える:

```ts
/**
 * 区分ラベル突合の表記ゆれを吸収する（全角数字→半角、範囲記号の統一、空白の除去）。
 * registry 側のラベルと観測側のラベルの両方に同じ関数を適用する。
 * 内部空白も落とすのは observeCore.ts の normalizeLabel と揃えるため
 * （「09:00 - 12:00」と「09:00-12:00」を同一視する）。
 */
function normalizeDivisionLabel(label: string): string {
  const halfWidthDigits = label.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0)
  );
  return halfWidthDigits.replace(/[～〜\-−ー]/g, "-").replace(/\s+/g, "");
}
```

次に band 突合を行う関数を `judgeSample` の**手前**（`normalizeDivisionLabel` の直後）に追加する:

```ts
/**
 * band モードの突合。サイトの区分と D1 の区分をそれぞれ時間帯バンドに畳み、
 * バンドごとのカテゴリのマルチセット（ソート済み配列）を比べる。
 *
 * 畳む根拠は「サイトが表示する開始時刻」と「registry 由来の enum 識別子」だけで、
 * scraper の DIVISION_MAP は見ない。見ると変換テーブルの誤りを判定器が再現し、
 * silent failure 検出器としての独立性が失われるため。
 *
 * 午後1 と午後2 のような同一バンド内の細分は集約されるため、バンド内のスワップは
 * 検出できない（承認済みの割り切り）。バンドを跨ぐ取り違えと欠落は検出できる。
 *
 * 戻り値は「バンドごとの不一致の説明」。空配列なら全バンド一致。
 * 想定外（バンドに畳めない・カテゴリ化できない）は例外的に UNMAPPED を返させたいので、
 * 呼び出し側が判別できるよう `unmapped` として返す。
 */
function compareByBand(
  cells: readonly { divisionLabel: string; symbol: string }[],
  legend: Readonly<Record<string, string>> | undefined,
  reservation: Readonly<Record<string, string>>,
  statusLabels: Readonly<Record<string, string>>
): { unmapped: string } | { mismatches: string[] } {
  const observedBands = new Map<Band, SlotCategory[]>();
  for (const cell of cells) {
    const hour = parseStartHour(cell.divisionLabel);
    if (hour === null) return { unmapped: `区分ラベルを時刻として読めない: ${cell.divisionLabel}` };
    const category = categorizeSymbol(cell.symbol, legend);
    if (category === "UNKNOWN") return { unmapped: `記号不明: ${cell.symbol}（凡例にも無い）` };
    push(observedBands, bandFromHour(hour), category);
  }

  const expectedBands = new Map<Band, SlotCategory[]>();
  for (const [division, enumValue] of Object.entries(reservation)) {
    const band = bandFromDivisionEnum(division);
    if (band === null) return { unmapped: `区分 enum を時間帯に畳めない: ${division}` };
    // 期待側も categorizeSymbol を使う（凡例は渡さない。凡例はサイト側の情報であって
    // registry のラベル解釈に使うものではない）。
    const category = categorizeSymbol(statusLabels[enumValue] ?? "");
    if (category === "UNKNOWN") {
      return { unmapped: `enum の表示ラベルをカテゴリ化できない: ${enumValue}` };
    }
    push(expectedBands, band, category);
  }

  const mismatches: string[] = [];
  for (const band of ["morning", "afternoon", "evening"] as const) {
    const site = [...(observedBands.get(band) ?? [])].sort();
    const d1 = [...(expectedBands.get(band) ?? [])].sort();
    if (site.join(",") !== d1.join(",")) {
      mismatches.push(`${band}: サイト [${site.join(",") || "なし"}] vs D1 [${d1.join(",") || "なし"}]`);
    }
  }
  return { mismatches };
}

function push(bands: Map<Band, SlotCategory[]>, band: Band, category: SlotCategory): void {
  const list = bands.get(band);
  if (list) list.push(category);
  else bands.set(band, [category]);
}
```

最後に `judgeSample` の中、`labelToDivision` を作った直後（現行 108 行の `);` の後、`const mismatches: string[] = [];` の**前**）にモード判別と band 分岐を挿入する:

```ts
  // モード判別: observed の全セルが registry ラベルに一致すれば従来の 1:1 照合（exact）。
  // 一致しないが全セルが時刻レンジとして読めるなら band 照合。どちらでもなければ
  // exact 経路に流して UNMAPPED を出させる（真に未知のラベル＝実際の異常）。
  //
  // exact を先に見るのは、北区のように registry ラベル自体が時刻レンジの自治体を
  // band に落として区分粒度を失わないため。
  const isExact = observed.cells.every((cell) =>
    labelToDivision.has(normalizeDivisionLabel(cell.divisionLabel))
  );
  if (!isExact && observed.cells.every((cell) => parseStartHour(cell.divisionLabel) !== null)) {
    const result = compareByBand(
      observed.cells,
      observed.legend ?? undefined,
      reservation,
      municipality.reservationStatus
    );
    if ("unmapped" in result) return judgement("UNMAPPED", result.unmapped);
    return result.mismatches.length === 0
      ? judgement("MATCH", `${observed.cells.length} 区分を時間帯バンドで一致`)
      : judgement("MISMATCH", result.mismatches.join(" / "));
  }
```

- [ ] **Step 4: テストを走らせて通ることを確認する**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band/packages/scraper
node --test 'tools/spotcheck/judgeReport.test.ts'
```

Expected: PASS — `# fail 0`（既存 10 + 新規 8 = 18 テスト）

- [ ] **Step 5: spotcheck 全体とパッケージ全体のユニットテストを走らせる**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
npm run test:unit -w @shisetsu-viewer/scraper
```

Expected: `# fail 0`。`common/registryContract.test.ts`（registry と DIVISION_MAP の整合検査）も含め全 PASS。

- [ ] **Step 6: 型検査・lint・format を通す**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
npm run typecheck:all
npm run lint:all
npm run format:check:all
```

Expected: いずれも exit 0。`format:check:all` が失敗したら `npm run format:fix:all` を実行してから Step 5 を再実行する。

- [ ] **Step 7: 盲検の不変条件を機械的に確認する**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
grep -rn "DIVISION_MAP\|STATUS_MAP\|tokyo-\|kanagawa-" packages/scraper/tools/spotcheck/*.ts | grep -v "\.test\.ts"
```

Expected: 出力なし（判定・観測のプロダクションコードが scraper の変換テーブルや自治体実装を一切参照していない）。テストファイルには自治体名が文字列として現れるので除外している。

- [ ] **Step 8: コミット**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
git add packages/scraper/tools/spotcheck/judgeReport.ts packages/scraper/tools/spotcheck/judgeReport.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "fix(spotcheck): 時間帯バンド照合を追加し arakawa/ota/chuo の UNMAPPED を解消"
```

---

### Task 3: 退避済み sample-dumps による実データ回帰確認

**Files:**
- 変更なし（確認スクリプトはスクラッチパッドに書いて捨てる）
- 参照: `~/.claude/projects/-Users-yushi-src-shisetsu-viewer/spotcheck-observer-sdd/sample-dumps/*.json`

**Interfaces:**
- Consumes: Task 1・Task 2 の成果物、既存 `extractCells(tables, divisionLabels, roomName, isoDate, filterLabel?)`（`./observeCore.ts`）、`getMunicipalityBySlug`（`@shisetsu-viewer/shared`）
- Produces: なし（確認のみ）

**目的:** ユニットテストの literal は手で写したものなので、実際の DOM ダンプから `extractCells` を通したときにも band モードに入ることを、8 自治体分まとめて確かめる。実サイトへ出る前に、モード判別が想定どおりかを安く検証する段。

- [ ] **Step 1: 確認スクリプトを書く**

`/private/tmp/claude-501/-Users-yushi-src-shisetsu-viewer/4cde4360-b213-43be-aef8-2e618a060a1c/scratchpad/checkBandMode.ts` を作成:

```ts
// sample-dumps の DOM ダンプを extractCells に通し、各自治体が exact / band / どちらでもない
// のどれになるかを表示する。判定の正誤ではなくモード判別の妥当性だけを見る使い捨てスクリプト。
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";

import { parseStartHour } from "../../../../packages/scraper/tools/spotcheck/divisionBand.ts";
import { extractCells, normalizeLabel } from "../../../../packages/scraper/tools/spotcheck/observeCore.ts";

const DUMP_DIR = path.join(
  os.homedir(),
  ".claude/projects/-Users-yushi-src-shisetsu-viewer/spotcheck-observer-sdd/sample-dumps"
);

for (const file of (await fs.readdir(DUMP_DIR)).filter((f) => f.endsWith(".json"))) {
  const dump = JSON.parse(await fs.readFile(path.join(DUMP_DIR, file), "utf8")) as {
    municipality: string;
    tables: string[][][];
  };
  const slug = dump.municipality.split("-")[1] ?? "";
  const municipality = getMunicipalityBySlug(slug);
  if (!municipality) {
    console.log(`${dump.municipality}: registry に無い`);
    continue;
  }
  const divisionLabels = Object.values(municipality.reservationDivision);
  const tables = dump.tables.map((rows) => ({
    rows: rows.map((row) => row.map((text) => ({ text, imgAlt: "", imgSrc: "" }))),
  }));
  // 室名・日付はダンプに紐づく値が無いので、区分ラベルの形だけ見るために全表を走査する。
  const { cells, layout } = extractCells(tables, divisionLabels, "", "2026-07-19");
  const normalized = new Set(divisionLabels.map(normalizeLabel));
  const isExact = cells.length > 0 && cells.every((c) => normalized.has(normalizeLabel(c.divisionLabel)));
  const isBand = cells.length > 0 && cells.every((c) => parseStartHour(c.divisionLabel) !== null);
  const mode = cells.length === 0 ? "セルなし" : isExact ? "exact" : isBand ? "band" : "どちらでもない";
  console.log(
    `${dump.municipality.padEnd(16)} layout=${layout.padEnd(26)} mode=${mode.padEnd(14)} labels=${JSON.stringify(cells.map((c) => c.divisionLabel))}`
  );
}
```

- [ ] **Step 2: 実行して結果を読む**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band/packages/scraper
node /private/tmp/claude-501/-Users-yushi-src-shisetsu-viewer/4cde4360-b213-43be-aef8-2e618a060a1c/scratchpad/checkBandMode.ts
```

Expected: `tokyo-arakawa` / `tokyo-ota` / `tokyo-chuo` が `mode=band`、`tokyo-kita` が `mode=exact`（registry ラベルが時刻レンジのため）。`tokyo-koutou` / `tokyo-toshima` / `tokyo-edogawa` / `tokyo-bunkyo` は `mode=exact` か、室名が空のため `セルなし`。

`mode=どちらでもない` が出た自治体があれば、その `labels` を見て `parseStartHour` の正規化に不足がないかを調べ、必要なら Task 1 の `normalizeRange` に表記を足してユニットテストを追加する（Task 1 の Step 1-4 のサイクルをもう一度回す）。

- [ ] **Step 3: 結果を記録する（コミットなし）**

このステップに成果物のコミットは無い。結果は次のタスクの実サイト検証で「どの自治体がどのモードに入るはずか」の期待値として使う。想定と違うモードになった自治体があれば、ここで止めて原因を調べる。

---

### Task 4: 実サイト検証（対話的・認証が要る）

**Files:**
- 変更なし（検証のみ。修正が要れば Task 1/2 のサイクルに戻る）

**Interfaces:**
- Consumes: Task 1・2 の成果物
- Produces: なし

**前提:** `wrangler login` 済み（`plan.ts` が D1 を読む）と `gh` 認証済み。実サイトへ出るため所要時間が長く、ネットワークとサイト側の受付期間に依存する。**このタスクは自動では完了扱いにしない。** 各自治体の結果を人が読んで判断する。

`sumida` は GH Actions からの TCP SYN を drop するため CI 除外だが、ローカル実行では問題ない。

- [ ] **Step 1: worktree に依存が入っていることを確認する**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
ls node_modules/@shisetsu-viewer/shared
```

Expected: shared パッケージへのシンボリックリンクの中身が見える。見えなければ `npm install --ignore-scripts` を実行する（worktree で install を忘れると親リポジトリの `registry.ts` を読んでしまう）。

- [ ] **Step 2: band モードの 3 自治体を順に検証する**

`tokyo-arakawa` / `tokyo-ota` / `tokyo-chuo` について、それぞれ:

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band/packages/scraper
node tools/spotcheck/plan.ts --municipality tokyo-arakawa --samples 3
node tools/spotcheck/observe.ts
node tools/spotcheck/judge.ts
```

Expected: `judge.ts` の各行が `UNMAPPED` でないこと。理想は `MATCH`。`MISMATCH` が出た場合は detail の band とカテゴリ内訳を読み、`test-results/_spotcheck/screenshots/` の画像と突き合わせて、真の silent failure か偽 MISMATCH かを人が判断する。

`OUT_OF_WINDOW` / `SITE_NO_DATA` は band 照合に到達していないので、`--samples` を増やすか `--key` で別の日を指定して再試行する。

**罠:** arakawa / ota は当日締切を過ぎるとサイトが次の予約可能日へ飛ぶ。`isDateDisplayed` が効いていれば `SITE_NO_DATA` 系になるはずで、`MISMATCH` にはならない。もし対象日と違う日の値で `MISMATCH` が出ていたら、それは `isDateDisplayed` の穴であって本タスクの範囲外の別バグである（記録して報告する）。

- [ ] **Step 3: exact モードの自治体が退行していないことを確認する**

`tokyo-kita` / `tokyo-koutou` / `tokyo-toshima` / `tokyo-edogawa` について同じ 3 コマンドを回す。

Expected: Task 2 導入前と同じ判定になること。`MATCH` が `UNMAPPED` や `MISMATCH` に変わっていたら退行である。特に `normalizeDivisionLabel` の内部空白除去が効いてラベル照合が変わっていないかを見る。

- [ ] **Step 4: 結果を PR 本文用にまとめる**

自治体ごとに「モード / 判定の内訳 / 気になった点」を 1 行ずつ書き出す。band モードに入った自治体については、observed の `divisionLabel` と judge の detail を 1 サンプル分そのまま貼る（後から境界規則を見直すときの一次資料になる）。

---

### Task 5: 仕上げ（引き継ぎメモの更新と PR）

**Files:**
- Modify: `~/.claude/projects/-Users-yushi-src-shisetsu-viewer/memory/spotcheck-division-label-handoff.md`
- Modify: `~/.claude/projects/-Users-yushi-src-shisetsu-viewer/memory/MEMORY.md`（該当行の見出し）

**Interfaces:**
- Consumes: Task 4 の検証結果
- Produces: PR

- [ ] **Step 1: 引き継ぎメモを完了状態に更新する**

`spotcheck-division-label-handoff.md` の本文を、band 方式で解決したこと・バンド内スワップは検出できない割り切り・境界（12/17）が将来の偽 MISMATCH 要因になりうることに書き換える。`MEMORY.md` の該当行の見出しも `**次ブランチ**` から完了状態に直す。

- [ ] **Step 2: 変更をコミットして push**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
git log --oneline master..HEAD
git push -u origin worktree-spotcheck-division-band
```

Expected: Task 1・Task 2 の 2 コミット（＋設計文書の既存コミット）が並ぶ。

- [ ] **Step 3: PR を作る**

```bash
cd /Users/yushi/src/shisetsu-viewer/.claude/worktrees/spotcheck-division-band
gh pr create --base master --title "fix(spotcheck): 区分ラベル UNMAPPED を独立時間帯バンド照合で解消" --body "$(cat <<'EOF'
## 背景

`/spot-check` の judge が arakawa / ota / chuo で `UNMAPPED（区分ラベル不明）` を返していた。registry の区分ラベルが `午前`/`午後`/`夜間` なのに対し、サイトは時間帯レンジ（`09:00 ～ 12:00`）で区分を表示するため、厳密照合が成立しなかった。

## 変更

- `packages/scraper/tools/spotcheck/divisionBand.ts`（新規）: 時刻レンジ文字列から開始時を取り出し band に畳む純関数と、区分 enum 名から band に畳む純関数。
- `judgeReport.ts`: サンプル単位でモードを自動判別する（exact 優先 → band → UNMAPPED）。band モードは band ごとのカテゴリのマルチセットで突合する。

## 盲検の維持

judge は scraper の `DIVISION_MAP` / `STATUS_MAP` を import しない。band 化の根拠はサイトが表示する時刻そのものと registry 由来の enum 識別子だけである。STATUS の解釈は従来どおり `symbolMap.ts` で観測側・期待側を独立にカテゴリ化する。

## 割り切り

- 午後1 / 午後2 のような同一バンド内の細分は集約されるため、**バンド内スワップは検出できない**。バンドを跨ぐ取り違えと欠落は検出できる。
- バンド境界（12 / 17）は開始時刻ベースの固定値。現行 3 自治体の実データでは矛盾ゼロだが、正午を跨ぐレンジが出れば偽 MISMATCH になりうる。

## 検証

（Task 4 でまとめた自治体ごとの結果をここに貼る）

- `npm run test:unit -w @shisetsu-viewer/scraper` / `typecheck:all` / `lint:all` / `format:check:all` green

設計: `docs/superpowers/specs/2026-07-23-spotcheck-division-band-design.md`
計画: `docs/superpowers/plans/2026-07-23-spotcheck-division-band.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR の URL が表示される。
