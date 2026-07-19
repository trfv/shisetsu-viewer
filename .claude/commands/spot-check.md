---
description: 実サイトの空き表示と D1 の保存値を少数サンプルで突合し、silent failure を検出する。例：/spot-check tokyo-koutou
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot
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

## フェーズ 2: サイト観測（Playwright MCP）

plan.json の各サンプル（`id` / `target` / `date` / `buildingSystemName` / `institutionSystemName` / `divisionLabels`）について:

1. その自治体のサイト URL と到達経路を知るために `packages/scraper/<target>/index.ts` を Read する（エンジン使用時はエンジンファイルも）。**STATUS_MAP の解釈は読み取っても使わない**
2. `browser_navigate` でサイトを開き、対象施設（buildingSystemName / institutionSystemName）の `date` の空き状況ページへ遷移する
3. 表示を記録する:
   - 区分ごとの**生の記号・文言**（「○」「×」「予約あり」等）を、画面の区分ラベル（「午前」「①」等）と対にして記録する
   - 観測した区分ラベルは、可能なら `divisionLabels`（そのサンプルの `plan.json` に入っている、当該自治体の区分ラベル一覧）のいずれかに正規化して `divisionLabel` に書く（全角/半角や区切り文字の表記ゆれを judge 側の突合で拾いやすくするため。`divisionLabels` は区分の呼び名の一覧であって空き状況の値ではないので、これを使っても盲検は破れない）
   - ページに凡例（「○=空き」等）があれば `legend` に記録する
   - `browser_take_screenshot` で `packages/scraper/test-results/_spotcheck/screenshots/<連番>.png` に保存する
4. サンプルごとに `packages/scraper/test-results/_spotcheck/observed/<連番>.json` を Write する（1 サンプル 1 ファイル）:

```json
{
  "id": "<plan.json の id>",
  "reached": true,
  "dateDisplayed": true,
  "outOfWindow": false,
  "cells": [{ "divisionLabel": "午前", "symbol": "○" }],
  "legend": { "○": "空き", "×": "予約あり" },
  "url": "<観測したページの URL>",
  "screenshotPath": "screenshots/<連番>.png",
  "note": ""
}
```

- 対象日がカレンダーに表示されない場合: `dateDisplayed: false`。それがサイトの受付期間（表示可能な日付範囲）の外だからなら `outOfWindow: true` とし、`note` に受付期間を書く
- 到達失敗は 1 サンプルにつき**試行 2 回まで**。2 回失敗したら `reached: false` + `note` に状況を書いて次のサンプルへ進む（深追いしない）

**コスト規律**:

- タブは 1 つを使い回す
- `browser_snapshot` はページ遷移ごとに 1 回まで。同一ページを再 snapshot しない
- observed はサンプルごとに逐次 Write し、snapshot の内容を会話に持ち越さない

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
