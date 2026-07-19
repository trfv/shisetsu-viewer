# spot check オブザーバ実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/spot-check` のフェーズ 2 を、`prepare` のみを借りる決定論スクリプト `observe.ts` に置き換え、区分フィルタ型サイトを正しく観測できるようにする。

**Architecture:** Playwright 依存部分（`observe.ts` / `observeStrategy.ts`）と純粋ロジック（`observeCore.ts`）を分離する。`page.evaluate` の中ではセルから `{text, imgAlt, imgSrc}` を機械的に集めるだけにし、そこから記号を決める判断は Node 側の純関数に出す。これで HTML パーサへの依存を増やさずにユニットテストが書ける。

**Tech Stack:** Node 24（TS を直接実行、ビルドなし）、`@playwright/test`、`node --test`（組込テストランナー）

## Global Constraints

- スクレイパーから借りてよいのは `prepare` フックだけ。`extract` / `transform` / `STATUS_MAP` / `DIVISION_MAP` は参照しない
- 新しい npm 依存を追加しない。scraper の依存は `@playwright/test` と `date-fns` のみ
- Prettier: printWidth 100、ダブルクォート、trailing comma es5
- TypeScript は `erasableSyntaxOnly`。`enum` と実装付き `namespace`、パラメータプロパティは使えない
- import は `.ts` 拡張子付きで書く（`allowImportingTsExtensions`）
- テストは `node --test` のみ。`tools/spotcheck/*.test.ts` は `npm run test:unit -w @shisetsu-viewer/scraper` が拾う
- コミット時は `PATH="$PWD/node_modules/.bin:$PATH" git commit`（非対話シェルで lint-staged が見つからない場合がある）
- worktree で作業する場合、最初に `npm install --ignore-scripts` を実行する。忘れると `@shisetsu-viewer/shared` が親リポジトリに解決される

## File Structure

| ファイル | 責務 |
|---|---|
| `packages/scraper/tools/spotcheck/observeCore.ts` | 純粋ロジック。セル→記号の変換、target の絞り込み、室の行の特定、observed の組み立て |
| `packages/scraper/tools/spotcheck/observeCore.test.ts` | 上記のテスト |
| `packages/scraper/tools/spotcheck/observeStrategy.ts` | 読み取り戦略のマップと、区分フィルタの操作（Playwright 依存） |
| `packages/scraper/tools/spotcheck/observeStrategy.test.ts` | 戦略マップと registry の整合、盲検の検査 |
| `packages/scraper/tools/spotcheck/observe.ts` | CLI エントリ。Playwright の起動、plan の読み込み、サンプルのループ、ファイル書き出し |
| `.claude/commands/spot-check.md` | フェーズ 2 の手順を書き換える |

---

### Task 1: セルから記号への変換

**Files:**
- Create: `packages/scraper/tools/spotcheck/observeCore.ts`
- Test: `packages/scraper/tools/spotcheck/observeCore.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `export interface RawCell { text: string; imgAlt: string; imgSrc: string }`、`export function cellToSymbol(cell: RawCell): string`

`page.evaluate` の中では各セルから `text` / `imgAlt` / `imgSrc` を集めるだけにし、記号を決める判断はこの純関数が行う。優先順位は、テキストがあればテキスト、なければ `alt`、それもなければ `src` のファイル名（拡張子を除く）とする。江東区は `alt="予約あり"` を持ち、荒川区は `alt="O"` を持ち、大田区は `alt="空いています"` を持つ。いずれも人間が画面から読み取る内容と一致する。

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/observeCore.test.ts` を新規作成する。

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { cellToSymbol } from "./observeCore.ts";

test("cellToSymbol はテキストを最優先で返す", () => {
  assert.equal(cellToSymbol({ text: "×", imgAlt: "", imgSrc: "" }), "×");
  assert.equal(cellToSymbol({ text: "○", imgAlt: "無視", imgSrc: "a.gif" }), "○");
  assert.equal(cellToSymbol({ text: "  空き  ", imgAlt: "", imgSrc: "" }), "空き");
});

test("cellToSymbol はテキストが無ければ alt を返す（江東区・大田区・荒川区が画像で表示する）", () => {
  assert.equal(cellToSymbol({ text: "", imgAlt: "予約あり", imgSrc: "image/lw_finishs.gif" }), "予約あり");
  assert.equal(cellToSymbol({ text: "", imgAlt: "空いています", imgSrc: "icn_scche_ok.png" }), "空いています");
  assert.equal(cellToSymbol({ text: "", imgAlt: "O", imgSrc: "timetable-o.gif" }), "O");
});

test("cellToSymbol は alt も無ければ src のファイル名を返す", () => {
  assert.equal(cellToSymbol({ text: "", imgAlt: "", imgSrc: "image/lw_sound.gif" }), "lw_sound");
  assert.equal(cellToSymbol({ text: "", imgAlt: "", imgSrc: "../img/std/common/icn_x.png" }), "icn_x");
});

