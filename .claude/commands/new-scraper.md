---
description: 新しい自治体の予約システム用スクレイパーを作成する。URLを引数に渡す。例：/new-scraper https://example-yoyaku.jp/ tokyo-example
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, EnterPlanMode, ExitPlanMode, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot
argument-hint: <予約システムURL> <prefecture-slug>
---

# 新規スクレイパー作成ワークフロー

あなたは施設予約システムのスクレイパー実装の専門家です。
与えられた予約システム URL に対して、Playwright MCP を使ってサイトを探索し、スクレイパーコードを生成・検証します。

**重要**: スクレイピングの対象は音楽練習が可能なものを優先します。利用目的などから絞り込んだ上でスクレイピングしてください。

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

- `defineScraper(definition)` — `../common/defineScraper.ts` — スクレイパー定義（必須。全自治体この形式）
- `collectPaginated(opts)` — `../common/paginate.ts` — 「抽出 → 次ページ」の標準ページ送りループ
- `rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP)` — `../common/reservation.ts` — transform の最終工程（`as` キャスト禁止。未マッピング値は INVALID フォールバック + 警告）
- `getCellValue(cell)` — `../common/playwrightUtils.ts` — テーブルセルからテキスト or img src を取得
- `selectAllOptions(selectLocator)` — `../common/playwrightUtils.ts` — セレクトボックスの全選択
- `toISODateString(dateString)` — `../common/dateUtils.ts` — 和暦・西暦日付を ISO 変換
- `stripTrailingEmptyValue(arr)` — `../common/arrayUtils.ts` — 配列末尾の空文字除去

スクレイプ期間は `horizon: { startOffsetDays, monthsAhead, unit }` で宣言する（`../common/horizon.ts`）。日付計算コードを自前で書かないこと。

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

#### WebReaf Grand 系の場合

施設別空き状況ページに「その他の条件で絞り込む」ボタンがある場合、WebReaf Grand 系。このシステムでは:

- 「表示時間帯」フィルター（午前/午後/夜間/全日）で時間帯別にフィルターが可能
- 2週間カレンダー表示で、prev/next リンクでページング
- 日ごとのクリック不要で効率的にスクレイプ可能
- `tokyo-toshima` / `tokyo-meguro` を参照実装として使用

### 1.4 ユーザーへの確認

探索結果を提示し、以下を AskUserQuestion で確認:

- スクレイプ対象の施設・部屋（全部屋か、音楽系のみか）
- 既存の institution データ (`data/institutions/<slug>.json`) がある場合、対象部屋との整合性
- 既存の institution データがない場合、施設・部屋の名称をどの程度正確にスクレイプする必要があるか

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

### 2.1 エンジン / テンプレート選択

まず既知の予約システム製品かを判定する。**既知製品ならエンジンを使い、index.ts は設定（URL・マップ・targets）だけになる**:

- **OpenReaf 系**（URL が `*.openreaf02.jp`、リンクチェーン + カレンダー + day-next 方式） → `engines/openreaf.ts` の `openreafHooks()` を使用。参照実装: `tokyo-kita`, `tokyo-chuo`
- **WebR Grand 系**（施設別空き状況ページに「その他の条件で絞り込む」+ 2週間カレンダー） → `engines/webrGrand.ts` の `webrGrandHooks()` を使用。参照実装: `tokyo-meguro`, `tokyo-toshima`

同一製品の自治体が既に2つ以上あるのに対応エンジンが無い場合は、新しいエンジンを `engines/` に切り出すことを検討する。

未知のシステムの場合、構造が最も近い既存スクレイパーを参照実装として Read する:

- **ドロップダウン + フォーム送信 + 「次へ」方式** → `tokyo-arakawa`
- **ポップアップ + 翌日リンク方式** → `tokyo-koutou`
- **週表示 + 次の週ボタン方式** → `kanagawa-kawasaki`
- **タブ + 利用目的検索方式（/user/Home 系 SPA）** → `tokyo-sumida` / `tokyo-edogawa` / `tokyo-bunkyo`

### 2.2 index.ts 生成

`packages/scraper/<prefecture>-<slug>/index.ts` を生成。全自治体が `defineScraper()` で単一の `scraper` オブジェクトを export する。

エンジン使用時:

```typescript
import { defineScraper } from "../common/defineScraper.ts";
import type { Division, Status } from "../common/types.ts";
import { openreafHooks, type OpenreafTarget } from "../engines/openreaf.ts";

const DIVISION_MAP: Record<string, Division> = { "": "RESERVATION_DIVISION_INVALID" /* ... */ };
const STATUS_MAP: Record<string, Status> = { "": "RESERVATION_STATUS_INVALID" /* ... */ };

const targets: OpenreafTarget[] = [
  /* フェーズ1で収集した対象 */
];

export const scraper = defineScraper({
  municipality: "<prefecture>-<slug>",
  targets,
  horizon: { startOffsetDays: 1, monthsAhead: 5, unit: "day" }, // サイトの公開期間に合わせる
  facility: (t) => t.facilityName,
  title: (t) => `${t.facilityName} ${t.roomName}`,
  context: (t) => ({ roomName: t.roomName, links: t.links }),
  outputs: (data, t) => [
    { fileName: `${t.facilityName}-${t.roomName}`, facilityName: t.facilityName, data },
  ],
  ...openreafHooks({ baseUrl: "<url>", divisionMap: DIVISION_MAP, statusMap: STATUS_MAP }),
});
```

自前実装時は `prepare` / `extract` / `transform` を definition に直接書く:

- `extract` は `collectPaginated({ maxPages: pageCount, extractPage, goNext })` でページ送り
- `transform` は生データを `RawSlot[]`（roomName / date(ISO) / division(生テキスト) / status(生テキスト)）に平坦化して `rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP)` を返す

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

`packages/scraper/<prefecture>-<slug>/index.test.ts` を生成。**全自治体共通の固定ボイラープレート**であり、自治体固有のロジックを書いてはならない:

```typescript
import { test } from "@playwright/test";
import { runScrapeTarget, scrapeTestTitle } from "../common/scrapeTest.ts";
import { scraper } from "./index.ts";

for (const target of scraper.targets) {
  test(scrapeTestTitle(scraper, target), async ({ page }) => {
    await runScrapeTarget(scraper, target, page);
  });
}
```

### 2.5 （既存の institution データがない場合） institution データの作成

`data/institutions/<slug>.json` を作成。同じディレクトリの既存ファイルを参考に、施設・部屋の情報をjson形式で記述する。

```json
{
  "key": "MUNICIPALITY_<UPPERCASE_SLUG>",
  "slug": "<slug>",
  "prefecture": "<tokyo|kanagawa|...>",
  "label": "<日本語表示名>",
  "facilities": [
    {
      "facilityName": "<施設名>",
      "rooms": [
        {
          "roomName": "<部屋名>"
        }
        // ...
      ]
    }
    // ...
  ]
}
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
- 本コマンドの改善案の提案
