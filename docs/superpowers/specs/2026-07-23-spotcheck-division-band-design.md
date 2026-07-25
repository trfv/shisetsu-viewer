# spot check: 区分ラベル UNMAPPED を独立時間帯バンド照合で解消する

## 背景と問題

`/spot-check` の判定器（`packages/scraper/tools/spotcheck/judgeReport.ts`）は、観測したサイトの区分ラベル（`divisionLabel`）を registry の表示ラベル（`municipality.reservationDivision` の値）に厳密照合して D1 の区分に対応づける。ところが arakawa / ota / chuo は、registry の区分ラベルが `午前`/`午後`/`夜間` なのに対し、サイトは時間帯レンジ（`09:00 ～ 12:00` など）で区分を表示する。両者が噛み合わず、judge が `UNMAPPED（区分ラベル不明）` を返す。

観測（observe.ts）はサイトの表を正しく読めており（`reached:true`、cells あり）、失敗は判定段の区分同定に限局する。

なぜ kita は通るのか: kita は registry の区分ラベル自体が時間帯レンジ（`9:00-12:00`）なので、たまたま厳密照合が成立していた。つまり問題の本質は「registry の表示ラベルが時間帯レンジか、`午前`/`午後` か」という自治体差にある。

| 自治体 | registry の区分ラベル | サイト表示 | 現状の判定 |
|---|---|---|---|
| kita | `9:00-12:00` …（時間帯レンジ） | 時間帯レンジ | MATCH |
| koutou | `午前`/`午後`/`①`… | 午前/午後/① | MATCH |
| arakawa | `午前`/`午後`/`午後1`/`午後2`/`夜間` | 時間帯レンジ | **UNMAPPED** |
| ota | `午前`/…/`夜間2` | 時間帯レンジ | **UNMAPPED** |
| chuo | `午前`/`午後`/`夜間` | 時間帯レンジ | **UNMAPPED** |

## 設計上の制約: 盲検（独立性）

spot check の存在意義は、scraper の変換を**独立に**検証して silent failure を検出することにある。判定器が scraper の変換テーブル（`DIVISION_MAP` / `STATUS_MAP`）を借りると、同じ誤りを再現して MATCH を出してしまい、検出器としての独立性が失われる。

設計文書 `docs/superpowers/specs/2026-07-18-agentic-spotcheck-design.md` は盲検を「**期待値（空き状況の値）をエージェントに見せない**」と定義する。守るべきは STATUS の解釈であって区分の同定ではない。よって「区分の対応づけ」を独立に行う手段があれば、STATUS を独立にカテゴライズし続ける限り核心の盲検は保たれる。

本設計は、judge が **scraper の DIVISION_MAP を import せず**、時刻の独立解釈だけで区分をバンド単位に畳む。STATUS は従来どおり `symbolMap.ts`（`categorizeSymbol`）で観測側・期待側を独立にカテゴライズする。

## 独立バンド案が成立する根拠（実データ検証）

judge が独立に定めるバンド境界

- 開始時刻 `< 12` → morning
- `< 17` → afternoon
- それ以外 → evening

を、arakawa / ota / chuo の `DIVISION_MAP`（scraper の curated な真実）全 26 レンジに当てて、レンジ開始時刻から求めたバンドと enum 名から求めたバンドを突き合わせた結果、**矛盾ゼロ**だった。つまり judge は DIVISION_MAP を参照しなくても、時刻の独立解釈だけでサイトの区分と D1 の区分を同じバンドに正しく畳める。

（この突合は設計検証のために一度だけ行ったものであり、実装では judge は DIVISION_MAP を読まない。）

## 解法: 自治体ごと自動判別 + バンド単位マルチセット比較

### 新規純関数モジュール `packages/scraper/tools/spotcheck/divisionBand.ts`

STATUS の `symbolMap.ts` と同じ「純関数 + ユニットテスト」パターンに揃える。

- `parseStartHour(label: string): number | null`
  時間帯レンジ表記から先頭の `HH:MM` を取り、時（0–23）を返す。区切り（`～`/`〜`/`-`/`−`/`ー`）・空白・改行・全角数字のゆれを吸収する。時刻レンジとして解釈できなければ `null`。
- `bandFromHour(hour: number): Band`
  `< 12 → "morning"` / `< 17 → "afternoon"` / それ以外 → `"evening"`。
- `bandFromDivisionEnum(division: string): Band | null`
  区分 enum 名から `MORNING → morning` / `AFTERNOON* → afternoon` / `EVENING* → evening`。registry 由来の識別子から導く独立知識で、DIVISION_MAP には依存しない。どのバンドにも該当しない enum は `null`（＝想定外。judge 側で UNMAPPED 扱い）。

