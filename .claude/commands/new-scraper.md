---
description: 新しい自治体の予約システム用スクレイパーを作成する。URLを引数に渡す。例：/new-scraper https://example-yoyaku.jp/ tokyo-example
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, EnterPlanMode, ExitPlanMode, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot
argument-hint: <予約システムURL> <prefecture-slug>
---

# 新規スクレイパー作成ワークフロー

あなたは施設予約システムのスクレイパー実装の専門家です。
与えられた予約システム URL に対して、Playwright MCP を使ってサイトを探索し、スクレイパーコードを生成・検証します。

## 引数の解析

ユーザー入力: $ARGUMENTS

- 第1引数: 予約システムの URL（必須）
- 第2引数: `<prefecture>-<slug>` 形式のディレクトリ名（必須。例: `tokyo-example`）

引数が不足している場合は AskUserQuestion で確認してください。

## スクレイパーパッケージの規約

!cat packages/scraper/CLAUDE.md

## 既存スクレイパー一覧（参考実装）

!ls packages/scraper/\*/index.ts

## 共通ユーティリティ（再利用必須）

以下のユーティリティは新規コードを書かず、既存のものをインポートして使うこと:

- `getCellValue(cell)` — `../common/playwrightUtils` — テーブルセルからテキスト or img src を取得
- `selectAllOptions(selectLocator)` — `../common/playwrightUtils` — セレクトボックスの全選択
- `toISODateString(dateString)` — `../common/dateUtils` — 和暦・西暦日付を ISO 変換
- `stripTrailingEmptyValue(arr)` — `../common/arrayUtils` — 配列末尾の空文字除去
- `validateTransformOutput(output)` — `../common/validation` — 出力データ品質チェック
- `writeTestResult(outputDir, fileName, facilityName, data)` — `../common/testUtils` — テスト結果 JSON 出力

---

## フェーズ 1: サイト探索

**Playwright MCP** (`browser_navigate`, `browser_click`, `browser_run_code`, `browser_snapshot`) を使って対象サイトを探索します。

### 1.1 トップページ確認

- `browser_navigate` で URL にアクセス
- snapshot でページ構造を確認
- 「空き状況の確認」「空き状況」「施設予約」等のリンクを探す

### 1.2 施設階層の探索

トップから空き状況テーブルまでのナビゲーションパスを記録する。
典型的な階層: 施設分類 → 施設 → 部屋 → カレンダー → 日次テーブル

`browser_run_code` を活用して効率的に一括取得:

- 施設分類の一覧
- 各施設の部屋一覧（`次の一覧` リンクがある場合は全ページ取得）

### 1.3 空き状況テーブルの解析

1つの部屋の空き状況テーブルを開き、以下を記録:

1. **テーブル構造**: XPath やセレクター、行の構造（ヘッダー行とデータ行の配置）
2. **時間区分**: ヘッダー行に表示されるテキスト（例: `"9:00-12:00"`, `"午前"`, `"①"`）
3. **ステータス記号**: データ行に表示されるテキストや画像（例: `"○"`, `"×"`, img src）
4. **日付フォーマット**: テーブルに付随する日付の表示形式（例: `"令和 8年 3月 5日 (木)"`）
5. **ページネーション**: 次の日/週/月に遷移するリンクやボタンのセレクター
6. **テーブルの行数**: 時間区分が多い場合、テーブルが複数行に折り返されるか確認

異なるタイプの部屋（例: ホール系 vs 音楽スタジオ系）で時間区分が異なる場合、複数の部屋を確認する。

### 1.4 ユーザーへの確認

探索結果を提示し、以下を AskUserQuestion で確認:

- スクレイプ対象の施設・部屋（全部屋か、音楽系のみか）
- 既存の institution データ (`data/institutions/<slug>.json`) がある場合、対象部屋との整合性

### 1.5 探索結果のまとめ

以下の情報を整理して記録:

```
URL: <base-url>
ディレクトリ: packages/scraper/<prefecture>-<slug>/

ナビゲーション:
  トップ → [リンクチェーン] → カレンダー → テーブル

テーブル構造:
  日付セレクター: <XPath or CSS>
  データテーブルセレクター: <XPath or CSS>
  行構成: <ヘッダーN行 + データN行のパターン>
  ページネーション: <セレクター or リンクテキスト>

DIVISION_MAP:
  "<raw-text>" → RESERVATION_DIVISION_*

STATUS_MAP:
  "<raw-text>" → RESERVATION_STATUS_*

スクレイプ対象:
  - facilityName: <施設名>, roomName: <部屋名>, links: [<リンクチェーン>]
  - ...
```

---

## フェーズ 2: コード生成

### 2.1 テンプレート選択

既存スクレイパーの中から、最も構造が近いものを参照実装として選択する:

- **リンクチェーン + カレンダー + day-next 方式** → `tokyo-chuo` or `tokyo-kita` を参照
- **ドロップダウン + フォーム送信 + 「次へ」方式** → `tokyo-arakawa` を参照
- **ポップアップ + 翌日リンク方式** → `tokyo-koutou` を参照
- **週表示 + 次の週ボタン方式** → `kanagawa-kawasaki` を参照
- **タブ + 利用目的検索方式** → `tokyo-sumida` を参照

選択したテンプレートを Read で読み込む。

### 2.2 index.ts 生成

`packages/scraper/<prefecture>-<slug>/index.ts` を生成:

