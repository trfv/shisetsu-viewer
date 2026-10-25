---
description: 新しい自治体の予約システム用スクレイパーを作成する。URLを引数に渡す。例：/new-scraper https://example-yoyaku.jp/ tokyo-example
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, EnterPlanMode, ExitPlanMode, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__playwright__browser_navigate, mcp__playwright__browser_click, mcp__playwright__browser_run_code_unsafe, mcp__playwright__browser_evaluate, mcp__playwright__browser_snapshot, mcp__playwright__browser_select_option, mcp__playwright__browser_network_requests, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_close
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

!`git show HEAD:packages/scraper/CLAUDE.md`

## 既存スクレイパー一覧（参考実装）

!`git ls-files --full-name ':(top,glob)packages/scraper/*/index.ts'`

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

**Playwright MCP** (`browser_navigate`, `browser_click`, `browser_run_code`（環境によって `browser_run_code_unsafe`）, `browser_snapshot`) を使って対象サイトを探索します。

`browser_snapshot` に `filename` を渡すとリポジトリ直下に書き出されるので、渡さないか scratchpad の絶対パスにする。

### 1.1 トップページ確認

- `browser_navigate` で URL にアクセス
- snapshot でページ構造を確認
- 「空き状況の確認」「空き状況」「施設予約」等のリンクを探す

### 1.2 施設階層の探索

**既知エンジン（`packages/scraper/engines/`。OpenReaf / WebR Grand / e-PRS など）の製品なら、まず discovery で一覧を自動列挙する**:

```bash
npm run discover -w @shisetsu-viewer/scraper -- --engine openreaf --url <baseUrl> --name <prefecture>-<slug>
```

`data/targets/<prefecture>-<slug>.candidates.json` に全施設・全部屋の候補（`musicLikely` フラグ付き）が書き出されるので、手作業での一覧転記は不要。musicLikely を目印に音楽練習可能な対象をキュレーションし、各候補の `target` フィールドをそのまま targets に貼る。candidates.json は作業用でコミットしない（scratchpad に退避する）。

未知のシステムの場合はトップから空き状況テーブルまでのナビゲーションパスを記録する。
典型的な階層: 施設分類 → 施設 → 部屋 → カレンダー → 日次テーブル

`browser_run_code` を活用して効率的に一括取得:

- 施設分類の一覧
- 各施設の部屋一覧（`次の一覧` リンクがある場合は全ページ取得）

サイトに「利用目的」での検索があれば、音楽系の目的（楽器練習・楽器演奏・合唱・演奏会など）× 地区で検索して候補を列挙するのが早い。ただし **検索結果が「期間内に空きのある部屋」に絞られていないか** を確かめる（「該当する空き施設が見つかりませんでした」が出るなら絞られている）。絞られているなら、検索結果をスクレイプの入口にすると満室の週に部屋が消える。

検索結果の画面からブラウザの「戻る」で検索フォームに戻ると、フォーム再送信のキャッシュ切れエラーになるサイトがある（p-kashikan 系など）。目的や館を変えるたびにトップから検索をやり直すか、`browser_run_code` でフォームの値を設定して直接 submit する。

### 1.3 空き状況テーブルの解析

1つの部屋の空き状況テーブルを開き、以下を記録:

1. **テーブル構造**: XPath やセレクター、行の構造（ヘッダー行とデータ行の配置）
2. **時間区分**: ヘッダー行に表示されるテキスト（例: `"9:00-12:00"`, `"午前"`, `"①"`）
3. **ステータス記号**: データ行に表示されるテキストや画像（例: `"○"`, `"×"`, img src）
4. **日付フォーマット**: テーブルに付随する日付の表示形式（例: `"令和 8年 3月 5日 (木)"`）
5. **ページネーション**: 次の日/週/月に遷移するリンクやボタンのセレクター
6. **テーブルの行数**: 時間区分が多い場合、テーブルが複数行に折り返されるか確認

異なるタイプの部屋（例: ホール系 vs 音楽スタジオ系）で時間区分が異なる場合、複数の部屋を確認する。

あわせて以下も確かめる:

- **画面の裏の通信**: `browser_network_requests` やページの JS（`String(window.<関数名>)`）を見て、週送り・部屋切り替えが Ajax で JSON を返しているか確かめる。部屋コードと日付を指定して JSON を直接取れるなら、DOM を辿るより速く壊れにくい（例: `engines/eprs.ts`）。その場合は、セッション初期化に何が要るか（トップを開くだけか、検索を 1 回通すか）、cookie なしの新しいコンテキストで失敗するかを確かめる。応答の文字コード（Shift_JIS 等）にも注意する
- **受付期間**: 部屋の種類ごとに、何ヶ月先まで受付中か（「受付期間外」になる日）を確かめる。毎週送らず月 1 点ずつ見ると速い。部屋ごとに期間が大きく違う場合は、horizon を最長に合わせて「全セルが受付期間外の週」で打ち切るか、`horizon` を target ごとの関数にする

#### WebReaf Grand 系の場合

施設別空き状況ページに「その他の条件で絞り込む」ボタンがある場合、WebReaf Grand 系。このシステムでは:

- 「表示時間帯」フィルター（午前/午後/夜間/全日）で時間帯別にフィルターが可能
- 2週間カレンダー表示で、prev/next リンクでページング
- 日ごとのクリック不要で効率的にスクレイプ可能
- `tokyo-toshima` / `tokyo-meguro` を参照実装として使用

### 1.4 ユーザーへの確認

探索結果を提示し、以下を AskUserQuestion で確認:

- スクレイプ対象の施設・部屋（全部屋か、音楽系のみか）。discovery を実行した場合は candidates.json の musicLikely 一覧を提示して選んでもらう。選択肢に部屋数を書くときは、説明に並べた部屋を数え直してから書く
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
- **e-PRS 系**（URL が `www.cm9.eprs.jp/<自治体>/web/`、いつ／どこで／何をする の空き状況検索 + 週表示） → `engines/eprs.ts` の `eprsHooks()` を使用。参照実装: `tokyo-shinagawa`
- その他のエンジン（`genkiplaza` / `pKashikan`）は `engines/` の各ファイルを参照

同一製品の自治体が既に2つ以上あるのに対応エンジンが無い場合は、新しいエンジンを `engines/` に切り出すことを検討する。採用が 1 自治体でも、パース処理を純粋関数として切り出してユニットテストしたい場合はエンジンにしてよい（ユニットテストは `engines/*.test.ts` と `common/*.test.ts` だけが `npm run test:unit` で走る）。

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

// export は必須（common/registryContract.test.ts が registry との整合を検証する）
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID" /* ... */,
};
export const STATUS_MAP: Record<string, Status> = { "": "RESERVATION_STATUS_INVALID" /* ... */ };

const targets: OpenreafTarget[] = [/* フェーズ1で収集した対象 */];

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
- 可能なら `discover` フック（施設階層をクロールして `DiscoveredTarget[]` を返す）も実装する。将来の対象一覧の棚卸し（`npm run discover -- <municipality>` で新設施設・閉館を差分検知）に使える
- JSON 応答の検証は `as` を使わず、`"key" in value` で絞り込む（tsconfig が `noPropertyAccessFromIndexSignature` なので `Record<string, unknown>` へのドットアクセスは型エラーになる）
- 関数名を `use` で始めない（`useDayToIso` のような名前は oxlint の react-hooks ルールが hook とみなして落ちる）

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
- `feeDivision` のキーは必ず `FeeDivision.*` を使う。`ReservationDivision.*` を流用すると施設 JSON の `FEE_DIVISION_*` 値と食い違い、viewer で料金ラベルが引けなくなる（杉並区で実際に起きた不具合）
- 追加後は `npm run test:unit -w @shisetsu-viewer/scraper` の registry ドリフト検査が、scraper.yml / database.yml の choice・README の対応地区・施設 JSON の追記漏れを指摘する。全て緑にすること
- 既存の同じ予約システム（OpenReaf 等）を使う自治体のエントリを参考にする
- `reservationExcluded` は「スクレイパー自体が存在しない」かどうか。`false` にしても **viewer には出ない**（viewer は手書きの一覧を持つ。2.6 参照）
- 定期実行での安定性が未確認なら `scraperCiExcluded: true` で CI から外す選択肢もある。その場合は予約データが入らないので、viewer では杉並区・目黒区と同じ「※現在、予約状況が表示できません」の注記を付ける

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