`Band` は `"morning" | "afternoon" | "evening"` の型エイリアス。

### `judgeReport.ts`: モードの自動判別

registry にフラグを追加しない（viewer 表示への波及と drift 管理を避ける）。observed の区分ラベルと registry のラベルから、サンプル単位でモードを判別する。

1. **exact モード（現行維持）**: observed の全セルの区分ラベルが registry の区分ラベルに厳密一致（正規化後）する場合。現状の 1:1 照合をそのまま行う。kita / koutou / toshima / edogawa はこちら。**退行なし・区分粒度も維持**。
2. **band モード（新規）**: exact が全セルでは成立せず、かつ observed の全セルが `parseStartHour` で時刻レンジとして解釈できる場合。バンド照合を行う。arakawa / ota / chuo はこちら。
3. **どちらも不成立**: 従来どおり `UNMAPPED`（真に未知のラベル＝実際の異常）。

判別を exact 優先にするのは、kita のように registry ラベルが時刻レンジの自治体を band に落として粒度を失わないためである。

### band モードの突合（バンド単位のマルチセット比較）

サンプル（1 部屋・1 日）について:

1. observed 側: 各セルを `parseStartHour → bandFromHour` で band に振り分け、symbol を `categorizeSymbol(cell.symbol, legend)` でカテゴリ化。`Map<Band, Category[]>` を作る。
2. D1 側: `reservation` の各 `[division, enumValue]` を `bandFromDivisionEnum(division)` で band 化、`categorizeSymbol(reservationStatus[enumValue])`（凡例は渡さない）でカテゴリ化。`Map<Band, Category[]>` を作る。
3. observed と D1 の band の和集合を走査し、band ごとにカテゴリの**マルチセット**（ソート済み配列）を比較する。
   - 一致しない、または片側にしか存在しない band があれば `MISMATCH`（band とカテゴリ内訳を detail に載せる）。
   - 全 band が一致すれば `MATCH`。

STATUS の UNKNOWN（凡例にも無い記号、enum 表示ラベルをカテゴリ化できない）は従来どおり `UNMAPPED`。observed セルの `parseStartHour` が `null`（band モードに入ったのに解釈不能なセル）や `bandFromDivisionEnum` が `null` の場合も `UNMAPPED`（想定外を握り潰さない）。

### 割り切り（承認済み）

- 午後1 / 午後2 のような同一バンド内の細分は集約されるため、**バンド内スワップ**（例: 午後1 と 午後2 の空き状況を取り違え）は検出できない。バンド間に跨る取り違え・欠落は検出できる。
- バンド境界（12 / 17）は開始時刻ベースの固定境界。現行 3 自治体の実データでは矛盾ゼロだが、将来 `11:00–13:00` のように正午を跨ぐレンジや境界ちょうどのレンジが出ると、独立バンドと enum 名バンドが食い違い**偽 MISMATCH**になりうる。実サイト検証で監視し、必要なら境界規則を見直す。

## 触るファイル

- 新規 `packages/scraper/tools/spotcheck/divisionBand.ts` + `divisionBand.test.ts`。
- `packages/scraper/tools/spotcheck/judgeReport.ts`: モード判別と band 突合の追加。`normalizeDivisionLabel` は内部空白も除去するよう揃える（exact モードの照合安定化。害はない）。
- registry / scraper 側 `DIVISION_MAP` は**変更しない**（judge は import もしない）。

## 検証

- 純関数（`parseStartHour` / `bandFromHour` / `bandFromDivisionEnum` / band 突合）はユニットテスト。退避済み sample-dumps（`~/.claude/projects/-Users-yushi-src-shisetsu-viewer/spotcheck-observer-sdd/sample-dumps/`）を fixture に使える。`node --test 'tools/spotcheck/*.test.ts'`（`npm run test:unit -w @shisetsu-viewer/scraper`）。
- worktree で `npm install --ignore-scripts` 後、実サイト実行（`plan.ts`→`observe.ts`→`judge.ts`、wrangler ログイン要）。
  - arakawa / ota / chuo が MATCH（または妥当な非 UNMAPPED）になる。
  - **kita / koutou / toshima / edogawa が退行せず MATCH のまま**。
- `typecheck:all` / `lint:all` / `test:unit` が green。
- JST 日付境界・当日締切超過で対象日が翌日へ飛ぶ罠（observer handoff の類型A/B着地ずれ、`isDateDisplayed` で対処済み）に注意。arakawa / ota は当日締切なら過去日側でズレる可能性。
