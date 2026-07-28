# 北区 元気ぷらざ スクレイパー設計（予約システム単位への一般化）

- 日付: 2026-07-29
- 対象: `packages/shared`, `packages/scraper`, `.github/`
- 関連: `docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md`

## 背景

北区には既に OpenReaf 系の予約システム（`kita-yoyaku.openreaf02.jp`）に対するスクレイパー `tokyo-kita` がある。
これとは別に、北区立元気ぷらざが独自の予約システム `https://genkiplaza.tokyo.jp/yoyaku/user.cgi` を運用している。

施設マスタ `data/institutions/tokyo-kita.json` には既に「北区立元気ぷらざ 第1ホール（165 名）／第2ホール（105 名）」が `MUNICIPALITY_KITA` の施設として登録されている。
ただし突合キーである `building_system_name` / `institution_system_name` が空のため、予約データが供給されていない。
欠けているのは施設マスタではなく、データ供給源だけである。

同一自治体に 2 つ目の予約システムが現れるのは、このリポジトリで初めてのケースである。

## 対象サイトの実測

2026-07-25 時点で実サイトを Playwright で観測した結果は以下のとおり。

| 項目 | 実測値 |
| --- | --- |
| 遷移 | `user.cgi` に `yyyy` / `mm` / `span` を POST（submit ボタン `name="view"`） |
| `span` | 1〜6（ヶ月）。1 リクエストで最大 6 ヶ月分が返る |
| 出力 | `<table>` が `span` 個。各テーブルの直前に `YYYY年M月` の見出し |
| 行 | 先頭セルが `第一ホール＜午前＞` 形式。以降 31 セル固定（1〜31 日） |
| 部屋 | 第一和室・第二和室・第三和室・第五和室・第一ホール・第二ホール |
| 区分 | 午前 / 午後 / 夜間（第三・第五和室は夜間のみ） |
| 状態 | `◎` 空きあり / `×` 空きなし / `－` 対象外 |
| 公開範囲 | 約 3 ヶ月先まで。それ以遠のテーブルは全セルが全角空白 `　` |
| 年跨ぎ | `yyyy` の選択肢は当年のみだが、`mm=12&span=3` は `2027年1月` `2027年2月` を返す |
| 更新頻度 | ページ冒頭に「原則、前日夜現在の情報」と明記 |

利用時間区分は `fee.html` に「午前（9〜12）／午後（1〜5）／夜間（6〜10）」と記載されている。
これは registry の北区エントリ `MORNING: "9:00-12:00"` / `AFTERNOON: "13:00-17:00"` / `EVENING: "18:00-22:00"` と一致する。
状態記号も北区エントリの `VACANT: "○"` / `STATUS_2: "×"` / `STATUS_3: "-"` の値域に収まる。

したがって元気ぷらざを北区に統合しても、viewer のラベル表示は破綻しない。
registry のラベル定義は変更しない。

## 決定

元気ぷらざを `MUNICIPALITY_KITA` の一部として扱う。
viewer の自治体セレクタは「北区」1 件のままとし、登録済みの元気ぷらざ施設に空き状況が乗る。

そのために、これまで同一視されていた 2 つの概念を分離する。

| 概念 | 単位 | 識別子 | 例 |
| --- | --- | --- | --- |
| 自治体 | 表示・DB・施設マスタ | `MUNICIPALITY_*` | `MUNICIPALITY_KITA` |
| スクレイパー | 予約システム | ディレクトリ名 | `tokyo-kita`, `tokyo-kita-genkiplaza` |

### 検討したが採らなかった案

**別自治体エントリ（`MUNICIPALITY_KITAGENKIPLAZA`）としての追加。**
共通コードの改修はほぼ不要だが、viewer の自治体セレクタに「北区」と「北区（元気ぷらざ）」が並ぶ。
利用者から見て北区の施設は 1 つの区に属しており、予約システムの実装差を UI に漏らす理由がない。
また登録済みの元気ぷらざ施設エントリを新 municipality へ移す必要があり、D1 の enum 制約にも値を足すことになる。