`data/institutions/<prefecture>-<slug>.json` を作成。**形式は `Institution` レコード（`packages/shared/types.ts`）のフラットな配列**で、1 部屋 = 1 レコードの DB 完成形（ネストした facilities/rooms 形式ではない）。最小の実例は `data/institutions/tokyo-chuo.json`、enum 値の判定基準は `tasks/institution-data-prompt.md` を参照。

```json
[
  {
    "id": "<uuidgen 等で採番した UUID>",
    "prefecture": "PREFECTURE_TOKYO",
    "municipality": "MUNICIPALITY_<UPPERCASE_SLUG>",
    "building": "<施設名>",
    "institution": "<部屋名>",
    "building_kana": "<シセツメイ（カタカナ）>",
    "institution_kana": "<ヘヤメイ（カタカナ）>",
    "building_system_name": "<予約システム上の施設名>",
    "institution_system_name": "<予約システム上の部屋名>",
    "capacity": null,
    "area": null,
    "institution_size": "INSTITUTION_SIZE_UNKNOWN",
    "fee_divisions": [],
    "weekday_usage_fee": [],
    "holiday_usage_fee": [],
    "address": "",
    "is_available_strings": "AVAILABILITY_DIVISION_UNKNOWN",
    "is_available_woodwind": "AVAILABILITY_DIVISION_UNKNOWN",
    "is_available_brass": "AVAILABILITY_DIVISION_UNKNOWN",
    "is_available_percussion": "AVAILABILITY_DIVISION_UNKNOWN",
    "is_equipped_music_stand": "EQUIPMENT_DIVISION_UNKNOWN",
    "is_equipped_piano": "EQUIPMENT_DIVISION_UNKNOWN",
    "website_url": "",
    "layout_image_url": "",
    "lottery_period": "",
    "note": ""
  }
]
```

`building_system_name` + `institution_system_name` はスクレイパー出力と施設レコードを突合するキーなので、予約システム上の表記と正確に一致させること。楽器利用可否はサイトに明示的な記載がある場合のみ設定する（推測禁止）。

雛形を作ったら、`tasks/institution-data-prompt.md` の手順で中身を埋める（UNKNOWN と空のままで済ませない）:

1. **予約システム自体の館情報を先に見る**。「館・施設一覧」等に住所・電話番号・館情報 PDF／公式ページへのリンクがあることが多い
2. 定員・面積・ピアノ・料金は、区の施設ページ・指定管理者のサイト・館情報 PDF にある。館をいくつかのグループに分けて調査エージェントを並列に立て、根拠 URL 付きの結果だけを返させる（ファイルは編集させない）
3. 楽器種別の可否は部屋単位で明記されていることがまず無い。「和太鼓不可」「ドラムセット常備」のような間接的な記述は UNKNOWN のまま `note` に文言を残すのが既定（迷ったらユーザーに確認）
4. 料金はテンプレートでは「埋めない」項目だが、根拠付きで取れたら入れるかユーザーに確認する。土日祝が別料金なら holiday に分け、同額なら平日と同じ値を入れる

### 2.6 viewer・ドキュメントへの追加

registry に足しただけでは viewer に出ない。以下を手で足す（registry ドリフト検査はここを見ないので、漏れても CI は緑のまま）:

- `packages/viewer/utils/municipality.ts` の `SupportedMunicipalities`（並びがフィルターの表示順）
- `packages/viewer/pages/Top.tsx` の「対応地区」（README の並びに合わせる）
- 自治体の件数を固定しているテスト: `utils/municipality.test.ts`・`pages/Top.test.tsx`・`utils/institution.test.ts`・`utils/reservation.test.ts`
- `packages/mcp-server/README.md` の対応エリア

確認:

```bash
npm run typecheck -w @shisetsu-viewer/viewer
npm run test:ci -w @shisetsu-viewer/viewer
```

---

## フェーズ 3: 検証

### 3.1 型チェック

```bash
npm run typecheck -w @shisetsu-viewer/scraper
```

