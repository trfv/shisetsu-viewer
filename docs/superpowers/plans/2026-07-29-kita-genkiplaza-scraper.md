# 北区 元気ぷらざ スクレイパー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 北区立元気ぷらざの独自予約システム（`genkiplaza.tokyo.jp/yoyaku/user.cgi`）から空き状況を取得し、`MUNICIPALITY_KITA` の施設データとして viewer に表示できるようにする。

**Architecture:** これまで同一視されていた「自治体（DB・表示の単位）」と「スクレイパー（予約システムの単位）」を分離する。registry の `additionalScrapers` が両者の対応を持ち、共通コードは `getScraperTargets()` / `getMunicipalityByScraperTarget()` 経由で解決する。取得ロジックは `engines/genkiplaza.ts` に新エンジンとして置き、DOM 読み取りと純粋なデータ変換を分ける。

**Tech Stack:** TypeScript 7（ビルドなし、Node が TS を直接実行）/ Playwright 1.61 / date-fns 4 / node:test / GitHub Actions

## Global Constraints

- 設計の出典は `docs/superpowers/specs/2026-07-29-kita-genkiplaza-scraper-design.md`。
- `packages/scraper` の依存は `@playwright/test` と `date-fns` だけ。**新規依存を追加しない**。
- `packages/shared` は zero runtime deps。date-fns も import しない。
- 型は `as` キャスト禁止。未マッピング値は `*_INVALID` へフォールバックして警告する。
- default export は名前付き const で行う（匿名アロー関数の default export は禁止）。
- Formatter は oxfmt（printWidth 100、double quotes、trailing commas es5）。Linter は oxlint。
- コミット前に lefthook が走る。非対話シェルでコマンド解決に失敗する場合は `PATH="$PWD/node_modules/.bin:$PATH" git commit ...` を使う。`--no-verify` は使わない。
- registry のラベル定義（`reservationStatus` / `reservationDivision` / `feeDivision`）は**変更しない**。
- `MUNICIPALITIES` の各要素は `as const` のリテラル型なので、共通プロパティ以外に触るときは `Object.values<MunicipalityConfig>(MUNICIPALITIES)` と明示的に型引数を書く。
- 作業ブランチは `worktree-kita-genkiplaza`。master へ直接 push しない。

---

## File Structure

| ファイル | 責務 |
| --- | --- |
| `packages/shared/registry.ts` | `additionalScrapers` フィールドと 3 つの解決ヘルパ |
| `packages/shared/index.ts` | 新ヘルパの re-export |
| `packages/shared/registry.test.ts` | 新ヘルパのユニットテスト |
| `packages/scraper/common/horizon.ts` | `HorizonUnit` に `"month"` を追加 |
| `packages/scraper/common/registryContract.test.ts` | スクレイパー単位で契約を検証 |
| `packages/scraper/common/registryDrift.test.ts` | ディレクトリ / workflow choices の突合先を変更 |
| `packages/scraper/common/scrapeTest.ts` | maintenanceWindow の引き当てを registry 解決に |
| `packages/scraper/common/jpProxy.ts` | 追加スクレイパーが親自治体の proxy 設定を継承 |
| `packages/scraper/playwright.config.ts` | CI 除外に追加スクレイパーを展開 |
| `packages/scraper/tools/updateReservations.ts` | スクレイパー単位で走査し、municipality は registry 解決 |
| `packages/scraper/scripts/shardMatrix.ts` | Playwright フィルタを `/` 付きで固定 |
| `.github/actions/scrape/action.yml` | 同上 |
| `packages/scraper/engines/genkiplaza.ts` | 元気ぷらざ CGI エンジン（純粋関数 + hooks） |
| `packages/scraper/engines/genkiplaza.test.ts` | 純粋関数のユニットテスト |
| `packages/scraper/tokyo-kita-genkiplaza/index.ts` | targets / horizon / マップの設定 |
| `packages/scraper/tokyo-kita-genkiplaza/index.test.ts` | 共通ボイラープレート |
| `packages/scraper/data/institutions/tokyo-kita.json` | 第1・第2ホールの突合キーを埋める |
| `.github/workflows/scraper.yml` | dispatch の choices に追加 |

**タスクの順序に関する注意:** registry に `additionalScrapers: ["genkiplaza"]` を書いた瞬間、`registryDrift.test.ts` が `tokyo-kita-genkiplaza/` ディレクトリの存在を要求する。したがって registry のフィールド追加（Task 1）と北区への適用（Task 6）を分け、Task 6 でディレクトリ・workflow・施設 JSON を同時に追加する。Task 1〜5 の間は全テストが green のままになる。

---

### Task 1: registry に「追加スクレイパー」の概念を足す

**Files:**
- Modify: `packages/shared/registry.ts`
- Modify: `packages/shared/index.ts`
- Test: `packages/shared/registry.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `MunicipalityConfig.additionalScrapers?: readonly string[]`
  - `getScraperTargets(): string[]`
  - `getMunicipalityByScraperTarget(target: string): MunicipalityConfig | undefined`
  - `getMunicipalityKeyByScraperTarget(target: string): MunicipalityKey | undefined`

- [ ] **Step 1: 失敗するテストを書く**

`packages/shared/registry.test.ts` の import に新しい 3 つを足し、`describe("registry", ...)` の中の末尾に以下を追加する。

```ts
  describe("getScraperTargets", () => {
    it("追加スクレイパーが無いときは getReservationTargets と一致する", () => {
      const scraperTargets = getScraperTargets();
      for (const target of getReservationTargets()) {
        assert.ok(scraperTargets.includes(target), `${target} が含まれていません`);
      }
    });

    it("重複を含まない", () => {
      const targets = getScraperTargets();
      assert.equal(new Set(targets).size, targets.length);
    });

    it("reservationExcluded の自治体を含まない", () => {
      assert.equal(
        getScraperTargets().some((t) => t.includes("suginami")),
        false
      );
    });
  });

  describe("getMunicipalityByScraperTarget", () => {
    it("自治体そのものの target を解決する", () => {
      const result = getMunicipalityByScraperTarget("tokyo-kita");
      assert.ok(result);
      assert.equal(result.label, "北区");
    });

    it("未知の target には undefined を返す", () => {
      assert.equal(getMunicipalityByScraperTarget("tokyo-unknown"), undefined);
    });

    it("自治体名の前方一致では解決しない", () => {
      assert.equal(getMunicipalityByScraperTarget("tokyo-kit"), undefined);
    });
  });

  describe("getMunicipalityKeyByScraperTarget", () => {
    it("自治体そのものの target からキーを返す", () => {
      assert.equal(getMunicipalityKeyByScraperTarget("tokyo-kita"), "MUNICIPALITY_KITA");
    });

    it("未知の target には undefined を返す", () => {
      assert.equal(getMunicipalityKeyByScraperTarget("tokyo-unknown"), undefined);
    });
  });
