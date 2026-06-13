---
description: 構造変化で壊れたスクレイパーを、実サイトで検証しながら自己修復し PR を作る。例：/repair-scraper tokyo-kita
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_run_code, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_take_screenshot
argument-hint: <municipality-slug>
---

# スクレイパー自己修復ワークフロー

あなたは施設予約システムのスクレイパー修復の専門家です。
構造変化（サイトの DOM 変更）で壊れたスクレイパーを、**実サイトで検証しながら**最小の差分で修復し、検証済みの修正 PR を作成します。

**最重要原則**: 検証を通っていない修正は PR にしない。各修正案は必ず決定論的ハーネス `tools/repair/verify.ts` で実サイト検証し、`validateTransformOutput()` が通ること（pass）を確認してから次に進む。

## 引数の解析

ユーザー入力: $ARGUMENTS

- 第1引数: `<prefecture>-<slug>` 形式の自治体（必須。例: `tokyo-kita`）

引数が無ければ AskUserQuestion で対象自治体を確認する。

## スクレイパーパッケージの規約

!cat packages/scraper/CLAUDE.md

## 手順

### フェーズ 1: 失敗スペックの把握

1. 失敗レコードを読む: `packages/scraper/test-results/<municipality>/_failures/*.json`
   - レコードが無い場合は、ユーザーに「CI のアーティファクト `failures-retry-*` を `packages/scraper/test-results/<municipality>/_failures/` に展開してから再実行してください」と案内して停止する。
2. 各レコードの `failedStep` / `classification` / `errorMessage` / `validationErrors` / `domSnapshotPath` を確認。
3. `classification` が `transient` のみのレコードは修復対象外（retry で救済されるべきもの）。`structural` / `unknown` を対象とする。

### フェーズ 2: 原因特定

1. 現行スクレイパーを Read: `packages/scraper/<municipality>/index.ts`
2. 失敗レコードの `domSnapshotPath`（失敗時の HTML）を Read し、`index.ts` が期待するセレクタ（リンク名・XPath・ステータス記号など）が現在の DOM のどこに・どう変わったかを突き合わせる。
3. 必要なら **Playwright MCP** で実サイトを開いて最新構造を確認する（`browser_navigate` → `browser_snapshot`）。
4. 「どのセレクタが・何に変わったか」を1行で言語化する。推測が複数ある場合は最も確度の高いものから試す。

### フェーズ 3: 修復ループ（上限 5 回）

以下を pass するまで、または 5 回まで繰り返す:

1. `index.ts` に**最小の差分**で修正を適用（Edit）。マッピング（DIVISION_MAP/STATUS_MAP）の追加・セレクタ文字列の変更・テーブル XPath の修正など、原因に対応する一点のみ変更する。
2. 決定論ハーネスで実サイト検証:

   ```bash
   cd packages/scraper && node tools/repair/verify.ts <municipality> "<facility>" "<roomName>"; echo "exit=$?"; cd ../..
   ```

   - `<facility>` / `<roomName>` は失敗レコードの `facility` と `context.roomName`。
3. 出力末尾の `REPAIR_VERIFY_RESULT` の JSON を確認:
   - `pass: true` → この施設は修復成功。次の失敗施設へ。全施設が pass したらフェーズ 4 へ。
   - `pass: false` → `failures` 配列の新しい `errorMessage` / `validationErrors` を読み、フェーズ 2 に戻って次の仮説を立てる。
4. 5 回試しても pass しない施設があれば、フェーズ 5（エスカレーション）へ。

**型・lint の維持**: 修正後は `npm run typecheck -w @shisetsu-viewer/scraper` が通ること。pre-commit でも検証されるが、ループ中に都度確認してよい。

### フェーズ 4: PR 作成（全対象施設が検証済み pass のとき）

1. ブランチを作成:

   ```bash
   git switch -c fix/repair-<municipality>-$(date +%Y%m%d)
   ```

2. 変更をコミット（`index.ts` のみ）:

   ```bash
   git add packages/scraper/<municipality>/index.ts
   git commit -m "fix(scraper): repair <municipality> selectors after site change"
   ```

3. PR を作成（本文に before/after と検証ログを含める）:

   ```bash
   gh pr create --title "fix(scraper): repair <municipality> selectors" --body "$(cat <<'EOF'
## 背景
<municipality> のサイト構造変化により定期スクレイプが構造系失敗。

## 変更
- セレクタ修正: `<before>` → `<after>`（理由を1行）

## 検証
決定論ハーネス `tools/repair/verify.ts` により実サイトで検証済み（全対象施設 pass）:
- <facility> <roomName>: REPAIR_VERIFY_RESULT pass=true
- ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
   ```

4. マージは人間が行う（このコマンドはマージしない）。

### フェーズ 5: エスカレーション（5 回で収束しない場合）

1. PR は作らない。
2. 何を試し、なぜ pass しなかったか（最後の `errorMessage` / `validationErrors`、残った仮説）を要約する。
3. tracker Issue（タイトル `[scraper-repair] 構造変化の疑い`）に `gh issue comment` でエスカレーション要約を追記し、人間に引き継ぐ:

   ```bash
   gh issue list --search '[scraper-repair] 構造変化の疑い in:title state:open'
   gh issue comment <issue-number> --body "<エスカレーション要約>"
   ```

## 完了報告

- 修復した自治体・施設
- セレクタの before/after と原因
- 検証結果（全施設 pass / 一部エスカレーション）
- 作成した PR 番号、またはエスカレーション内容
- 本コマンドの改善案
