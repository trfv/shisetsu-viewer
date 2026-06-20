# 自己修復キャプチャの全自治体展開 — 設計ドキュメント

- 日付: 2026-06-17
- ステータス: 設計承認済み（実装計画待ち）
- 対象パッケージ: `packages/scraper`
- 前提: PR #1545（[2026-06-13 自己修復設計](./2026-06-13-self-healing-scraper-design.md)）で
  `tokyo-kita` をパイロットとして導入済み

## 背景と目的

自己修復機構（失敗キャプチャ → 構造系失敗の集約 → `/repair-scraper` による AI 修復）は
PR #1545 で `tokyo-kita` だけにパイロット導入された。元の設計では「全10自治体への一斉対応」は
Phase 1 の YAGNI として明示的にスコープ外とされ、「パイロットを枯らしてから横展開」と
記されていた（`2026-06-13-self-healing-scraper-design.md` のスコープ外節）。

本ドキュメントはその**横展開フェーズ**を扱う。kita 以外の全10自治体
（`tokyo-arakawa`, `tokyo-bunkyo`, `tokyo-chuo`, `tokyo-edogawa`, `tokyo-koutou`,
`tokyo-meguro`, `tokyo-ota`, `tokyo-sumida`, `tokyo-toshima`, `kanagawa-kawasaki`）の
スクレイパーテストに失敗キャプチャを配線する。

### ゴール

1. kita 以外の全自治体でも、テスト失敗時に `test-results/<muni>/_failures/<slug>.json`
   （DOM/screenshot 付き、分類済み）が保存され、retry を生き延びた構造系失敗が
   tracker Issue に上がるようにする。
2. kita の約40行のインライン try/catch/finally を10ファイルにコピペせず、**共有ハーネスに
   一元化**して重複と将来の保守コストを断つ。
3. CI（決定論レーン）の挙動は一切変えない。

## 事実確認（現状把握）

- **CI レーンは既に完全に自治体非依存**：
  - `.github/actions/scrape/action.yml` は `test-results/*/_failures/`（全自治体グロブ）を
    `failures-<phase>-<shard>` としてアップロードする。
  - `.github/workflows/scraper.yml` の `collect_failures` は全アーティファクトを走査し、
    `structural` / `unknown` を tracker Issue `[scraper-repair] 構造変化の疑い` に upsert する。
  - `/repair-scraper <municipality>` スキルは自治体を引数で取る。
  - **したがって横展開に CI 変更は不要。** 残る作業は各 `index.test.ts` への配線のみ。
- 失敗キャプチャの配線が入っているのは現状 `tokyo-kita/index.test.ts` のみ。他10ファイルは未配線。
- 各自治体のテスト構造は大きく異なる（下表）。単純コピペでは吸収できない。

### 自治体ごとのシグネチャ差（配線対象）

| 自治体 | `prepare` 引数 | `extract` 引数 | `transform` 引数 | persist の形 | room 単位? |
|---|---|---|---|---|---|
| tokyo-arakawa | `(page, name)` | `(sp, count)` | `(eo)` | 単一 write | 施設 |
| tokyo-bunkyo | `(page, name)` | `(sp, dateStr, count)` | `(eo)` | 単一 write | 施設 |
| tokyo-chuo | `(page, links[])` | `(sp, count)` | `(roomName, eo)` | 単一 write | room |
| tokyo-edogawa | `(page, name, category)` | `(sp, count)` | `(eo)` | room ごとに複数 write | 施設→room ループ |
| tokyo-koutou | `(page, name, date, index)` | `(sp, count)` | `(eo)` | 単一 write（月別） | 施設×日付レンジ |
| tokyo-meguro | `(page, name)` | `(sp, dateStr, count)` | `(eo)` | 単一 write | 施設 |
| tokyo-ota | `(page, category, building, room)` | `(sp, count)` | `(roomName, eo)` | 単一 write | room |
| tokyo-sumida | `(page, name)` | `(sp, dateStr, count)` | `(eo)` | 単一 write | 施設 |
| tokyo-toshima | `(page, name)` | `(sp, dateStr, count)` | `(eo)` | 単一 write | 施設 |
| kanagawa-kawasaki | `(page, name, date)` | `(sp, count, name, rooms)` | `(eo, name)` | 単一 write | 施設 |
| tokyo-kita（既存） | `(page, links[])` | `(sp, count)` | `(roomName, eo)` | 単一 write | room |