```

import 文は次のようにする。

```ts
import {
  getMunicipalityByScraperTarget,
  getMunicipalityBySlug,
  getMunicipalityKeyByScraperTarget,
  getMunicipalityKeyBySlug,
  getReservationTargets,
  getScraperTargets,
} from "./registry.ts";
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --test --test-isolation=none 'packages/shared/*.test.ts'`
Expected: FAIL（`getScraperTargets` などが export されていない旨のエラー）

- [ ] **Step 3: 最小の実装を書く**

`packages/shared/registry.ts` の `MunicipalityConfig` に、`maintenanceWindowJst` の直後へ次を追加する。

```ts
  /**
   * 同一自治体に複数の予約システムがある場合の、追加スクレイパー名。
   * スクレイパーのディレクトリと test-results は `<prefecture>-<slug>-<name>` になり、
   * DB 上の municipality は親自治体と同じになる。
   * 例: 北区の元気ぷらざ（`additionalScrapers: ["genkiplaza"]`）
   */
  readonly additionalScrapers?: readonly string[];
```

同ファイルの末尾（`getAllMunicipalityTargets` の後）に次を追加する。

```ts
/** 自治体設定が指定のスクレイパー target に対応するかを判定する。 */
function matchesScraperTarget(config: MunicipalityConfig, target: string): boolean {
  const base = `${config.prefecture}-${config.slug}`;
  if (base === target) return true;
  return (config.additionalScrapers ?? []).some((name) => `${base}-${name}` === target);
}

/**
 * スクレイパーのディレクトリ名の一覧。
 * 自治体単位の `getReservationTargets()` に、追加スクレイパーを展開したものを加える。
 */
export function getScraperTargets(): string[] {
  return Object.values<MunicipalityConfig>(MUNICIPALITIES)
    .filter((m) => !m.reservationExcluded)
    .flatMap((m) => {
      const base = `${m.prefecture}-${m.slug}`;
      return [base, ...(m.additionalScrapers ?? []).map((name) => `${base}-${name}`)];
    });
}

/** スクレイパー target（例 "tokyo-kita-genkiplaza"）から自治体設定を引く。 */
export function getMunicipalityByScraperTarget(target: string): MunicipalityConfig | undefined {
  return Object.values<MunicipalityConfig>(MUNICIPALITIES).find((m) =>
    matchesScraperTarget(m, target)
  );
}

/** スクレイパー target から自治体キー（DB の municipality 値）を引く。 */
export function getMunicipalityKeyByScraperTarget(target: string): MunicipalityKey | undefined {
  return MUNICIPALITY_KEYS.find((key) => matchesScraperTarget(MUNICIPALITIES[key], target));
}
```

`packages/shared/index.ts` の registry re-export に 3 つを追加する。

```ts
export {
  MUNICIPALITIES,
  MUNICIPALITY_KEYS,
  getMunicipalityBySlug,
  getMunicipalityKeyBySlug,
  getMunicipalityByScraperTarget,
  getMunicipalityKeyByScraperTarget,
  getReservationTargets,
  getScraperTargets,
  getAllMunicipalityTargets,
} from "./registry.ts";
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --test --test-isolation=none 'packages/shared/*.test.ts'`
Expected: PASS

Run: `npm run typecheck:all`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add packages/shared/registry.ts packages/shared/index.ts packages/shared/registry.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(shared): registry に追加スクレイパーの解決ヘルパを足す"
```

---

### Task 2: 共通コードをスクレイパー単位の解決に移行する

この時点では挙動は一切変わらない（`additionalScrapers` を持つ自治体がまだ無いため）。既存テストが green のままであることが、リファクタが安全であることの証明になる。

**Files:**
- Modify: `packages/scraper/common/registryContract.test.ts`
- Modify: `packages/scraper/common/registryDrift.test.ts:70-77`
- Modify: `packages/scraper/common/scrapeTest.ts:41-43`
- Modify: `packages/scraper/common/jpProxy.ts`
- Modify: `packages/scraper/playwright.config.ts:18-21`
- Modify: `packages/scraper/tools/updateReservations.ts:1-38`

**Interfaces:**
- Consumes: Task 1 の `getScraperTargets` / `getMunicipalityByScraperTarget` / `getMunicipalityKeyByScraperTarget`
- Produces: なし（内部リファクタ）

- [ ] **Step 1: 既存テストが通っていることを先に確認する（ベースライン）**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（この出力を基準にする）

- [ ] **Step 2: `registryContract.test.ts` をスクレイパー単位にする**

import を差し替える。

```ts
import { getMunicipalityByScraperTarget, getScraperTargets } from "@shisetsu-viewer/shared";
```

`describe` の中身を次のように書き換える（`slug` 切り出しをやめる）。

```ts
describe("registry contract", () => {
  for (const target of getScraperTargets()) {
    it(`${target}: municipality とマップ値域が registry と整合している`, async () => {
      const mod = (await import(`../${target}/index.ts`)) as ScraperModule;
      const config = getMunicipalityByScraperTarget(target);
      assert.ok(config, `registry に scraper target=${target} の自治体がありません`);
```

以降（`mod.scraper?.municipality` の比較、`DIVISION_MAP` / `STATUS_MAP` の値域検査）は変更しない。

- [ ] **Step 3: `registryDrift.test.ts` の突合先を変える**