test("cellToSymbol は何も無ければ空文字を返す", () => {
  assert.equal(cellToSymbol({ text: "", imgAlt: "", imgSrc: "" }), "");
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
node --test tools/spotcheck/observeCore.test.ts
```

期待: `Cannot find module './observeCore.ts'` で失敗する。

- [ ] **Step 3: 最小の実装を書く**

`packages/scraper/tools/spotcheck/observeCore.ts` を新規作成する。

```typescript
// spot check の観測ロジックのうち、Playwright に依存しない部分。
// スクレイパーの extract / transform / STATUS_MAP は参照しない（盲検の線引き）。
// 判定に使う記号表は symbolMap.ts にあり、ここでは記号を「決める」だけで「解釈しない」。

/** page.evaluate がセルから機械的に集める 3 値 */
export interface RawCell {
  text: string;
  imgAlt: string;
  imgSrc: string;
}

/**
 * セルの生記号を決める。テキスト → 画像の alt → 画像ファイル名の順に採用する。
 * 画像で空き状況を表すサイト（江東区・大田区・荒川区）では alt が
 * 人間の読み取る内容と一致するため、alt を src より優先する。
 */
export function cellToSymbol(cell: RawCell): string {
  const text = cell.text.trim();
  if (text) return text;
  const alt = cell.imgAlt.trim();
  if (alt) return alt;
  const src = cell.imgSrc.trim();
  if (!src) return "";
  const fileName = src.split("/").pop() ?? "";
  return fileName.replace(/\.[^.]+$/, "");
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
node --test tools/spotcheck/observeCore.test.ts
```

期待: 4 tests pass。

- [ ] **Step 5: コミットする**

```bash
git add packages/scraper/tools/spotcheck/observeCore.ts packages/scraper/tools/spotcheck/observeCore.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(spotcheck): セルから生記号への変換を追加"
```

---

### Task 2: target の絞り込み

**Files:**
- Modify: `packages/scraper/tools/spotcheck/observeCore.ts`
- Test: `packages/scraper/tools/spotcheck/observeCore.test.ts`

**Interfaces:**
- Consumes: Task 1 の `observeCore.ts`
- Produces: `export function selectTarget<T>(targets: readonly T[], facilityOf: (t: T) => string, buildingName: string, roomName: string): T | undefined`

北区は室ごとに target を持ち（`{facilityName, roomName, links}`）、豊島区は建物単位で室を持たない（`{facilityName}`）。両方を一つの手順で扱うため、建物名で絞ったあと室名で部分一致を試し、一致がなければ建物単位とみなして先頭を返す。

- [ ] **Step 1: 失敗するテストを書く**

`observeCore.test.ts` の末尾に追記する。

```typescript
import { selectTarget } from "./observeCore.ts";

const facilityOf = (t: { facilityName: string }) => t.facilityName;

test("selectTarget は室名で絞り込む（北区のように室ごとに target がある場合）", () => {
  const targets = [
    { facilityName: "滝野川会館", roomName: "大ホール （平土間）" },
    { facilityName: "滝野川会館", roomName: "B201音楽スタジオ" },
    { facilityName: "赤羽会館", roomName: "講堂" },
  ];
  const selected = selectTarget(targets, facilityOf, "滝野川会館", "B201音楽スタジオ");
  assert.deepEqual(selected, { facilityName: "滝野川会館", roomName: "B201音楽スタジオ" });
});

test("selectTarget は室名が一致しなければ建物単位の先頭を返す（豊島区のように室を持たない場合）", () => {
  const targets = [{ facilityName: "南大塚地域文化創造館" }, { facilityName: "巣鴨地域文化創造館" }];
  const selected = selectTarget(targets, facilityOf, "南大塚地域文化創造館", "第１会議室");
  assert.deepEqual(selected, { facilityName: "南大塚地域文化創造館" });
});

test("selectTarget は建物名が一致しなければ undefined を返す", () => {
  const targets = [{ facilityName: "南大塚地域文化創造館" }];
  assert.equal(selectTarget(targets, facilityOf, "存在しない館", "第１会議室"), undefined);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
node --test tools/spotcheck/observeCore.test.ts
```

期待: `selectTarget is not a function` などで失敗する。

- [ ] **Step 3: 実装を書く**

`observeCore.ts` の末尾に追記する。

```typescript
/**
 * plan の建物名・室名から観測対象の target を選ぶ。
 *
 * 自治体によって target の粒度が違う（北区は室ごと、豊島区は建物ごと）。
 * 建物名で絞ったあと室名の部分一致を試し、一致が無ければ建物単位の
 * target とみなして先頭を返す。
 */
export function selectTarget<T>(
  targets: readonly T[],
  facilityOf: (t: T) => string,
  buildingName: string,
  roomName: string
): T | undefined {
  const inBuilding = targets.filter((t) => facilityOf(t) === buildingName);
  if (inBuilding.length === 0) return undefined;
  const byRoom = inBuilding.filter((t) => JSON.stringify(t).includes(roomName));
  return byRoom[0] ?? inBuilding[0];
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
node --test tools/spotcheck/observeCore.test.ts
```

期待: 7 tests pass。

- [ ] **Step 5: コミットする**

```bash
git add packages/scraper/tools/spotcheck/observeCore.ts packages/scraper/tools/spotcheck/observeCore.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(spotcheck): target の絞り込みを追加"
```

---

### Task 3: 表から室の行を取り出す

**Files:**
- Modify: `packages/scraper/tools/spotcheck/observeCore.ts`
- Test: `packages/scraper/tools/spotcheck/observeCore.test.ts`

**Interfaces:**
- Consumes: Task 1 の `RawCell`
- Produces: `export interface RawTable { rows: RawCell[][] }`、`export function findRoomRow(tables: readonly RawTable[], roomName: string): { header: string[]; cells: string[] } | undefined`

表の各行の先頭セルに室名が含まれる行を探し、その行と対応するヘッダ行を返す。ヘッダは、その行が属する表の先頭行とする。荒川区は行の先頭セルが「石浜ふれあい館 ３階和室２」のように建物名を含むため、完全一致ではなく部分一致で探す。

- [ ] **Step 1: 失敗するテストを書く**

`observeCore.test.ts` の末尾に追記する。

```typescript
import { findRoomRow, type RawTable } from "./observeCore.ts";

const cell = (text: string): { text: string; imgAlt: string; imgSrc: string } => ({
  text,
  imgAlt: "",
  imgSrc: "",
});

test("findRoomRow は先頭セルが室名を含む行とヘッダを返す", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("2026年7月19日"), cell("午前"), cell("午後"), cell("夜間")],
        [cell("第１会議室"), cell("○"), cell("×"), cell("×")],
        [cell("第２会議室"), cell("×"), cell("○"), cell("○")],
      ],
    },
  ];
  assert.deepEqual(findRoomRow(tables, "第２会議室"), {
    header: ["2026年7月19日", "午前", "午後", "夜間"],
    cells: ["第２会議室", "×", "○", "○"],
  });
});

test("findRoomRow は先頭セルが建物名を含んでも部分一致で拾う（荒川区の形式）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell(""), cell("09:00 ～ 12:00"), cell("12:15 ～ 15:15")],
        [cell("石浜ふれあい館 ３階和室２"), cell("Ｘ"), cell("Ｏ")],
      ],
    },
  ];
  const found = findRoomRow(tables, "３階和室２");
  assert.deepEqual(found?.cells, ["石浜ふれあい館 ３階和室２", "Ｘ", "Ｏ"]);
});