**既存 `tokyo-kita/index.ts` への同居（targets に判別子を持たせ prepare で分岐）。**
ディレクトリも registry も増えないが、`openreafHooks` のスプレッドと自前 hooks が 1 ファイルに混在する。
`engines/` が担保している「1 スクレイパー = 1 予約システム」の分離が崩れ、OpenReaf 側のエンジン修正時に影響範囲が読めなくなる。

## 設計

### registry（`packages/shared/registry.ts`）

`MunicipalityConfig` に追加スクレイパー名の配列を足す。

```ts
/**
 * 同一自治体に複数の予約システムがある場合の、追加スクレイパー名。
 * ディレクトリと test-results は `<prefecture>-<slug>-<name>`、
 * DB 上の municipality は親自治体と同じになる。
 */
readonly additionalScrapers?: readonly string[];
```

`MUNICIPALITY_KITA` に `additionalScrapers: ["genkiplaza"]` を設定する。
`reservationStatus` / `reservationDivision` / `feeDivision` は変更しない。

ヘルパを 3 つ追加する。

- `getScraperTargets(): string[]` — `getReservationTargets()` の各要素に加え、`additionalScrapers` を展開した `${prefecture}-${slug}-${name}` を返す
- `getMunicipalityByScraperTarget(target): MunicipalityConfig | undefined`
- `getMunicipalityKeyByScraperTarget(target): MunicipalityKey | undefined`

解決順は「`${prefecture}-${slug}` に完全一致」→「`additionalScrapers` の展開に完全一致」とする。
前方一致による曖昧解決は行わない。

`getReservationTargets()` は自治体単位の意味のまま残す。
parity（`tools/backend/parity.ts`）と施設マスタ系（`updateInstitutions.ts` / `exportInstitutions.ts` / `seed.ts`）はこちらを使い続ける。

### 1:1 前提の解除

| ファイル | 変更内容 |
| --- | --- |
| `common/registryContract.test.ts` | `getScraperTargets()` を回し、config は `getMunicipalityByScraperTarget()` で引く |
| `common/registryDrift.test.ts` | ディレクトリ一覧と `scraper.yml` の choices の突合先を `getScraperTargets()` にする |
| `common/scrapeTest.ts` | slug 切り出し（`municipality.slice(indexOf("-") + 1)`）を `getMunicipalityByScraperTarget()` に置換 |
| `tools/updateReservations.ts` | `getScraperTargets()` を回す。`MUNICIPALITY_*` は文字列 split ではなく registry 解決で得る |
| `common/jpProxy.ts` | 追加スクレイパーが親自治体の `scraperViaJpProxy` を継承する |
| `playwright.config.ts` | `ciExcludedTargets` に親自治体の追加スクレイパーも展開する |

`updateReservations.ts` の現行実装 `const [p, m] = target.split("-")` は、`tokyo-kita-genkiplaza` を渡しても偶然 `MUNICIPALITY_KITA` を返す。
偶然に依存した挙動であり、`kanagawa-kawasaki-xxx` のような別解釈が必要になったとき静かに壊れるため、registry 解決に置き換える。

### Playwright のテストフィルタ

`npx playwright test tokyo-kita` の位置引数は、ファイルパスに対する正規表現として扱われる。
そのため `tokyo-kita-genkiplaza/index.test.ts` にも一致する。
放置すると北区を dispatch したとき両方のディレクトリが走り、シャード matrix が二重になる。

`scripts/shardMatrix.ts` と `.github/actions/scrape/action.yml` のフィルタ文字列に末尾 `/` を付けて固定する。
`tokyo-kita/` は `tokyo-kita-genkiplaza/index.test.ts` のパスに含まれないため、これで分離できる。

### horizon の月単位

`common/horizon.ts` の `HorizonUnit` に `"month"` を追加し、`pagesForHorizon` は `differenceInCalendarMonths(end, start) + 1` を返す。
このサイトは 1 ページ（= 1 テーブル）が 1 ヶ月に対応する。

### エンジン（`packages/scraper/engines/genkiplaza.ts`）

同系サイトは現時点でこの 1 件だけだが、`engines/` の規約（1 ファイル = 1 予約システム製品）に合わせる。