import に `getScraperTargets` を足し、2 つの it を書き換える。

```ts
  it("scraper.yml の choice が getScraperTargets() + all と一致している", () => {
    const options = extractMunicipalityOptions(join(repoRoot, ".github/workflows/scraper.yml"));
    assert.deepEqual(sorted(options), sorted([...getScraperTargets(), "all"]));
  });
```

```ts
  it("スクレイパーディレクトリが getScraperTargets() と一致している", () => {
    const dirs = readdirSync(scraperRoot, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(scraperRoot, entry.name, "index.test.ts"))
      )
      .map((entry) => entry.name);
    assert.deepEqual(sorted(dirs), sorted(getScraperTargets()));
  });
```

`database.yml` の it と施設 JSON の it は `getAllMunicipalityTargets()` のまま変更しない（自治体単位のため）。

- [ ] **Step 4: `scrapeTest.ts` の slug 切り出しを置き換える**

import を差し替える。

```ts
import { getMunicipalityByScraperTarget } from "@shisetsu-viewer/shared";
```

41-43 行目を次に置き換える。

```ts
  // registry の maintenanceWindowJst（追加スクレイパーは親自治体の設定を継承する）
  const maintenanceWindowJst =
    getMunicipalityByScraperTarget(def.municipality)?.maintenanceWindowJst;
```

- [ ] **Step 5: `jpProxy.ts` を registry 解決にする**

ファイル全体を次に置き換える。

```ts
import { getMunicipalityByScraperTarget } from "@shisetsu-viewer/shared";

/**
 * スクレイパー target（例 "tokyo-sumida"）が国内 proxy 経由の対象かを registry から引く。
 * 追加スクレイパー（例 "tokyo-kita-genkiplaza"）は親自治体の設定を継承する。
 */
export function isViaJpProxy(target: string): boolean {
  return getMunicipalityByScraperTarget(target)?.scraperViaJpProxy === true;
}
```

- [ ] **Step 6: `playwright.config.ts` の CI 除外に追加スクレイパーを展開する**

18-21 行目を次に置き換える。

```ts
const ciExcludedTargets = Object.values<MunicipalityConfig>(MUNICIPALITIES)
  .filter((m) => m.scraperCiExcluded)
  .flatMap((m) => {
    const base = `${m.prefecture}-${m.slug}`;
    return [base, ...(m.additionalScrapers ?? []).map((name) => `${base}-${name}`)];
  })
  .filter((target) => !forceInclude.includes(target));
```

- [ ] **Step 7: `updateReservations.ts` の municipality 解決を置き換える**

1-12 行目の import と target 決定を次にする。

```ts
import fs from "fs/promises";

import {
  getMunicipalityByScraperTarget,
  getMunicipalityKeyByScraperTarget,
  getScraperTargets,
} from "@shisetsu-viewer/shared";

import { upsertReservations as d1UpsertReservations } from "./backend/d1Api.ts";
import { fetchInstitutionKeyMap, upsertReservations } from "./backend/hasura.ts";
import { buildReservationRows } from "./backend/transform.ts";
import type { FileData } from "./backend/types.ts";

const allTargets = getScraperTargets();
```

34-36 行目（`const [p, m] = target.split("-")` の 3 行）を次に置き換える。

```ts
  const config = getMunicipalityByScraperTarget(target);
  const municipality = getMunicipalityKeyByScraperTarget(target);
  if (config === undefined || municipality === undefined) {
    throw new Error(`registry に scraper target=${target} の自治体がありません`);
  }
  const prefecture = `PREFECTURE_${config.prefecture.toUpperCase()}`;
```

- [ ] **Step 8: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（Step 1 と同じ件数）

Run: `npm run typecheck:all`
Expected: エラーなし

- [ ] **Step 9: コミット**

```bash
git add packages/scraper/common packages/scraper/playwright.config.ts packages/scraper/tools/updateReservations.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "refactor(scraper): 自治体とスクレイパーの解決を分離する"
```

---

### Task 3: horizon に月単位を足す

**Files:**
- Modify: `packages/scraper/common/horizon.ts`
- Test: `packages/scraper/common/horizon.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `HorizonUnit` に `"month"` が加わる。`pagesForHorizon({ startOffsetDays, monthsAhead, unit: "month" }, now)` が月数を返す

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/common/horizon.test.ts` の既存の describe 内に追加する。

```ts
  it('unit "month" は開始月から終了月までの月数を返す', () => {
    const now = new Date("2026-07-29T00:00:00+09:00");
    // start = 2026-07-30、end = addMonths(endOfMonth(start), 3) = 2026-10-31
    // → 7月・8月・9月・10月 の 4 ヶ月
    assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 3, unit: "month" }, now), 4);
  });

  it('unit "month" は月末に開始オフセットが翌月へまたぐ場合も正しく数える', () => {
    const now = new Date("2026-07-31T00:00:00+09:00");
    // start = 2026-08-01、end = addMonths(endOfMonth(start), 3) = 2026-11-30
    // → 8月・9月・10月・11月 の 4 ヶ月
    assert.equal(pagesForHorizon({ startOffsetDays: 1, monthsAhead: 3, unit: "month" }, now), 4);
  });
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`"month"` が `HorizonUnit` に無いという型エラー、または実行時の想定外の戻り値）

- [ ] **Step 3: 最小の実装を書く**

`packages/scraper/common/horizon.ts` の import に `differenceInCalendarMonths` を足す。

```ts
import {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInDays,
  differenceInWeeks,
  endOfMonth,
} from "date-fns";
```

`HorizonUnit` に月を追加する。

```ts
/**
 * 1回のページ送りがカバーする期間の単位。
 * - "day": 1ページ = 1日（翌日リンクで送るサイト）
 * - "week": 1ページ = 1週間
 * - "twoWeeks": 1ページ = 2週間（WebR Grand 系のカレンダー表示）
 * - "calendarWeek": 1ページ = 暦週（日曜起点。週の途中開始でも1ページと数える）
 * - "month": 1ページ = 暦月（月別テーブルを月数ぶん返すサイト）
 */
