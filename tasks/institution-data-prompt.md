# 施設データ埋め込み 指示テンプレート

## 使い方

以下をコピーして `<TARGET>` を書き換え、Claude に渡す。
複数ターゲットを指定可能: `TARGET=[tokyo-ota, tokyo-suginami, tokyo-toshima]`

---

## 指示

`packages/scraper/data/institutions/<TARGET>.json` の情報を Web から探して埋めてください。

### 参考ファイル

- `packages/scraper/data/institutions/tokyo-koutou.json` — enum 値・フォーマットの参考（充填率最高）
- `packages/scraper/data/institutions/tokyo-chuo.json` — 全フィールド 100% の完成例

### 埋めるフィールドと判定基準

| フィールド                | 基準                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `address`                 | 建物の住所。同一建物の全レコードで共通                                                                      |
| `website_url`             | 施設の公式サイト URL。見つからなければ空文字のまま                                                          |
| `capacity`                | 定員（人数）。Web で確認できた値を記入。不明は `null`                                                       |
| `area`                    | 面積（m²）。Web で確認できた値を記入。不明は `null`                                                         |
| `institution_size`        | capacity に基づく: **100以上** → `LARGE`, **50〜99** → `MEDIUM`, **50未満** → `SMALL`, **不明** → `UNKNOWN` |
| `is_equipped_piano`       | Web サイトにピアノ設置が **明記** されていれば `EQUIPPED`、明記なしなら `UNKNOWN`                           |
| `is_available_strings`    | 下記「楽器利用可否」参照                                                                                    |
| `is_available_woodwind`   | 同上                                                                                                        |
| `is_available_brass`      | 同上                                                                                                        |
| `is_available_percussion` | 同上                                                                                                        |

### institution_size の自動設定

`capacity` が既に入っているのに `institution_size` が `UNKNOWN` のレコードは、Web 調査不要で閾値から機械的に設定できる。**ギャップ分析後に真っ先に対応**すること。

### 楽器利用可否の判定基準

**Web サイトに明示的に書いてある場合のみ** `AVAILABLE` / `UNAVAILABLE` を設定する。推測では埋めない。

- 公式サイトに「弦楽器OK」「打楽器禁止」等の記載がある → その通りに設定
- 「楽器演奏可」とだけ書いてあり楽器種別の記載がない → `UNKNOWN`
- 「音量大/音量小」のような分類しかない場合 → `UNKNOWN`（楽器種別の判断不可）
- 楽器に関する記載がない → `UNKNOWN`

### 埋めないフィールド（スキップ）

- `fee_divisions`, `weekday_usage_fee`, `holiday_usage_fee`
- `layout_image_url`
- `lottery_period`
- `note`
- `is_equipped_music_stand`（ほぼ情報がないため）

### 変更しないフィールド

- `id`, `prefecture`, `municipality`
- `building`, `building_kana`, `building_system_name`（建物名・建物名カナ・予約システム上の建物名）
- `institution`, `institution_kana`, `institution_system_name`（施設名・施設名カナ・予約システム上の施設名）

### 推奨ワークフロー

1. **ギャップ分析**: 対象ファイルのレコード数・建物数・各フィールド充填率を集計
2. **institution_size 自動設定**: capacity 既存 + institution_size UNKNOWN のレコードを先に埋める
3. **並列 Web 調査**: 自治体ごとに Explore subagent を起動して並列調査（playwright-mcp, chrome-devtools-mcp が利用可能）
4. **プラン作成**: 変更箇所を一覧化し、根拠 URL を明記。変更しないものも理由付きで記載
5. **並列編集**: 自治体ごとに subagent でファイルを並列編集
6. **検証**: 下記の検証手順を実行
7. **テンプレート更新**: 作業中に発見した問題・改善点をこのファイルに反映（改善履歴テーブルに追記）

### 検証

1. `npx prettier --write <対象ファイル>`
2. `npm run typecheck -w @shisetsu-viewer/scraper`
3. データ集計（レコード数、各フィールドの充填率）を変更前後で比較して報告

---

## 改善履歴

### v1 → v2 (kanagawa-kawasaki 作業時)

| 問題                             | 原因                                     | 対策                                 |
| -------------------------------- | ---------------------------------------- | ------------------------------------ |
| `institution_size` 閾値が違った  | 基準が指示になく、他ファイルから推測した | 閾値を指示に明記（100/50）           |
| 楽器利用可否を推測で埋めた       | 「音楽室だから弦楽器OK」と推論した       | 「明示的に書いてある場合のみ」を明記 |
| 不要フィールドも調査しようとした | 対象フィールドが曖昧だった               | 埋めないフィールドを明示             |

### v2 → v3 (arakawa/sumida/chuo + ota/suginami/toshima 作業時)

| 問題                                                   | 原因                                           | 対策                                                     |
| ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------- |
| capacity があるのに institution_size が UNKNOWN のまま | Web 調査に気を取られ機械的設定を忘れた         | 「自動設定」セクション追加、ギャップ分析後に真っ先に対応 |
| 「音量大/音量小」分類を楽器種別と解釈しそうになった    | 自治体独自の分類体系を知らなかった             | 楽器判定基準に「音量分類→UNKNOWN」を追加                 |
| 作業手順が暗黙的で毎回再発明していた                   | ワークフローの記載がなかった                   | 推奨ワークフロー（6ステップ）を追加                      |
| 参考ファイルが古かった                                 | 作業完了ファイルが増えたのに更新していなかった | tokyo-chuo を完成例として追加                            |