- **prepare** — `user.cgi` へ遷移し、`yyyy` / `mm` を取得開始日（今日 + `startOffsetDays`）の年月、`span` を `min(pageCount, 6)` に設定して `view` を submit する。ページ送りは行わない。`yyyy` の選択肢は当年しか無いため、選択できないときは既定値のままにする（サーバが `mm + span` から年跨ぎを解決する）
- **extract** — ページ内の `<table>` を順に取り、`i` 番目を「開始月 + `i` ヶ月」とみなす。直前の `YYYY年M月` 見出しと突合し、食い違ったら構造変化として例外を投げる。各行の先頭セルを `部屋名＜区分＞` に分解し、2 列目以降を 1〜31 日に割り当てる
- **transform** — `RawSlot[]` を組み、`rawSlotsToOutput()` に渡す。以下は `RawSlot` を作る前に捨てる
  - 全角空白 `　` または空文字のセル（未公開の先の月）
  - 実在しない日付（30 日以下の月の 31 列目など）
  - 対象部屋に含まれない行（和室 4 室）

未公開セルを `RESERVATION_STATUS_INVALID` として保存しないのは、公開範囲外は「状態が不明」ではなく「レコードが存在しない」ためである。
保存すると 3 ヶ月先以降が INVALID で埋まり、viewer の空き検索を汚す。

### 自治体定義（`packages/scraper/tokyo-kita-genkiplaza/index.ts`）

```
municipality: "tokyo-kita-genkiplaza"
targets:      1 件（施設 = 北区立元気ぷらざ、部屋 = 第一ホール・第二ホール）
horizon:      { startOffsetDays: 1, monthsAhead: 3, unit: "month" }
DIVISION_MAP: 午前 → MORNING / 午後 → AFTERNOON / 夜間 → EVENING
STATUS_MAP:   ◎ → VACANT / × → STATUS_2 / － → STATUS_3
```

1 リクエストで全部屋・全月が取れるため、target は施設単位の 1 件とする。
出力は既定どおり施設名 1 ファイルで、両ホールを `room_name` で区別する。

`index.test.ts` は全自治体共通のボイラープレートをそのまま置く。

### 施設マスタ

`data/institutions/tokyo-kita.json` の第1・第2ホールに突合キーを埋める。

| 項目 | 値 |
| --- | --- |
| `building_system_name` | `北区立元気ぷらざ` |
| `institution_system_name` | `第一ホール` / `第二ホール` |

表示名 `institution`（`第1ホール` / `第2ホール`）は変更しない。
system_name はサイト表記、`institution` は表示用という既存の役割分担に従う。

### CI

`.github/workflows/scraper.yml` の `municipality` choices に `tokyo-kita-genkiplaza` を追加する（`registryDrift.test.ts` が強制する）。
`database.yml` と `README.md` は自治体単位のため変更しない。

## テスト

- ユニット（`node --test`）
  - `engines/genkiplaza.ts` の純粋関数（行ラベル分解、月テーブルから日付への割当、空欄と実在しない日付の除去）を、保存した実 HTML フィクスチャに対して検証する
  - `registry.test.ts` に `getScraperTargets()` と `getMunicipalityByScraperTarget()` のケースを追加する
  - `registryDrift` / `registryContract` は既存テストが新ディレクトリを自動で拾う
- 実サイト
  - `npx playwright test tokyo-kita-genkiplaza/` をローカル実行し、`test-results/tokyo-kita-genkiplaza/` の JSON を目視で検証する
  - 日付・区分・状態を実サイトの表示と突き合わせる
- 回帰
  - `npm run test:unit -w @shisetsu-viewer/scraper`
  - `npm run typecheck:all` / `npm run lint:all` / `npm run format:check:all`

## デプロイ

- 施設マスタの D1 反映は `npm run update:institutions` の手動実行が必要。master へのマージだけでは反映されない
- scraper は master から自動で更新されるため、追加のデプロイ操作は不要
- api / mcp-server はスキーマ変更がないため再デプロイ不要

## 対象外

- 和室 4 室（第一・第二・第三・第五）は施設マスタに未登録のため取り込まない。パースはするが突合前に捨てる
- サイトの更新は「前日夜現在」。1 日 2 回の定期実行に対して情報が最大 1 日古くなるのはサイト側の仕様であり、本設計では扱わない
- 公開範囲は約 3 ヶ月先まで。それ以遠は行を出力しない
