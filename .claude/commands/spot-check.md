---
description: 実サイトの空き表示と D1 の保存値を少数サンプルで突合し、silent failure を検出する。例：/spot-check tokyo-koutou
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion
argument-hint: "[municipality-slug] [--key <institution_id>:<date>]... [--samples N]"
---

# agentic spot check ワークフロー

あなたは施設予約データの検証者です。
実サイトの空き状況表示を人間のように読み取り、D1 の保存値と突合します。
設計は `docs/superpowers/specs/2026-07-18-agentic-spotcheck-design.md` にあります。

**最重要原則（盲検）**: あなたは D1 の期待値（`expected.json`）を**絶対に読まない**。
期待値を知ると観測がそれに引っ張られ、silent failure 検出器としての独立性が失われる。
あなたの仕事は「サイトに表示されているものをそのまま記録する」ことだけで、判定は決定論スクリプト `judge.ts` が行う。

同じ理由で、スクレイパーの `STATUS_MAP` / `DIVISION_MAP` の**値の解釈を観測に使わない**。
スクレイパーのファイルを開いてよいのは、サイト URL と対象施設への到達経路を知る目的に限る。

## 引数の解析

ユーザー入力: $ARGUMENTS

- 第1引数（省略可）: `<prefecture>-<slug>` 形式の自治体。`plan.ts` に `--municipality` として渡す
- `--key` / `--samples` はそのまま `plan.ts` へパススルー

## フェーズ 1: plan（決定論）

```bash
cd packages/scraper && node tools/spotcheck/plan.ts <引数をパススルー>; cd ../..
```

- `SPOTCHECK_PLAN` の JSON からサンプル数を確認し、`packages/scraper/test-results/_spotcheck/plan.json` を Read する（あなたの Read/Write はリポジトリルート基準。`cd packages/scraper` した Bash とは基準が違うので、必ずこのフルパスで読み書きすること）
- エラーで止まったら（wrangler 未ログイン等）、メッセージをそのままユーザーに伝えて停止する
- 既定（`--key` 未指定時）はサンプル数上限の半分を parity tracker の MISSING キー、残り半分を乱択で選ぶ（乖離ゼロ・tracker 不在なら全部乱択にフォールバックする）。`--key` を指定したときは明示キーのみが対象になる

## フェーズ 2: サイト観測（observe.ts）

```bash
cd packages/scraper && node tools/spotcheck/observe.ts; cd ../..
```

`observe.ts` が plan.json の各サンプルについて実サイトを観測し、`observed/<連番>.json` と `raw/<連番>.json` とスクリーンショット（`screenshots/<連番>.png`）を書く。`SPOTCHECK_OBSERVE {"samples":N,"reached":M}` を出力する。1 サンプルにつき 1-3 分かかる（実サイト接続）。特定サンプルだけ再観測するなら `--id "<plan の id>"` を渡す。

**observe.ts が借りるもの**: スクレイパーの `prepare` フック（サイトへの到達経路）だけである。
`extract` / `transform` / `STATUS_MAP` は借りない。
借りると観測が scraper の解釈をなぞることになり、同じ誤りを再現して MATCH を出すためである。
この線引きは `observeStrategy.test.ts` の盲検検査が機械的に守っている。

**表の類型は自動判別する**: `observeCore.extractCells` が、対象室の行と区分ラベルとの照合を軸に表の 4 類型を判別してセルを組む。手で類型を指定する必要はない。

- 類型A `divisionColumn`（行=室、列=区分。江東・荒川）
- 類型B `singleRoomDivisionColumn`（室名列が無く、ヘッダ=区分・次の行=値のブロックが積まれる。北・中央）
- 類型C `divisionRow`（行=区分、列=日付。大田）
- 類型D `dateColumn`（行=室、列=日付。区分はフィルタで切り替える。豊島・江戸川）

**あなたの仕事**: 出力を確認し、`raw/<連番>.json` を読んで observed に不足している文脈を補う。observed の生成自体は observe.ts が行うので、記号を手で読み取る必要はない。

1. `raw` の `bodyText` に凡例（「○=空き」等）があり observed の `legend` が空なら、`observed/<連番>.json` の `legend` に書き足す（judge は legend を記号表より優先する）
2. `bodyText` に施設の状態を説明するお知らせがあれば `note` に書く。表の記号だけでは読み取れない文脈がある（例: 2026-07-22 の江戸川区 総合文化センターは「令和8年4月から令和9年11月まで全館休館による改修工事」というお知らせがページ上部にあり、全室が「休館」と表示されていた）
3. `reached: false` のサンプルは `note` の「読めた行」を見て、室名の表記ゆれが原因なら plan の `institutionSystemName` と突き合わせる
4. `cells` の `divisionLabel` が `divisionLabels` のいずれとも対応しない場合、対応するラベルに書き換える。judge の `normalizeDivisionLabel` は全角半角と範囲記号のゆれしか吸収しない（サイトが「09:00 〜 12:00」のような時間帯レンジ表記で、D1 が午前/午後/夜間のときは対応表を判断して書き換える）