type HorizonUnit = "day" | "week" | "twoWeeks" | "calendarWeek" | "month";
```

`pagesForHorizon` の switch に case を足す。

```ts
    case "calendarWeek":
      return differenceInCalendarWeeks(end, start) + 1;
    case "month":
      return differenceInCalendarMonths(end, start) + 1;
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add packages/scraper/common/horizon.ts packages/scraper/common/horizon.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): horizon に月単位を足す"
```

---

### Task 4: genkiplaza エンジンの純粋関数

DOM 読み取りは Task 5 に置き、ここでは「読み取った文字列 → `RawSlot[]`」の純粋な変換だけを作る。

**Files:**
- Create: `packages/scraper/engines/genkiplaza.ts`
- Create: `packages/scraper/engines/genkiplaza.test.ts`
- Modify: `packages/scraper/package.json`（`test:unit` の glob に `engines/*.test.ts` を足す）

**Interfaces:**
- Consumes: `RawSlot`（`common/reservation.ts`）
- Produces:
  - `interface GenkiplazaMonthTable { heading: string; rows: string[][] }`
  - `interface GenkiplazaRawPage { headings: string[]; tables: string[][][] }`
  - `interface GenkiplazaTarget { facilityName: string; roomNames: readonly string[] }`
  - `dedupeConsecutive(values: readonly string[]): string[]`
  - `parseHeading(heading: string): { year: number; month: number } | undefined`
  - `parseRowLabel(label: string): { roomName: string; division: string } | undefined`
  - `zipMonthTables(raw: GenkiplazaRawPage): GenkiplazaMonthTable[]`
  - `buildSlots(tables: readonly GenkiplazaMonthTable[], roomNames: readonly string[], minDate: string): RawSlot[]`

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/engines/genkiplaza.test.ts` を新規作成する。

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSlots,
  dedupeConsecutive,
  parseHeading,
  parseRowLabel,
  zipMonthTables,
} from "./genkiplaza.ts";

/** 1 ヶ月分の行を作る。cells は 1 日から順に並べ、31 個に満たない分は空欄で埋める */
function row(label: string, ...cells: string[]): string[] {
  return [label, ...cells, ...Array(31 - cells.length).fill("")];
}