test("findRoomRow は複数の表をまたいで探す（江東区は区分数ごとに表が分かれる）", () => {
  const tables: RawTable[] = [
    { rows: [[cell("日付"), cell("午前")], [cell("大研修室"), cell("×")]] },
    { rows: [[cell("日付"), cell("①"), cell("②")], [cell("音楽スタジオ"), cell("×"), cell("○")]] },
  ];
  assert.deepEqual(findRoomRow(tables, "音楽スタジオ"), {
    header: ["日付", "①", "②"],
    cells: ["音楽スタジオ", "×", "○"],
  });
});

test("findRoomRow は見つからなければ undefined を返す", () => {
  const tables: RawTable[] = [{ rows: [[cell("日付")], [cell("大研修室"), cell("×")]] }];
  assert.equal(findRoomRow(tables, "音楽スタジオ"), undefined);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
node --test tools/spotcheck/observeCore.test.ts
```

期待: `findRoomRow is not a function` で失敗する。

- [ ] **Step 3: 実装を書く**

`observeCore.ts` の末尾に追記する。

```typescript
/** page.evaluate が集めた 1 つの表 */
export interface RawTable {
  rows: RawCell[][];
}

/**
 * 室名を含む行と、その表のヘッダ行を返す。
 *
 * 行の先頭セルは自治体によって形式が違う（「第１会議室」だけの場合と
 * 「石浜ふれあい館 ３階和室２」のように建物名を含む場合がある）ため、
 * 完全一致ではなく部分一致で探す。
 * 江東区は区分数の異なる表が同じページに並ぶため、全ての表を走査する。
 */
export function findRoomRow(
  tables: readonly RawTable[],
  roomName: string
): { header: string[]; cells: string[] } | undefined {
  for (const table of tables) {
    const header = table.rows[0];
    if (!header) continue;
    for (const row of table.rows.slice(1)) {
      const first = row[0];
      if (!first) continue;
      if (!cellToSymbol(first).includes(roomName)) continue;
      return {
        header: header.map(cellToSymbol),
        cells: row.map(cellToSymbol),
      };
    }
  }
  return undefined;
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
node --test tools/spotcheck/observeCore.test.ts
```

期待: 11 tests pass。

- [ ] **Step 5: コミットする**

```bash
git add packages/scraper/tools/spotcheck/observeCore.ts packages/scraper/tools/spotcheck/observeCore.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(spotcheck): 表から室の行を取り出す関数を追加"
```

---

### Task 4: 読み取り戦略のマップ

**Files:**
- Create: `packages/scraper/tools/spotcheck/observeStrategy.ts`
- Test: `packages/scraper/tools/spotcheck/observeStrategy.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `export type ObserveStrategy = "direct" | "divisionFilter"`、`export const STRATEGY_BY_MUNICIPALITY: Readonly<Record<string, ObserveStrategy>>`、`export function strategyFor(municipality: string): ObserveStrategy`

豊島区と江戸川区は「その他の条件で絞り込む」で時間帯を選び直すと表が描き直される。フィルタを操作せずに読むと集約表が読めてしまい、それらしい観測結果が得られるため、区分ごとにフィルタを切り替える必要がある。文京区は同系のシステムだが、初回の観測ではフィルタ操作以前にグリッドが描画されなかったため `direct` のままとする。

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/spotcheck/observeStrategy.test.ts` を新規作成する。

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";
import { STRATEGY_BY_MUNICIPALITY, strategyFor } from "./observeStrategy.ts";

test("strategyFor は既定で direct を返す", () => {
  assert.equal(strategyFor("tokyo-koutou"), "direct");
  assert.equal(strategyFor("tokyo-kita"), "direct");
  assert.equal(strategyFor("未知の自治体"), "direct");
});

test("strategyFor は区分フィルタ型の自治体に divisionFilter を返す", () => {
  assert.equal(strategyFor("tokyo-toshima"), "divisionFilter");
  assert.equal(strategyFor("tokyo-edogawa"), "divisionFilter");
});

test("戦略マップのキーは registry に実在する自治体である", () => {
  for (const key of Object.keys(STRATEGY_BY_MUNICIPALITY)) {
    const slug = key.split("-")[1];
    assert.ok(slug !== undefined, `${key} は <prefecture>-<slug> の形式ではない`);
    assert.ok(getMunicipalityBySlug(slug) !== undefined, `${key} が registry に存在しない`);
  }
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
node --test tools/spotcheck/observeStrategy.test.ts
```

期待: `Cannot find module './observeStrategy.ts'` で失敗する。

- [ ] **Step 3: 実装を書く**

`packages/scraper/tools/spotcheck/observeStrategy.ts` を新規作成する。この段階ではマップと参照関数だけを書く。フィルタ操作は Task 5 で足す。

```typescript
// spot check の読み取り戦略。スクレイパーの extract は参照しない（盲検の線引き）。
//
// 戦略をスクレイパー側ではなくここに置くのは、借りている範囲を prepare だけに
// 限るためである。スクレイパーに spot check 専用のフックを足すと、フックが
// 増えるたびに境界が曖昧になる。

/**
 * direct        : prepare 後に描画されている表をそのまま読む
 * divisionFilter: 区分ラベルごとにフィルタを切り替えて表を読み直す
 */
export type ObserveStrategy = "direct" | "divisionFilter";

/**
 * 区分フィルタ型のサイト。「その他の条件で絞り込む」で時間帯を選ぶと
 * 表が描き直されるため、フィルタを操作せずに読むと全区分の集約表を
 * 読んでしまう（2026-07-19 の初回観測で実際に踏んだ）。
 *
 * 文京区も同系のシステムだが、初回の観測では施設別空き状況の画面で
 * 凡例とヘッダだけが描画され、グリッドが現れなかった。フィルタ操作
 * 以前の段階で止まっているため direct のままとし、再現を見てから決める。
 */
export const STRATEGY_BY_MUNICIPALITY: Readonly<Record<string, ObserveStrategy>> = {
  "tokyo-toshima": "divisionFilter",
  "tokyo-edogawa": "divisionFilter",
};

export function strategyFor(municipality: string): ObserveStrategy {
  return STRATEGY_BY_MUNICIPALITY[municipality] ?? "direct";
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
node --test tools/spotcheck/observeStrategy.test.ts
```

期待: 3 tests pass。

- [ ] **Step 5: コミットする**

```bash
git add packages/scraper/tools/spotcheck/observeStrategy.ts packages/scraper/tools/spotcheck/observeStrategy.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(spotcheck): 読み取り戦略のマップを追加"
```

---

### Task 5: 表の収集、区分フィルタの操作、CLI エントリ

**Files:**
- Modify: `packages/scraper/tools/spotcheck/observeStrategy.ts`
- Create: `packages/scraper/tools/spotcheck/observe.ts`
- Test: `packages/scraper/tools/spotcheck/observeStrategy.test.ts`

**Interfaces:**
- Consumes: Task 1-3 の `observeCore.ts`（`cellToSymbol` / `selectTarget` / `findRoomRow` / `RawCell` / `RawTable`）、Task 4 の `strategyFor`、`judgeReport.ts` の `PlanSample` / `ObservedSample`
- Produces: `export async function collectTables(page: Page): Promise<RawTable[]>`、`export async function applyDivisionFilter(page: Page, divisionLabel: string): Promise<boolean>`、CLI エントリ

`collectTables` は `page.evaluate` の中でセルから 3 値を集めるだけにし、記号の決定は `observeCore.ts` に任せる。`applyDivisionFilter` は「その他の条件で絞り込む」を開き、区分ラベルをクリックして「表示」を押す。操作できなければ `false` を返し、呼び出し側がその区分を欠落として記録する。

`observe.ts` は `plan.json` を読み、各サンプルについて `prepare` で到達し、戦略に応じて表を読み、`observed/<連番>.json` と `raw/<連番>.json` とスクリーンショットを書く。1 サンプルの失敗が全体を止めないよう、例外は `reached: false` に変換する。

盲検の検査は `observe.ts` を対象に含むため、この 2 ファイルを同じタスクで作る。Playwright を起動するテストは書かない（実サイトに接続するため）。

- [ ] **Step 1: 失敗するテストを書く**

`observeStrategy.test.ts` の末尾に追記する。

```typescript
import { readFile } from "node:fs/promises";

const BLIND_SPOT_PATTERNS = [
  /\bSTATUS_MAP\b/,
  /\bDIVISION_MAP\b/,
  /scraper\.extract\b/,
  /scraper\.transform\b/,
  /\bfrom "\.\.\/\.\.\/common\/reservation\.ts"/,
];

const OBSERVER_SOURCES = [
  "tools/spotcheck/observeStrategy.ts",
  "tools/spotcheck/observeCore.ts",
  "tools/spotcheck/observe.ts",
];

test("観測側のソースはスクレイパーの解釈（STATUS_MAP / extract / transform）を参照しない", async () => {
  for (const file of OBSERVER_SOURCES) {
    const source = await readFile(file, "utf8");
    // コメントを除いた行だけを検査する（意図の説明で語を使うのは許す）
    const code = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    for (const pattern of BLIND_SPOT_PATTERNS) {
      assert.ok(
        !pattern.test(code),
        `${file} が ${pattern} を参照している。spot check は scraper の解釈を借りない（借りると同じ誤りを再現して MATCH を出す）`
      );
    }
  }
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
node --test tools/spotcheck/observeStrategy.test.ts
```

期待: `ENOENT: no such file or directory, open 'tools/spotcheck/observe.ts'` で失敗する。`observe.ts` は Step 4 で作る。

- [ ] **Step 3: observeStrategy.ts に実装を書く**

`observeStrategy.ts` の先頭に import を足す。

```typescript
import type { Page } from "@playwright/test";
import type { RawTable } from "./observeCore.ts";
```

同ファイルの末尾に追記する。

```typescript
/**
 * ページ上の全ての表からセルの生データを集める。
 *
 * evaluate の中では text / alt / src を機械的に集めるだけにし、
 * どれを記号として採るかの判断は observeCore.cellToSymbol に出す
 * （evaluate の中身はブラウザ側で実行されるためテストできない）。
 */
export async function collectTables(page: Page): Promise<RawTable[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("table")]
      .map((table) => ({
        rows: [...table.querySelectorAll("tr")].map((tr) =>
          [...tr.querySelectorAll("td,th")].map((cellEl) => {
            const img = cellEl.querySelector("img");
            return {
              text: (cellEl as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
              imgAlt: img?.getAttribute("alt") ?? "",
              imgSrc: img?.getAttribute("src") ?? "",
            };
          })
        ),
      }))
      .filter((t) => t.rows.length >= 2)
  );
}

/**
 * 区分フィルタを切り替える。切り替えられたら true を返す。
 *
 * 豊島区と江戸川区で共通の UI（「その他の条件で絞り込む」→ 区分ラベル →
 * 「表示」）を操作する。いずれかの要素が見つからなければ false を返し、
 * 呼び出し側がその区分を欠落として記録する。
 */
export async function applyDivisionFilter(page: Page, divisionLabel: string): Promise<boolean> {
  try {
    const opener = page.locator('button:has-text("その他の条件で絞り込む")');
    if ((await opener.count()) > 0 && (await opener.first().isVisible())) {
      await opener.first().click();
      await page.waitForTimeout(500);
    }
    const label = page.getByText(divisionLabel, { exact: true });
    if ((await label.count()) === 0) return false;
    await label.first().click();
    const show = page.locator('button:has-text("表示")');
    if ((await show.count()) === 0) return false;
    await show.first().click();
    await page.locator("table").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: observe.ts を書く**

`packages/scraper/tools/spotcheck/observe.ts` を新規作成する。

```typescript
// spot check の段 2。実サイトを観測して observed/*.json を書く。
// 使い方（packages/scraper で実行）: node tools/spotcheck/observe.ts [--id <plan の id>]
//
// スクレイパーから借りるのは prepare フック（サイトへの到達経路）だけである。
// extract / transform / STATUS_MAP は借りない。借りると観測が scraper の解釈を
// なぞることになり、同じ誤りを再現して MATCH を出すためである。
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import type { ObservedSample, PlanSample } from "./judgeReport.ts";
import { cellToSymbol, findRoomRow, selectTarget, type RawTable } from "./observeCore.ts";
import { applyDivisionFilter, collectTables, strategyFor } from "./observeStrategy.ts";

const OUT_DIR = path.join("test-results", "_spotcheck");

const idFilter = process.argv.includes("--id")
  ? process.argv[process.argv.indexOf("--id") + 1]
  : undefined;

const plan = JSON.parse(
  await fs.readFile(path.join(OUT_DIR, "plan.json"), "utf8")
) as { samples: PlanSample[] };
const samples = idFilter ? plan.samples.filter((s) => s.id === idFilter) : plan.samples;
if (samples.length === 0) {
  console.error("ERROR: 対象サンプルがありません（plan.ts を先に実行してください）");
  process.exit(2);
}

await fs.mkdir(path.join(OUT_DIR, "raw"), { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "observed"), { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });

const browser = await chromium.launch({ headless: true });
let reachedCount = 0;

for (const [index, sample] of samples.entries()) {
  const seq = String(index + 1);
  const context = await browser.newContext({ locale: "ja-JP" });
  const page = await context.newPage();
  const observed: ObservedSample = {
    id: sample.id,
    reached: false,
    dateDisplayed: false,
    outOfWindow: false,
    cells: [],
    legend: null,
    url: "",
    screenshotPath: `screenshots/${seq}.png`,
    note: "",
  };
  const rawTablesByDivision: Record<string, RawTable[]> = {};
  let bodyText = "";

  try {
    const mod = (await import(`../../${sample.target}/index.ts`)) as {
      scraper: {
        targets: readonly unknown[];
        facility: (t: unknown) => string;
        prepare: (p: typeof page, t: unknown) => Promise<typeof page>;
      };
    };
    const { scraper } = mod;
    const target = selectTarget(
      scraper.targets,
      scraper.facility,
      sample.buildingSystemName,
      sample.institutionSystemName
    );
    if (target === undefined) {
      const available = [...new Set(scraper.targets.map((t) => scraper.facility(t)))];
      observed.note = `target が見つかりません: ${sample.buildingSystemName}。候補: ${available.join(", ")}`;
      throw new Error("no target");
    }

    const active = await scraper.prepare(page, target);
    observed.url = active.url();

    if (strategyFor(sample.target) === "divisionFilter") {
      const failed: string[] = [];
      for (const label of sample.divisionLabels) {
        if (!(await applyDivisionFilter(active, label))) {
          failed.push(label);
          continue;
        }
        rawTablesByDivision[label] = await collectTables(active);
      }
      if (failed.length > 0) {
        observed.note = `区分フィルタを操作できませんでした: ${failed.join(", ")}`;
      }
    } else {
      rawTablesByDivision[""] = await collectTables(active);
    }

    bodyText = (await active.evaluate(() => document.body.innerText))
      .replace(/\n{2,}/g, "\n")
      .slice(0, 6000);

    // 区分ごとに読んだ場合はラベルと値が 1 対 1 に決まる。
    // 一括で読んだ場合はヘッダの区分ラベルと室の行を突き合わせる。
    for (const [label, tables] of Object.entries(rawTablesByDivision)) {
      const found = findRoomRow(tables, sample.institutionSystemName);
      if (!found) continue;
      observed.reached = true;
      observed.dateDisplayed = true;
      if (label) {
        const value = found.cells.slice(1).find((c) => c !== "");
        if (value !== undefined) observed.cells.push({ divisionLabel: label, symbol: value });
      } else {
        for (const [i, symbol] of found.cells.slice(1).entries()) {
          const divisionLabel = found.header[i + 1] ?? "";
          if (divisionLabel) observed.cells.push({ divisionLabel, symbol });
        }
      }
    }

    if (!observed.reached) {
      const rows = Object.values(rawTablesByDivision)
        .flat()
        .flatMap((t) => t.rows.map((r) => cellToSymbol(r[0] ?? { text: "", imgAlt: "", imgSrc: "" })))
        .filter(Boolean);
      observed.note =
        `室「${sample.institutionSystemName}」の行が見つかりません。読めた行: ` +
        [...new Set(rows)].slice(0, 40).join(" / ");
    }

    await active.screenshot({
      path: path.join(OUT_DIR, "screenshots", `${seq}.png`),
      fullPage: true,
    });
  } catch (e) {
    if (!observed.note) observed.note = String((e as Error).message).slice(0, 500);
  } finally {
    await context.close();
  }

  await fs.writeFile(
    path.join(OUT_DIR, "raw", `${seq}.json`),
    JSON.stringify({ id: sample.id, rawTablesByDivision, bodyText }, null, 2)
  );
  await fs.writeFile(
    path.join(OUT_DIR, "observed", `${seq}.json`),
    JSON.stringify(observed, null, 2)
  );
  if (observed.reached) reachedCount++;
  console.log(
    `${observed.reached ? "OK  " : "FAIL"} ${seq} ${sample.id} cells=${observed.cells.length} ${observed.note}`
  );
}

await browser.close();
console.log(
  `SPOTCHECK_OBSERVE ${JSON.stringify({ samples: samples.length, reached: reachedCount })}`
);
```

- [ ] **Step 5: 盲検の検査が通ることを確認する**

```bash
node --test tools/spotcheck/observeStrategy.test.ts
```

期待: 4 tests pass。`observe.ts` が存在し、`STATUS_MAP` などを参照していないため。

- [ ] **Step 6: 型チェックを通す**

```bash
npm run typecheck -w @shisetsu-viewer/scraper
```

期待: エラーなし。エラーが出たら型注釈を補って直す。

- [ ] **Step 7: ユニットテスト全体が通ることを確認する**

```bash
npm run test:unit -w @shisetsu-viewer/scraper
```

期待: 全 pass（既存 114 + 新規 15 前後）。

- [ ] **Step 8: コミットする**

```bash
git add packages/scraper/tools/spotcheck/observeStrategy.ts packages/scraper/tools/spotcheck/observeStrategy.test.ts packages/scraper/tools/spotcheck/observe.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(spotcheck): 表の収集・区分フィルタ操作・観測 CLI を追加"
```

---

### Task 6: 実サイトでの検証

**Files:**
- 変更なし（検証のみ）

**Interfaces:**
- Consumes: Task 5 の `observe.ts`

設計の検証節に挙げた項目を実行する。実サイトに接続するため時間がかかる（1 自治体あたり 1-3 分）。

- [ ] **Step 1: plan を実行してサンプルを引く**

```bash
cd packages/scraper && node tools/spotcheck/plan.ts; cd ../..
```

期待: `SPOTCHECK_PLAN {"samples":8,...}`。wrangler 未ログインで失敗する場合はメッセージを報告して停止する。

- [ ] **Step 2: 区分フィルタ型の 2 自治体を観測する**

`plan.json` から豊島区と江戸川区のサンプル id を確認し、それぞれ実行する。

```bash
cd packages/scraper
node tools/spotcheck/observe.ts --id "<toshima の id>"
node tools/spotcheck/observe.ts --id "<edogawa の id>"
cd ../..
```

期待: `OK` で終わり、`cells` の数が `divisionLabels` の数と一致する。

- [ ] **Step 3: 区分ごとに独立した値が取れていることを raw で確認する**

```bash
cd packages/scraper && node -e '
const d = require("./test-results/_spotcheck/raw/1.json");
for (const [label, tables] of Object.entries(d.rawTablesByDivision)) {
  console.log(label, "tables:", tables.length);
}
'; cd ../..
```

期待: 区分ラベルごとにキーがあり、それぞれ表が入っている。キーが空文字 1 つだけなら戦略が効いていないため、`strategyFor` の判定を見直す。

- [ ] **Step 4: 残りの自治体を観測して初回と突き合わせる**

```bash
cd packages/scraper && node tools/spotcheck/observe.ts; cd ../..
```

期待: 江東区・大田区・北区・中央区・荒川区について、2026-07-19 の初回観測（Issue #1626）と同じ記号が出る。日付が変わっている場合は値が変わるため、記号の形式（画像の alt が取れているか等）が一致することを確認する。

- [ ] **Step 5: judge を実行する**

```bash
cd packages/scraper && node tools/spotcheck/judge.ts; echo "exit=$?"; cd ../..
```

期待: `SPOTCHECK_RESULT` が出る。`UNMAPPED` が出た場合は記号表の不足であり、Issue #1626 に記録して先へ進む。

- [ ] **Step 6: 検証結果を記録する**

観測できた自治体、できなかった自治体、判定の内訳を Issue #1626 にコメントする。

```bash
gh issue comment 1626 --body "<検証結果>"
```

---

### Task 7: skill 文書の改修

**Files:**
- Modify: `.claude/commands/spot-check.md`

**Interfaces:**
- Consumes: Task 5 の `observe.ts`

フェーズ 2 を Playwright MCP でのライブ探索から `observe.ts` の実行に置き換え、区分フィルタ型サイトの節を新設する。

- [ ] **Step 1: フェーズ 2 を書き換える**

`.claude/commands/spot-check.md` の「## フェーズ 2: サイト観測（Playwright MCP）」の節を、以下の内容に差し替える。見出しは「## フェーズ 2: サイト観測（observe.ts）」とする。

````markdown
## フェーズ 2: サイト観測（observe.ts）

```bash
cd packages/scraper && node tools/spotcheck/observe.ts; cd ../..
```

`observe.ts` が plan.json の各サンプルについて実サイトを観測し、`observed/<連番>.json` と `raw/<連番>.json` とスクリーンショットを書く。

**observe.ts が借りるもの**: スクレイパーの `prepare` フック（サイトへの到達経路）だけである。
`extract` / `transform` / `STATUS_MAP` は借りない。
借りると観測が scraper の解釈をなぞることになり、同じ誤りを再現して MATCH を出すためである。
この線引きは `observeStrategy.test.ts` の盲検検査が機械的に守っている。

**あなたの仕事**: `raw/<連番>.json` を読み、observed に不足している情報を補う。

1. `bodyText` に凡例（「○=空き」等）があれば `legend` に書き足す。judge は legend を記号表より優先する
2. `bodyText` に施設の状態を説明するお知らせがあれば `note` に書く。表の記号だけでは読み取れない文脈がある（例: 2026-07-19 の江戸川区 総合文化センターは「令和8年4月から令和9年11月まで全館休館による改修工事」というお知らせがページ上部にあった）
3. `reached: false` のサンプルは note の「読めた行」を見て、室名の表記ゆれが原因なら plan の `institutionSystemName` と突き合わせる
4. `cells` の `divisionLabel` が `divisionLabels` のいずれとも対応しない場合、対応するラベルに書き換える。judge の `normalizeDivisionLabel` は全角半角と範囲記号のゆれしか吸収しない

**深追いしない**: 1 サンプルが観測できなくても全体は成立する。`reached: false` のまま次へ進む。

### 区分フィルタ型サイトの罠

豊島区と江戸川区は、施設別空き状況の画面で「その他の条件で絞り込む」から時間帯を選ぶと表が描き直される。
フィルタを操作せずに読むと全区分の集約表が読めてしまい、それらしい観測結果が得られる。
2026-07-19 の初回実行で実際にこの罠を踏み、豊島区が MATCH と判定された（その日の記号がたまたま全区分で同じだった）。

`observe.ts` は `observeStrategy.ts` の `STRATEGY_BY_MUNICIPALITY` でこの 2 自治体を `divisionFilter` として扱う。
新しい自治体で `cells` の区分ラベルが 1 種類しか出ない、あるいは全区分が同じ記号になる場合は、この罠を疑って `raw` の `rawTablesByDivision` のキーを確認する。
````

- [ ] **Step 2: 変更が反映されたことを確認する**

```bash
grep -n "observe.ts" .claude/commands/spot-check.md | head
```

期待: フェーズ 2 の節に `observe.ts` の記述がある。

- [ ] **Step 3: Playwright MCP への言及が残っていないことを確認する**

```bash
grep -n "browser_navigate\|browser_snapshot\|browser_take_screenshot\|Playwright MCP" .claude/commands/spot-check.md
```

期待: 出力なし。残っていれば削除する。

- [ ] **Step 4: コミットする**

```bash
git add .claude/commands/spot-check.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "docs(spot-check): フェーズ2を observe.ts に置き換え、区分フィルタ型サイトの罠を追記"
```

---

### Task 8: PR の作成

**Files:**
- 変更なし

- [ ] **Step 1: 全体のテストと型チェックを通す**

```bash
npm run test:unit -w @shisetsu-viewer/scraper && npm run typecheck:all && npm run lint:all
```

期待: すべて pass。

- [ ] **Step 2: push して PR を作る**

```bash
git push -u origin worktree-spotcheck-observer
gh pr create --base master --title "feat(spotcheck): 観測を observe.ts に正式化し区分フィルタ型サイトに対応" --body "<Task 6 の検証結果を含む本文>"
```

PR 本文には設計文書へのリンク、Task 7 の実サイト検証結果、Issue #1626 との関係を書く。

---

## Self-Review

**Spec coverage:**

| spec の要求 | 対応タスク |
|---|---|
| observe.ts の新設 | Task 1-6 |
| 区分フィルタ型サイトの読み取り戦略 | Task 4, 5 |
| 盲検の線引きをテストで検査 | Task 5（検査）、Task 6（対象の追加） |
| spot-check.md のフェーズ 2 書き換え | Task 8 |
| target の絞り込みとフォールバック | Task 2 |
| 行の特定 | Task 3 |
| セルから生記号への変換 | Task 1 |
| 区分ラベルを observe.ts で正規化しない | Task 6（`found.header` をそのまま使う） |
| エラー処理（1 サンプルの失敗が全体を止めない） | Task 6（try/catch と `reached: false`） |
| 検証項目 | Task 7 |

`judge.ts` / `symbolMap.ts` を変更しないという制約は、どのタスクもこれらに触れないことで満たされる。

**Placeholder scan:** Task 7 Step 2 と Task 9 Step 2 に `<toshima の id>` と `<検証結果>` のプレースホルダがあるが、これらは実行時にしか決まらない値であり、取得方法を直前のステップで示している。コードのプレースホルダはない。

**Type consistency:** `RawCell` は Task 1 で定義し Task 3・5・6 で使う。`RawTable` は Task 3 で定義し Task 5・6 で使う。`ObserveStrategy` と `strategyFor` は Task 4 で定義し Task 6 で使う。`cellToSymbol` / `selectTarget` / `findRoomRow` の名前は全タスクで一致している。`ObservedSample` と `PlanSample` は既存の `judgeReport.ts` から import しており、フィールド名は現行定義（`reached` / `dateDisplayed` / `outOfWindow` / `cells` / `legend` / `url` / `screenshotPath` / `note`）に合わせている。