**深追いしない**: 1 サンプルが観測できなくても全体は成立する。`reached: false` のまま次へ進む。

### 区分フィルタ型サイトの罠（類型D）

豊島区と江戸川区は、施設別空き状況の画面で「その他の条件で絞り込む」から時間帯を選ぶと表が描き直される。
フィルタを操作せずに読むと全区分の集約表が読めてしまい、それらしい観測結果が得られる。
2026-07-19 の初回実行で実際にこの罠を踏み、豊島区が MATCH と判定された（その日の記号がたまたま全区分で同じだった）。

`observe.ts` は `observeStrategy.ts` の `STRATEGY_BY_MUNICIPALITY` でこの 2 自治体を `divisionFilter` として扱い、区分ごとにフィルタを切り替えて表を読み直す（`raw` の `rawTablesByDivision` が区分ラベルごとにキーを持つ）。
新しい自治体で `cells` の区分ラベルが 1 種類しか出ない、あるいは全区分が同じ記号になる場合は、この罠を疑って `raw` の `rawTablesByDivision` のキーを確認する。

文京区も同系の集約表を持つが、区分別データが「時間帯別空き状況」の詳細ページ経由の別機構のため未対応で、`reached: false`（集約表を誤読せず fail-safe する）になる。これは既知で、専用戦略は将来課題。

### prepare 直後の描画待ち（既知の落とし穴）

スクレイパーの `prepare` は、空き状況が描画される前に return することがある（検索実行直後に返す・SPA のポストバック遷移が未完了・body 自体がまだ空、など）。本番の `extract` は直後に要素へアクセスして auto-wait で吸収するが、observe は即読みするため踏む。`observe.ts` は prepare 直後に `networkidle` を待ってこれを吸収している。新規自治体で `reached: false` かつ `raw` の `bodyText` が検索フォームや空になっている場合は、この描画待ちが足りていない可能性を疑う。

## フェーズ 3: judge(決定論)

```bash
cd packages/scraper && node tools/spotcheck/judge.ts; echo "exit=$?"; cd ../..
```

`SPOTCHECK_RESULT` の JSON を読む。exit code は 0=要調査なし / 1=要調査あり（`investigate` の件数が JSON にある）/ 2=入力不備（plan.ts を先に実行したか確認する）。
出力に `WARN:` 行があれば、観測ファイルの `id` が `plan.json` の `id` と一致していない（タイプミス）ことを意味する。該当する観測ファイルの `id` を修正して judge を再実行する。サイト構造変化とは結論しない。

## フェーズ 4: 報告

1. 判定の表（verdict / サンプル / detail / スクショパス）を提示する
2. 原因層の推論を添える:
   - `MISMATCH` → スクレイパー解釈バグの疑い。該当自治体の STATUS_MAP と観測記号を並べて指摘する
   - `SITE_HAS_DATA_D1_MISSING` → 書き込み経路バグの疑い。`gh issue view` で parity tracker Issue の現況（Hasura 側の有無）と突き合わせる
   - `SITE_NO_DATA` → parity の STALE 境界（updated_at）では拾えない遺物の存在を示す。ゲート基準の再検討材料
   - `SITE_NO_DATA_D1_STALE` → サイトにその日付の表示が無いのに D1 に行がある。D1 側の陳腐化（サイトが取り下げた日付の行が残っている、または施設・区分の対応付けの誤り）を疑う。当該施設が現在もスクレイプ対象かを `packages/scraper/<municipality>/index.ts` の `targets` で確認する
   - `UNREACHABLE` が過半 → サイト構造変化の疑い。`/repair-scraper <municipality>` を提案する
   - `UNMAPPED` → 判定不能。spot check 側の記号表（`packages/scraper/tools/spotcheck/symbolMap.ts`）かサイトの区分ラベルの対応が追いついていない。`detail` に出る未知の記号・ラベルを読み、記号表の更新が要るか、サイト構造が変わったのかを切り分ける
3. AskUserQuestion で parity tracker Issue へ結果コメントを追記するか確認し、希望があれば `gh issue comment` で判定表を追記する

## 完了報告

- サンプル数と判定の内訳（counts）
- 要調査（investigate > 0）の各サンプルの詳細と推論
- スクリーンショットの場所
- 本コマンドの改善案