describe("genkiplaza", () => {
  describe("dedupeConsecutive", () => {
    it("連続する重複を 1 つにまとめる", () => {
      assert.deepEqual(dedupeConsecutive(["a", "a", "b", "b", "b", "c"]), ["a", "b", "c"]);
    });

    it("離れた位置の同値は残す", () => {
      assert.deepEqual(dedupeConsecutive(["a", "b", "a"]), ["a", "b", "a"]);
    });

    it("空配列を許容する", () => {
      assert.deepEqual(dedupeConsecutive([]), []);
    });
  });

  describe("parseHeading", () => {
    it("見出しから年月を取り出す", () => {
      assert.deepEqual(parseHeading("2026年7月"), { year: 2026, month: 7 });
    });

    it("年跨ぎの見出しを取り出す", () => {
      assert.deepEqual(parseHeading("2027年1月"), { year: 2027, month: 1 });
    });

    it("形式が違えば undefined を返す", () => {
      assert.equal(parseHeading("令和8年7月"), undefined);
      assert.equal(parseHeading(""), undefined);
    });
  });

  describe("parseRowLabel", () => {
    it("部屋名と区分に分解する", () => {
      assert.deepEqual(parseRowLabel("第一ホール＜午前＞"), {
        roomName: "第一ホール",
        division: "午前",
      });
    });

    it("和室の行も分解する", () => {
      assert.deepEqual(parseRowLabel("第三和室＜夜間＞"), {
        roomName: "第三和室",
        division: "夜間",
      });
    });

    it("区分の括弧が無い行（日付ヘッダー等）は undefined を返す", () => {
      assert.equal(parseRowLabel(""), undefined);
      assert.equal(parseRowLabel("第一ホール"), undefined);
    });
  });

  describe("zipMonthTables", () => {
    it("重複した見出しをまとめてテーブルと対応づける", () => {
      const result = zipMonthTables({
        headings: ["2026年7月", "2026年7月", "2026年8月", "2026年8月", "2026年8月"],
        tables: [[row("第一ホール＜午前＞", "◎")], [row("第一ホール＜午前＞", "×")]],
      });
      assert.equal(result.length, 2);
      assert.equal(result[0]?.heading, "2026年7月");
      assert.equal(result[1]?.heading, "2026年8月");
    });

    it("見出しとテーブルの数が食い違ったら投げる", () => {
      assert.throws(
        () =>
          zipMonthTables({
            headings: ["2026年7月"],
            tables: [[row("第一ホール＜午前＞", "◎")], [row("第一ホール＜午前＞", "×")]],
          }),
        /月見出し/
      );
    });
  });

  describe("buildSlots", () => {
    const rooms = ["第一ホール", "第二ホール"];

    it("部屋 × 日 × 区分の RawSlot を組み立てる", () => {
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎", "×", "－")] }],
        rooms,
        "2026-07-01"
      );
      assert.deepEqual(slots, [
        { roomName: "第一ホール", date: "2026-07-01", division: "午前", status: "◎" },
        { roomName: "第一ホール", date: "2026-07-02", division: "午前", status: "×" },
        { roomName: "第一ホール", date: "2026-07-03", division: "午前", status: "－" },
      ]);
    });

    it("空欄のセルは行にしない（未公開の月）", () => {
      const slots = buildSlots(
        [{ heading: "2026年11月", rows: [row("第一ホール＜午前＞")] }],
        rooms,
        "2026-07-01"
      );
      assert.deepEqual(slots, []);
    });

    it("実在しない日付は捨てる（30 日の月の 31 列目）", () => {
      const cells = Array(31).fill("◎");
      const slots = buildSlots(
        [{ heading: "2026年9月", rows: [["第一ホール＜午前＞", ...cells]] }],
        rooms,
        "2026-09-01"
      );
      assert.equal(slots.length, 30);
      assert.equal(slots.at(-1)?.date, "2026-09-30");
    });

    it("対象外の部屋の行は捨てる", () => {
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [row("第三和室＜夜間＞", "◎")] }],
        rooms,
        "2026-07-01"
      );
      assert.deepEqual(slots, []);
    });

    it("minDate より前の日付は捨てる", () => {
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎", "◎", "◎")] }],
        rooms,
        "2026-07-03"
      );
      assert.deepEqual(slots, [
        { roomName: "第一ホール", date: "2026-07-03", division: "午前", status: "◎" },
      ]);
    });

    it("日付ヘッダー行を読み飛ばす", () => {
      const header = ["", ...Array.from({ length: 31 }, (_, i) => String(i + 1))];
      const slots = buildSlots(
        [{ heading: "2026年7月", rows: [header, row("第一ホール＜午前＞", "◎")] }],
        rooms,
        "2026-07-01"
      );
      assert.equal(slots.length, 1);
      assert.equal(slots[0]?.status, "◎");
    });

    it("見出しが読めなければ投げる", () => {
      assert.throws(
        () => buildSlots([{ heading: "", rows: [row("第一ホール＜午前＞", "◎")] }], rooms, "2026-07-01"),
        /月見出し/
      );
    });

    it("同じ月のテーブルが 2 つ現れたら投げる", () => {
      assert.throws(
        () =>
          buildSlots(
            [
              { heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎")] },
              { heading: "2026年7月", rows: [row("第一ホール＜午前＞", "◎")] },
            ],
            rooms,
            "2026-07-01"
          ),
        /連続した月/
      );
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

まず `packages/scraper/package.json` の `test:unit` に `engines/*.test.ts` を足す。

```json
    "test:unit": "node --test --test-isolation=none 'common/*.test.ts' 'engines/*.test.ts' 'tools/backend/*.test.ts' 'tools/spotcheck/*.test.ts'",
```

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`./genkiplaza.ts` が存在しない）

- [ ] **Step 3: 最小の実装を書く**

`packages/scraper/engines/genkiplaza.ts` を新規作成する。

```ts
import { getDaysInMonth } from "date-fns";

import type { RawSlot } from "../common/reservation.ts";

/**
 * 元気ぷらざ独自 CGI（genkiplaza.tokyo.jp/yoyaku/user.cgi）用エンジン。
 * 採用自治体: tokyo-kita-genkiplaza
 *
 * ナビゲーション: user.cgi 単一ページ。yyyy / mm / span を POST すると
 * span ヶ月ぶんの月別テーブルが 1 ページに並ぶ（ページ送りは無い）。
 * 各テーブルは 行 = `<部屋名>＜<区分>＞`、列 = 1〜31 日の固定 31 列。
 */

/** サイト側の span（ヶ月）の上限 */
export const MAX_SPAN = 6;

/** extract が DOM から読み取った生の内容 */
export interface GenkiplazaRawPage {
  /** ページ内に現れた「YYYY年M月」の全出現（重複を含む、文書順） */
  headings: string[];
  /** テーブルごとの行。各行は [先頭セル, 1日, 2日, ...] */
  tables: string[][][];
}

/** 見出しと対応づけた 1 ヶ月分のテーブル */
export interface GenkiplazaMonthTable {
  heading: string;
  rows: string[][];
}

export interface GenkiplazaTarget {
  facilityName: string;
  /** 取り込む部屋名（サイト表記）。ここに無い行は捨てる */
  roomNames: readonly string[];
}

/** 連続する重複を 1 つにまとめる（同じ見出しが入れ子要素で複数回現れるため） */
export function dedupeConsecutive(values: readonly string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

/** 「2026年7月」形式の見出しから年月を取り出す */
export function parseHeading(heading: string): { year: number; month: number } | undefined {
  const match = heading.match(/^(\d{4})年(\d{1,2})月$/);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** 「第一ホール＜午前＞」形式の行ラベルを部屋名と区分に分解する */
export function parseRowLabel(label: string): { roomName: string; division: string } | undefined {
  const match = label.match(/^(.+)＜(.+)＞$/);
  if (!match) return undefined;
  return { roomName: match[1] ?? "", division: match[2] ?? "" };
}

/**
 * 見出しの列とテーブルの列を文書順で対応づける。
 * 数が食い違う場合はサイト構造が変わったとみなして投げる。
 */
export function zipMonthTables(raw: GenkiplazaRawPage): GenkiplazaMonthTable[] {
  const headings = dedupeConsecutive(raw.headings);
  if (headings.length !== raw.tables.length) {
    throw new Error(
      `genkiplaza: 月見出しの数 ${headings.length} とテーブルの数 ${raw.tables.length} が一致しません`
    );
  }
  return raw.tables.map((rows, index) => ({ heading: headings[index] ?? "", rows }));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 月別テーブルの列から RawSlot を組み立てる。
 * 以下は RawSlot にしない:
 * - 空欄のセル（サイトが公開していない先の月）
 * - 実在しない日付（30 日以下の月の 31 列目）
 * - roomNames に含まれない部屋の行、および区分括弧を持たない行（日付ヘッダー等）
 * - minDate より前の日付（サイトは常に月初から表示するため過去日が混ざる）
 */
export function buildSlots(
  tables: readonly GenkiplazaMonthTable[],
  roomNames: readonly string[],
  minDate: string
): RawSlot[] {
  const slots: RawSlot[] = [];
  let previous: { year: number; month: number } | undefined;

  for (const table of tables) {
    const parsed = parseHeading(table.heading);
    if (parsed === undefined) {
      throw new Error(`genkiplaza: 月見出しを解釈できません: "${table.heading}"`);
    }
    if (previous !== undefined) {
      const expected = previous.month === 12 ? { year: previous.year + 1, month: 1 } : { year: previous.year, month: previous.month + 1 };
      if (parsed.year !== expected.year || parsed.month !== expected.month) {
        throw new Error(
          `genkiplaza: テーブルが連続した月になっていません（${previous.year}年${previous.month}月 の次が ${table.heading}）`
        );
      }
    }
    previous = parsed;

    const daysInMonth = getDaysInMonth(new Date(parsed.year, parsed.month - 1, 1));
    for (const row of table.rows) {
      const label = parseRowLabel(row[0] ?? "");
      if (label === undefined) continue;
      if (!roomNames.includes(label.roomName)) continue;

      for (let day = 1; day <= daysInMonth; day++) {
        const status = row[day] ?? "";
        if (status === "") continue;
        const date = `${parsed.year}-${pad2(parsed.month)}-${pad2(day)}`;
        if (date < minDate) continue;
        slots.push({ roomName: label.roomName, date, division: label.division, status });
      }
    }
  }
  return slots;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS

Run: `npm run typecheck:all`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add packages/scraper/engines/genkiplaza.ts packages/scraper/engines/genkiplaza.test.ts packages/scraper/package.json
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): genkiplaza エンジンの変換ロジックを足す"
```

---

### Task 5: genkiplaza エンジンの hooks

**Files:**
- Modify: `packages/scraper/engines/genkiplaza.ts`

**Interfaces:**
- Consumes: Task 4 の `zipMonthTables` / `buildSlots` / `MAX_SPAN` / `GenkiplazaTarget` / `GenkiplazaRawPage`
- Produces: `genkiplazaHooks(config: GenkiplazaConfig)` が `{ prepare, extract, transform }` を返す

- [ ] **Step 1: 実装を書く**

`packages/scraper/engines/genkiplaza.ts` の import を次にする。

```ts
import type { Page } from "@playwright/test";
import { addDays, format, getDaysInMonth } from "date-fns";

import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";
```

`GenkiplazaTarget` の下に config を追加する。

```ts
export interface GenkiplazaConfig {
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /**
   * 取得開始日のオフセット（日）。scraper 側 `horizon.startOffsetDays` と揃える。
   * サイトが常に月初から表示するため、これより前の日付を捨てるのに使う。
   */
  startOffsetDays: number;
}
```

ファイル末尾に DOM 読み取りと hooks を追加する。

```ts
/**
 * ページ内の全テーブルと、全ての「YYYY年M月」テキストを文書順で読み取る。
 * セルの空白（半角・全角・改行）は全て除去する。全角空白のみのセルは "" になり、
 * 未公開の月として buildSlots が捨てる。
 */
async function readRawPage(page: Page): Promise<GenkiplazaRawPage> {
  return page.evaluate(() => {
    const headings: string[] = [];
    for (const element of document.querySelectorAll("*")) {
      if (element.children.length > 0) continue;
      const text = (element.textContent ?? "").trim();
      if (/^\d{4}年\d{1,2}月$/.test(text)) headings.push(text);
    }
    const tables = [...document.querySelectorAll("table")].map((table) =>
      [...table.querySelectorAll("tr")].map((tr) =>
        [...tr.querySelectorAll("th,td")].map((cell) =>
          (cell.textContent ?? "").replace(/[\s　]/g, "")
        )
      )
    );
    return { headings, tables };
  });
}

export function genkiplazaHooks(config: GenkiplazaConfig): {
  prepare: (page: Page, target: GenkiplazaTarget) => Promise<Page>;
  extract: (
    page: Page,
    target: GenkiplazaTarget,
    pageCount: number
  ) => Promise<GenkiplazaMonthTable[]>;
  transform: (extracted: GenkiplazaMonthTable[], target: GenkiplazaTarget) => TransformOutput;
} {
  return {
    async prepare(page) {
      // user.cgi 自体が空き状況テーブルのページ（既定は当月・1 ヶ月）
      await page.goto(config.baseUrl);
      await page.locator('select[name="span"]').waitFor();
      return page;
    },

    async extract(page, _target, pageCount) {
      const span = Math.min(Math.max(pageCount, 1), MAX_SPAN);
      const start = addDays(new Date(), config.startOffsetDays);
      // yyyy の選択肢は当年のみ。年跨ぎはサーバが mm + span から解決する
      await page.selectOption('select[name="mm"]', String(start.getMonth() + 1));
      await page.selectOption('select[name="span"]', String(span));
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        page.locator('input[name="view"]').click(),
      ]);
      await page.locator("table").first().waitFor();
      return zipMonthTables(await readRawPage(page));
    },

    transform(extracted, target) {
      const minDate = format(addDays(new Date(), config.startOffsetDays), "yyyy-MM-dd");
      const slots = buildSlots(extracted, target.roomNames, minDate);
      return rawSlotsToOutput(slots, config.divisionMap, config.statusMap);
    },
  };
}
```

- [ ] **Step 2: 型と lint を確認する**

Run: `npm run typecheck:all`
Expected: エラーなし

Run: `npm run lint:all && npm run format:check:all`
Expected: エラーなし（`format:fix:all` で整形してよい）

- [ ] **Step 3: ユニットテストが引き続き通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add packages/scraper/engines/genkiplaza.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): genkiplaza エンジンの hooks を足す"
```

---

### Task 6: tokyo-kita-genkiplaza を追加する

registry・ディレクトリ・workflow・施設 JSON を同時に足す。ここまでの Task が正しければ、drift 検査と契約検査が自動でこのタスクの抜け漏れを指摘する。

**Files:**
- Modify: `packages/shared/registry.ts`（`MUNICIPALITY_KITA` に `additionalScrapers`）
- Create: `packages/scraper/tokyo-kita-genkiplaza/index.ts`
- Create: `packages/scraper/tokyo-kita-genkiplaza/index.test.ts`
- Modify: `.github/workflows/scraper.yml`
- Modify: `packages/scraper/data/institutions/tokyo-kita.json`

**Interfaces:**
- Consumes: Task 5 の `genkiplazaHooks` / `GenkiplazaTarget`、Task 3 の `unit: "month"`
- Produces: スクレイパー target `tokyo-kita-genkiplaza`

- [ ] **Step 1: registry に北区の追加スクレイパーを書く**

`packages/shared/registry.ts` の `MUNICIPALITY_KITA` の `reservationExcluded: false,` の直後に追加する。

```ts
    // 元気ぷらざは区の共通システム（OpenReaf）とは別の独自 CGI で予約状況を出している
    additionalScrapers: ["genkiplaza"],
```

`reservationStatus` / `reservationDivision` / `feeDivision` は変更しない。

- [ ] **Step 2: drift 検査が失敗することを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL 3 件 — drift 検査の `スクレイパーディレクトリが getScraperTargets() と一致している` と `scraper.yml の choice ...`、および契約検査の `tokyo-kita-genkiplaza: ...`（`../tokyo-kita-genkiplaza/index.ts` を import できない）

- [ ] **Step 3: スクレイパーを作る**

`packages/scraper/tokyo-kita-genkiplaza/index.ts` を新規作成する。

```ts
import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { genkiplazaHooks, type GenkiplazaTarget } from "../engines/genkiplaza.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "◎": "RESERVATION_STATUS_VACANT",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
};

const START_OFFSET_DAYS = 1;

const targets: GenkiplazaTarget[] = [
  {
    facilityName: "北区立元気ぷらざ",
    // 和室 4 室はサイトに出るが施設マスタに未登録のため取り込まない
    roomNames: ["第一ホール", "第二ホール"],
  },
];

export const scraper = defineScraper({
  municipality: "tokyo-kita-genkiplaza",
  targets,
  // サイトの公開範囲は抽選開始（3 ヶ月前月初）に合わせて約 3 ヶ月先まで
  horizon: { startOffsetDays: START_OFFSET_DAYS, monthsAhead: 3, unit: "month" },
  facility: (t) => t.facilityName,
  context: (t) => ({ roomNames: t.roomNames }),
  ...genkiplazaHooks({
    baseUrl: "https://genkiplaza.tokyo.jp/yoyaku/user.cgi",
    divisionMap: DIVISION_MAP,
    statusMap: STATUS_MAP,
    startOffsetDays: START_OFFSET_DAYS,
  }),
});
```

`packages/scraper/tokyo-kita-genkiplaza/index.test.ts` を新規作成する（全自治体共通のボイラープレート）。

```ts
import { test } from "@playwright/test";

import { runScrapeTarget, scrapeTestTitle } from "../common/scrapeTest.ts";
import { scraper } from "./index.ts";

for (const target of scraper.targets) {
  test(scrapeTestTitle(scraper, target), async ({ page }) => {
    await runScrapeTarget(scraper, target, page);
  });
}
```

- [ ] **Step 4: workflow の choices に足す**

`.github/workflows/scraper.yml` の `options:` の `- tokyo-kita` の直後に追加する。

```yaml
          - tokyo-kita-genkiplaza
```

- [ ] **Step 5: 施設 JSON の突合キーを埋める**

`packages/scraper/data/institutions/tokyo-kita.json` の「北区立元気ぷらざ 第1ホール」「第2ホール」の 2 エントリを編集する。

第1ホール:
```json
    "building_system_name": "北区立元気ぷらざ",
    "institution_system_name": "第一ホール",
```

第2ホール:
```json
    "building_system_name": "北区立元気ぷらざ",
    "institution_system_name": "第二ホール",
```

`building` / `institution`（表示名「第1ホール」「第2ホール」）は変更しない。

- [ ] **Step 6: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（drift 検査 4 件と契約検査が新 target を含めて通る）

Run: `npm run typecheck:all && npm run lint:all && npm run format:check:all`
Expected: エラーなし

- [ ] **Step 7: コミット**

```bash
git add packages/shared/registry.ts packages/scraper/tokyo-kita-genkiplaza packages/scraper/data/institutions/tokyo-kita.json .github/workflows/scraper.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): 北区 元気ぷらざのスクレイパーを足す"
```

---

### Task 7: Playwright のテストフィルタを固定する

`npx playwright test tokyo-kita` の位置引数はファイルパスに対する正規表現なので、そのままでは `tokyo-kita-genkiplaza/index.test.ts` にも一致する。

**Files:**
- Modify: `packages/scraper/scripts/shardMatrix.ts`
- Modify: `.github/actions/scrape/action.yml:85,87`

**Interfaces:**
- Consumes: Task 6 で追加された `tokyo-kita-genkiplaza/`
- Produces: なし

- [ ] **Step 1: 部分一致が起きることを実際に確認する**

Run: `cd packages/scraper && npx playwright test tokyo-kita --list --reporter=list | grep -c genkiplaza`
Expected: 1 以上（＝ `tokyo-kita` の指定で genkiplaza のテストも拾われている）

- [ ] **Step 2: shardMatrix のフィルタに末尾スラッシュを足す**

`packages/scraper/scripts/shardMatrix.ts` の `args.push(municipality)` を次に置き換える。

```ts
  if (municipality && municipality !== "all") {
    // 位置引数はファイルパスへの正規表現。末尾 `/` を付けないと
    // "tokyo-kita" が "tokyo-kita-genkiplaza/index.test.ts" にも一致する
    args.push(`${municipality}/`);
  }