### 3.2 lint/format チェック

リポジトリのルートで実行する（oxfmt は `..` を含むパスを受け付けない。施設 JSON はフォーマット対象外）:

```bash
npx oxfmt --check packages/scraper/<prefecture>-<slug>/ packages/scraper/engines/ packages/shared/registry.ts
npx oxlint packages/scraper/<prefecture>-<slug>/ packages/scraper/engines/
```

### 3.3 registry 整合検査とユニットテスト

```bash
npm run test:unit -w @shisetsu-viewer/scraper
```

- `registryContract.test.ts` — DIVISION_MAP / STATUS_MAP（要 `export`）の値域が registry と整合しているか
- `registryDrift.test.ts` — scraper.yml / database.yml の choice、README の対応地区、施設 JSON の存在。**失敗が新自治体の追記漏れ箇所を教えてくれる**
- `packages/shared/registry.test.ts` にも自治体の一覧が固定で書かれている（`npm test -w @shisetsu-viewer/shared`）
- エンジンを作った・直した場合は `engines/<engine>.test.ts` も通す

### 3.4 単一部屋テスト

scrapeTargets の最初の1部屋のみでテスト実行:

```bash
cd packages/scraper && npx playwright test <prefecture>-<slug>/ --grep "<最初の部屋名>"
```

### 3.5 出力確認

テスト結果 JSON を Read で確認:

- `room_name` が正しいか
- `date` が ISO 形式 (YYYY-MM-DD) か
- `reservation` に `INVALID` が含まれていないか（含まれていれば DIVISION_MAP/STATUS_MAP にマッピング漏れ）
- `reservation` が空 `{}` になっていないか（ステータスのテキストが想定と異なり、マッピングできていない可能性）

1 部屋で問題が無ければ全 target を流し（`npx playwright test <prefecture>-<slug>/`。末尾の `/` を付ける）、全ファイルを集計する。Playwright は実行のたびに `test-results/` を消すので、集計は対象の自治体だけを流した直後に行う（間に単一部屋や別自治体のテストを挟むと、集計対象が入れ替わる）:

- ファイルごとの日数・最初と最後の日付・1 日あたりの区分数・INVALID 件数・ステータスの内訳
- 日付の範囲が受付期間と合っているか（打ち切りが早すぎない・遅すぎない）
- **別の部屋なのに出力が完全に一致するもの**がないか。あれば、部屋の指定が効いていない（セッションの取り違え）可能性がある。画面で同じ週を表示したまま部屋だけ切り替えて比べ、サイト側で連動しているだけか確かめる
- 少なくとも 1 部屋 1 週間分を、画面の表示とセル単位で突き合わせる

### 3.6 問題修正

INVALID や `{}` が見つかった場合:

1. どの生テキストがマッピングされていないか特定
2. DIVISION_MAP または STATUS_MAP に追加
3. 再テスト

テーブル構造が想定と異なる場合:

1. `extract`（エンジン使用時はエンジン側）の行解析ロジックを修正
2. 再テスト

---

## 完了報告

作業はブランチを切って行い、検証が通ったら PR を作る（master に直接 push しない）。作業中に出したスナップショットや test-results、candidates.json はコミットせず、最後に片付ける（削除は Finder のゴミ箱経由）。

実装完了後、以下を報告:

- 生成・変更したファイル一覧
  - `packages/scraper/<prefecture>-<slug>/index.ts` — スクレイパー本体
  - `packages/scraper/<prefecture>-<slug>/index.test.ts` — テスト
  - `packages/shared/registry.ts` — 自治体レジストリ追加
  - `packages/scraper/data/institutions/<prefecture>-<slug>.json` — 施設マスタ（各項目の充填数と出典）
  - viewer・ドキュメント（2.6）
- スクレイプ対象の施設・部屋数
- テスト結果サマリー
- 注意事項（institution データ `data/institutions/<slug>.json` の作成・更新が必要か等）
- institution データを作成・更新した場合、マージで Database ワークフロー（`.github/workflows/database.yml`）が自動で D1 に反映する。D1 に施設が無いと予約行が突合できずに捨てられるので、マージ後にワークフローが成功したことを確かめる
- 本コマンドの改善案の提案