```typescript
import type { Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";
import { toISODateString } from "../common/dateUtils";
import { stripTrailingEmptyValue } from "../common/arrayUtils";
import { getCellValue } from "../common/playwrightUtils";
// selectAllOptions は必要な場合のみインポート

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  // フェーズ1で収集した時間区分を記述
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  // フェーズ1で収集したステータス記号を記述
};

type ExtractOutput = { date: string; header: string[]; rows: string[][] }[];

export async function prepare(page: Page, ...): Promise<Page> { ... }
async function _extract(page: Page): Promise<ExtractOutput> { ... }
export async function extract(page: Page, maxCount: number): Promise<ExtractOutput> { ... }
export async function transform(...): Promise<TransformOutput> { ... }
```

#### DIVISION マッピングルール:

- 午前系 (9:00-12:00 前後) → `RESERVATION_DIVISION_MORNING`
- 午後系 (13:00-17:00 前後) → `RESERVATION_DIVISION_AFTERNOON`
- 夜間系 (17:00-22:00 前後) → `RESERVATION_DIVISION_EVENING`
- それ以外 → `RESERVATION_DIVISION_DIVISION_1` 〜 `_12` を順に割り当て

#### STATUS マッピングルール:

- 空き/○/empty 系 → `RESERVATION_STATUS_VACANT`
- その他 → `RESERVATION_STATUS_STATUS_1` 〜 `_12` を順に割り当て
- 空文字 → `RESERVATION_STATUS_INVALID`

### 2.3 registry.ts への自治体追加

`packages/shared/registry.ts` の `MUNICIPALITIES` オブジェクトに新しいエントリを追加する。

既存エントリの構造を Read で確認した上で、以下の形式で追加:

```typescript
MUNICIPALITY_<UPPERCASE_SLUG>: {
  key: "MUNICIPALITY_<UPPERCASE_SLUG>",
  slug: "<slug>",
  prefecture: "<tokyo|kanagawa|...>",
  label: "<日本語表示名>",
  reservationExcluded: false,
  reservationStatus: {
    // STATUS_MAP の逆引き: enum値 → 日本語表示名
    // スクレイパーの STATUS_MAP が "○" → RESERVATION_STATUS_VACANT なら:
    [ReservationStatus.VACANT]: "空き",
    // STATUS_1 〜 STATUS_N: サイトで使われるステータスの日本語表示名
    [ReservationStatus.STATUS_1]: "<表示名>",
    // ...
  },
  reservationDivision: {
    // DIVISION_MAP の逆引き: enum値 → 日本語表示名
    [ReservationDivision.MORNING]: "午前",
    [ReservationDivision.AFTERNOON]: "午後",
    [ReservationDivision.EVENING]: "夜間",
    // DIVISION_1 〜 DIVISION_N がある場合:
    [ReservationDivision.DIVISION_1]: "<表示名>",
    // ...
  },
  feeDivision: {
    // 料金区分（reservationDivision と同じ場合が多い）
    [FeeDivision.MORNING]: "午前",
    [FeeDivision.AFTERNOON]: "午後",
    [FeeDivision.EVENING]: "夜間",
    // ...
  },
},
```

**重要ポイント:**

- `reservationStatus` の値は viewer で表示されるラベル。スクレイパーの STATUS_MAP のキー（生テキスト）ではなく、人間が読める日本語名にする
- `reservationDivision` も同様。`"9:00-12:00"` のような生テキストではなく `"午前"` のような表示名
- 既存の同じ予約システム（OpenReaf 等）を使う自治体のエントリを参考にする
- `reservationExcluded: false` にすることで、viewer のフィルターに表示される

追加後、shared パッケージの型チェックも実行:

```bash
npm run typecheck -w @shisetsu-viewer/shared
```

### 2.4 index.test.ts 生成

`packages/scraper/<prefecture>-<slug>/index.test.ts` を生成:

```typescript
import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation.ts";
import { writeTestResult } from "../common/testUtils.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startData = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startData), 5); // サイトの予約可能期間に合わせて調整
  return differenceInDays(endDate, startData) + 1;
}

const scrapeTargets = [
  // フェーズ1で収集した対象部屋を記述
];

scrapeTargets.forEach((target) => {
  // 標準テストパターン: prepare → extract → transform → validate → writeTestResult
});
```

---

## フェーズ 3: 検証

### 3.1 型チェック

```bash
npm run typecheck -w @shisetsu-viewer/scraper
```

### 3.2 lint/format チェック

```bash
npx prettier --check packages/scraper/<slug>/index.ts packages/scraper/<slug>/index.test.ts
npx eslint packages/scraper/<slug>/index.ts packages/scraper/<slug>/index.test.ts
```

### 3.3 単一部屋テスト

scrapeTargets の最初の1部屋のみでテスト実行:

```bash
npx playwright test <slug>/index.test.ts --grep "<最初の部屋名>"
```

### 3.4 出力確認

テスト結果 JSON を Read で確認:

- `room_name` が正しいか
- `date` が ISO 形式 (YYYY-MM-DD) か
- `reservation` に `INVALID` が含まれていないか（含まれていれば DIVISION_MAP/STATUS_MAP にマッピング漏れ）
- `reservation` が空 `{}` になっていないか（ステータスのテキストが想定と異なり、マッピングできていない可能性）

### 3.5 問題修正

INVALID や `{}` が見つかった場合:

1. どの生テキストがマッピングされていないか特定
2. DIVISION_MAP または STATUS_MAP に追加
3. 再テスト

テーブル構造が想定と異なる場合:

1. `_extract()` の行解析ロジックを修正
2. 再テスト

---

## 完了報告

実装完了後、以下を報告:

- 生成・変更したファイル一覧
  - `packages/scraper/<prefecture>-<slug>/index.ts` — スクレイパー本体
  - `packages/scraper/<prefecture>-<slug>/index.test.ts` — テスト
  - `packages/shared/registry.ts` — 自治体レジストリ追加
- スクレイプ対象の施設・部屋数
- テスト結果サマリー
- 注意事項（institution データ `data/institutions/<slug>.json` の作成・更新が必要か等）