```

- [ ] **Step 3: scrape アクションのフィルタにも足す**

`.github/actions/scrape/action.yml` の `Run Playwright tests` ステップを次にする。

```yaml
      run: |
        # 位置引数はファイルパスへの正規表現。末尾 `/` でディレクトリ境界に固定する
        # （付けないと tokyo-kita が tokyo-kita-genkiplaza にも一致する）
        if [ "${{ inputs.debug }}" == "true" ]; then
          DEBUG=pw:api npx playwright test "${{ inputs.municipality }}/" --shard=${{ inputs.shardIndex }}/${{ inputs.shardTotal }}
        else
          npx playwright test "${{ inputs.municipality }}/" --shard=${{ inputs.shardIndex }}/${{ inputs.shardTotal }}
        fi
```

- [ ] **Step 4: 分離できたことを確認する**

Run: `cd packages/scraper && npx playwright test "tokyo-kita/" --list --reporter=list | grep -c genkiplaza`
Expected: 0

Run: `cd packages/scraper && node scripts/shardMatrix.ts tokyo-kita --density 5`
Expected: `include` に `tokyo-kita` のみが現れ、`tokyo-kita-genkiplaza` を含まない

Run: `cd packages/scraper && node scripts/shardMatrix.ts tokyo-kita-genkiplaza --density 5`
Expected: `include` に `tokyo-kita-genkiplaza` が 1 件

- [ ] **Step 5: コミット**

```bash
git add packages/scraper/scripts/shardMatrix.ts .github/actions/scrape/action.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "fix(ci): Playwright のテストフィルタをディレクトリ境界に固定する"
```

---

### Task 8: 実サイトで検証する

**Files:**
- 変更なし（検証のみ。問題が見つかった場合は該当タスクのファイルを直す）

**Interfaces:**
- Consumes: Task 6 の `tokyo-kita-genkiplaza`
- Produces: `packages/scraper/test-results/tokyo-kita-genkiplaza/北区立元気ぷらざ.json`

- [ ] **Step 1: 実サイトに対してスクレイプする**

Run: `cd packages/scraper && TZ=Asia/Tokyo npx playwright test "tokyo-kita-genkiplaza/"`
Expected: PASS（1 テスト）

- [ ] **Step 2: 出力を検査する**

Run:
```bash
cd packages/scraper && node -e "
const d = require('./test-results/tokyo-kita-genkiplaza/北区立元気ぷらざ.json');
console.log('facility:', d.facility_name);
const rooms = [...new Set(d.data.map(x => x.room_name))];
console.log('rooms:', rooms);
const dates = d.data.map(x => x.date).sort();
console.log('rows:', d.data.length, 'date range:', dates[0], '..', dates.at(-1));
console.log('sample:', JSON.stringify(d.data[0]));
const statuses = new Set(d.data.flatMap(x => Object.values(x.reservation)));
console.log('statuses:', [...statuses]);
const divisions = new Set(d.data.flatMap(x => Object.keys(x.reservation)));
console.log('divisions:', [...divisions]);
"
```

Expected:
- `facility_name` が `北区立元気ぷらざ`
- `rooms` が `["第一ホール", "第二ホール"]` の 2 件のみ（和室が混ざっていない）
- `date range` の開始が実行日以降、終了が約 3 ヶ月先の月末
- `statuses` に `RESERVATION_STATUS_INVALID` が**含まれない**
- `divisions` が `RESERVATION_DIVISION_MORNING` / `_AFTERNOON` / `_EVENING` の 3 種のみ

- [ ] **Step 3: 実サイトの表示と突き合わせる**

`https://genkiplaza.tokyo.jp/yoyaku/user.cgi` をブラウザで開き、当月の第一ホールの行を目視する。
JSON の同じ日付・区分の値と、記号（`◎` → `VACANT`、`×` → `STATUS_2`、`－` → `STATUS_3`）の対応が一致することを 5 日分ほど確認する。