## 全体アーキテクチャ

CI レーンは不変。各テストの「prepare → extract → transform → validate → persist」という
共通骨格を `common/runScrapeTest.ts` に抽出し、自治体固有の差分だけをクロージャで渡す。
kita を含む全11ファイルが同じハーネスを呼ぶ薄い形になる。

```
各 index.test.ts（薄い）
  └─ runScrapeTest({ muni, facility, context, sourceRef, page,
                     prepare, extract, transform, persist })   ← 自治体固有はクロージャ
         └─ 共通骨格（common/runScrapeTest.ts）
              step 追跡 / 空チェック / validate / 成功時 clearFailure / 失敗時 captureFailure
              / finally で close
```

## コンポーネント詳細

### ① 共有ハーネス `common/runScrapeTest.ts`（新規）

```ts
import type { Page } from "@playwright/test";
import type { TransformOutput } from "./types.ts";
import type { FailedStep } from "./failureTypes.ts";
import { validateTransformOutput } from "./validation.ts";
import { captureFailure, clearFailure } from "./captureFailure.ts";

export interface RunScrapeTestOptions<E extends { length: number }> {
  /** 自治体スラッグ（例 "tokyo-arakawa"） */
  municipality: string;
  /** 施設名（FailureRecord.facility / clearFailure のキー） */
  facility: string;
  /**
   * 失敗時に修復エージェントが読むコンテキスト。`roomName` キーが文字列なら
   * 失敗レコードの slug 生成に使われる（captureFailure 側の仕様）。
   */
  context: Record<string, unknown>;
  /** 壊れた可能性が高いソースファイル（例 "tokyo-arakawa/index.ts"） */
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

設計上のポイント：

- **プレーン `throw`（Playwright `expect` を値として import しない）**：これにより
  `common/*.test.ts` と同様 `node --test` で単体テスト可能になる。分類結果は現状と等価
  （空抽出は step="extract" でパターン非該当 → `unknown`、検証失敗は validationErrors 非空 →
  `structural`、transform 失敗は step="transform" → `structural`）。
- **close エラーの握り潰し**：`finally` の close 例外を `.catch(() => {})` で握り潰し、元の
  スクレイパー例外をマスクしない。kita 現状（無 catch）の微改善。`searchPage === page` の
  ケース（edogawa など prepare が同一 page を返す場合）は二重 close を避けるためガードする。
- **`baseDir` パススルー**：capture/clear のテスト用シームをそのまま透過し、単体テストで
  temp ディレクトリを使えるようにする。

### ② 各 `index.test.ts` の配線（全11ファイル）

各ファイルのループ本体を `runScrapeTest({...})` 呼び出しに置換する。例（kita）：

```ts
scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
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

- `import { test } from "@playwright/test"`（`expect` は不要になるため削除）。
- `validateTransformOutput` の直接 import を削除（ハーネスが担当）。
- `writeTestResult` は persist クロージャ内で継続使用。
- 既存の `try { prepare } catch { console.error } ` ブロックは廃止（step 追跡で prepare 失敗を捕捉）。

各自治体の `context` 方針：

| 自治体 | context | persist クロージャ |
|---|---|---|
| arakawa | `{}` | `writeTestResult(muni, name, name, to)` |
| bunkyo | `{}` | 同上 |
| chuo | `{ roomName, links }` | `writeTestResult(muni, \`${facility}-${room}\`, facility, to)` |
| edogawa | `{ category }` | room ごとに `writeTestResult` ループ（既存ロジック維持） |
| koutou | `{ dateRangeStart }`（情報用） | `writeTestResult(muni, \`${name}_${yyyyMM}\`, name, to)` |
| meguro | `{}` | `writeTestResult(muni, name, name, to)` |
| ota | `{ roomName, category, buildingName }` | `writeTestResult(muni, \`${facility}-${room}\`, facility, to)` |
| sumida | `{}` | `writeTestResult(muni, name, name, to)` |
| toshima | `{}` | `writeTestResult(muni, name, name, to)` |
| kawasaki | `{ roomNames }`（情報用） | `writeTestResult(muni, name, name, to)` |
| kita | `{ roomName, links }` | `writeTestResult(muni, \`${facility}-${room}\`, facility, to)` |

注意点：

- **koutou の失敗レコードは施設単位に集約される**。1施設につき5日付レンジのテストがあり、
  `captureFailure` の slug は `facility`（+`roomName`）からのみ生成されるため、複数レンジが
  失敗すると同一 slug で上書きされ最後の1件が残る。修復はセレクタ単位で施設まるごと直すため
  これは許容（YAGNI：slug にレンジを混ぜる契約変更はしない）。
- edogawa は prepare が root page を返す可能性があるため、ハーネスの close ガード
  （`searchPage !== page`）で二重 close を回避する。

### ③ 単体テスト `common/runScrapeTest.test.ts`（新規）

`node --test` で実行（既存 `captureFailure.test.ts` / `classifyFailure.test.ts` と同方式）。
fake page（`content`/`screenshot`/`close` を持つスタブ）と注入クロージャ、temp `baseDir` を使い：

1. 成功パス：`persist` が呼ばれ、既存の失敗レコードが `clearFailure` で除去されること。
2. prepare 失敗：step="prepare" で `_failures/<slug>.json` が書かれ、例外が再 throw されること。
3. extract 空：step="extract"、classification が `unknown`、レコードが書かれること。
4. validate 失敗（validationErrors 非空）：step="validate"、classification が `structural`、
   record.validationErrors が埋まること。
5. close：`finally` で searchPage / page が close されること（`searchPage === page` で二重 close
   しないこと）。

## データフロー（変更なし、対象が広がるだけ）

```
定期実行(cron) → scrape 失敗 → retry_scrape 失敗
  → 各テストが runScrapeTest 経由で _failures/<slug>.json + DOM/screenshot を保存（分類済み）
  → collect_failures: structural/unknown を集約 → tracker Issue upsert
  → 人間が Issue に気づく → 手元で `/repair-scraper <muni>` 起動 → 検証ループ → PR
```

横展開後は kita 以外の自治体でも同じフローが回る。

## エラーハンドリングと安全性

- **capture は決して元の失敗をマスクしない**：`captureFailure` 内は全 IO がベストエフォート
  （既存実装）。ハーネスは capture 後に必ず元例外を再 throw する。
- **close 例外のマスク防止**：`finally` の close を `.catch(() => {})` で握り潰す。
- **決定論レーンの不可侵**：CI・スキーマ・共有 enum には触れない。変更は各 `index.test.ts` の
  配線と `common/` への純粋追加（ハーネス + その単体テスト）のみ。
- **分類の挙動は不変**：プレーン throw でも step 名と validationErrors を正しく渡すため、
  `classifyFailure` の判定は現状と等価。

## テスト戦略

- `common/runScrapeTest.test.ts`（`node --test`）でハーネスの配線ロジックを単体検証。
- `npm run typecheck -w @shisetsu-viewer/scraper` / `npm run lint:all` /
  `npm run format:check:all` / `npm run knip` を通す。
- ライブ検証は既存スクレイパーテスト（実サイト）が統合保証。受け入れ基準（セレクタ破壊 →
  `/repair-scraper` で自己修復）は kita で検証済みのため、横展開ではクロージャが元の呼び出しと
  一致していることをレビューで担保する。

## スコープ外（YAGNI）

- Phase 2 の CI 自律修復ワークフロー（`claude -p`）。設計上の余地のみ。
- `captureFailure` の slug 生成契約の変更（koutou の日付レンジ別レコード化など）。
- スクレイパーのセレクタ抽象化・汎用 DSL 化。
- CI（`scraper.yml` / `actions/scrape`）の変更（既に自治体非依存のため不要）。