- [ ] **Step 4: 既存の北区スクレイパーが壊れていないことを確認する**

Run: `cd packages/scraper && TZ=Asia/Tokyo npx playwright test "tokyo-kita/" --workers=2`
Expected: PASS（13 テスト。エンジン共有はしていないが、Task 2 の共通コード変更の影響が無いことを確かめる）

- [ ] **Step 5: 全体の回帰を確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper && npm run typecheck:all && npm run lint:all && npm run format:check:all`
Expected: 全て PASS

- [ ] **Step 6: 検証結果に応じてコミット**

修正が不要ならコミット不要。`test-results/` は成果物なのでコミットしない（`.gitignore` を確認する）。

---

### Task 9: ドキュメントを更新する

**Files:**
- Modify: `packages/scraper/CLAUDE.md`
- Modify: `packages/shared/CLAUDE.md`

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: `packages/scraper/CLAUDE.md` を更新する**

`## ScraperDefinition Pattern` の冒頭「1 自治体 = 1 ディレクトリ」の記述を次に置き換える。

```markdown
1 予約システム = 1 ディレクトリ。既定は `<prefecture>-<slug>/`（自治体と 1:1）。
同一自治体に 2 つ目の予約システムがある場合は `<prefecture>-<slug>-<name>/` を作り、
shared `registry.ts` の `additionalScrapers` に `<name>` を書く（例: `tokyo-kita-genkiplaza`）。
DB 上の municipality は親自治体のままで、viewer には同じ区の施設として並ぶ。
```

`## Vendor Engines` のエンジン一覧に 1 行足す。

```markdown
- `engines/genkiplaza.ts` — 元気ぷらざ独自 CGI: tokyo-kita-genkiplaza（月別テーブルを span ヶ月ぶん 1 ページで返す）
```

`## Playwright Config` に 1 行足す。

```markdown
- **罠**: 位置引数（`npx playwright test <target>`）はファイルパスへの正規表現。`tokyo-kita` は `tokyo-kita-genkiplaza/` にも一致するため、CI とシャード計算は末尾 `/` を付けて渡す。
```

- [ ] **Step 2: `packages/shared/CLAUDE.md` を更新する**

`registry.ts` の説明のオプション列挙に `additionalScrapers` を足す。

```markdown
- `registry.ts` — `MUNICIPALITIES`（自治体設定の source of truth）。各エントリ: `key` / `slug` / `prefecture` / `label` / `reservationExcluded` + `reservationStatus` / `reservationDivision` / `feeDivision` マッピング。オプション: `scraperCiExcluded`（scraper の定期 CI から除外）、`maintenanceWindowJst`、`additionalScrapers`（同一自治体の 2 つ目以降の予約システム。`getScraperTargets()` / `getMunicipalityByScraperTarget()` で解決する）。
```

- [ ] **Step 3: コミット**

```bash
git add packages/scraper/CLAUDE.md packages/shared/CLAUDE.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "docs: 予約システム単位のスクレイパーを CLAUDE.md に記録する"
```

---

## マージ後の手動作業

実装とは別に、マージ後に人が実行する必要がある。

1. 施設マスタを D1 に反映する — `npm run update:institutions -w @shisetsu-viewer/scraper`。これを忘れると `building_system_name` が空のままで、予約データが施設に突合されず `unmatched facility keys` の警告だけが出る
2. 初回の定期実行後、viewer で「北区 → 北区立元気ぷらざ 第1ホール」に空き状況が出ることを確認する
3. api / mcp-server はスキーマ変更が無いため再デプロイ不要
