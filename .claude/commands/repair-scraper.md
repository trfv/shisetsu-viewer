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
   - `index.ts` がエンジン（`engines/openreaf.ts` / `engines/webrGrand.ts` 等）を使っている場合はエンジン本体も Read する。セレクタ・ナビゲーションはエンジン側、URL・マッピング・対象一覧は `index.ts` 側にある。
2. 失敗レコードの `domSnapshotPath`（失敗時の HTML）と現行セレクタを突き合わせる。**コスト規律**: キャプチャ HTML は丸ごと Read しない。まず Grep で失敗セレクタ（リンク名・XPath・ステータス記号など）の周辺行番号を特定し、offset/limit 付きで部分 Read する。同一キャプチャを再度読み直さない（コストの大半は既読内容の再送で発生する）。
3. 次のどちらかに該当したら、**Playwright MCP** のライブ探索に切り替える（`browser_navigate` → `browser_snapshot`。同一ページの再 snapshot はしない）:
   - キャプチャ DOM との突き合わせで仮説が立たない
   - フェーズ 3 の verify が 2 回連続で fail した
     静的キャプチャからの状態再構築は多段遷移で壊れやすく、ライブビューの方が堅牢である。全面リニューアル（手順 5）の判定根拠にもライブ探索の結果を使う。
4. 「どのセレクタが・何に変わったか」を1行で言語化する。推測が複数ある場合は最も確度の高いものから試す。
5. **変更の規模を見極める**: 局所的なセレクタ／XPath／マッピングの変更で追従できるか、それとも予約システム自体が別物に置き換わった（URL 体系・ページ遷移・DOM 構造が丸ごと変わり、`prepare`/`extract`/`transform` の前提が崩れている）かを判断する。後者の**全面リニューアル**は最小差分での修復対象外なので、フェーズ 3 の修復ループには入らず、フェーズ 5（エスカレーション）へ直行する。

### フェーズ 3: 修復ループ（上限 5 回）

以下を pass するまで、または 5 回まで繰り返す:

1. **最小の差分**で修正を適用（Edit）。マッピング（DIVISION_MAP/STATUS_MAP）の追加・対象一覧の変更は `index.ts`、セレクタ・ナビゲーションの修正はエンジン使用時はエンジンファイル、それ以外は `index.ts` を変更する。原因に対応する一点のみ変更すること。
   - **エンジン修正時の注意**: エンジンは同一製品の複数自治体で共有されている。修正後は同エンジンを使う他自治体も 1 施設ずつ verify して巻き添え破壊が無いことを確認する（例: openreaf 修正 → tokyo-kita と tokyo-chuo の両方を verify）。
2. 決定論ハーネスで実サイト検証:

   ```bash
   cd packages/scraper && node tools/repair/verify.ts <municipality> "<facility>" "<roomName>"; echo "exit=$?"; cd ../..
   ```

   - `<facility>` / `<roomName>` は失敗レコードの `facility` と `context.roomName`。

3. 出力末尾の `REPAIR_VERIFY_RESULT` の JSON を確認:
   - `pass: true` → この施設は修復成功。次の失敗施設へ。全施設が pass したらフェーズ 4 へ。
   - `pass: false` → `failures` 配列の新しい `errorMessage` / `validationErrors` を読み、フェーズ 2 に戻って次の仮説を立てる。
4. 5 回試しても pass しない施設、または途中でサイトの全面リニューアル（局所修正では追従不能）と判明した施設は、フェーズ 5（エスカレーション）へ。

**型・lint の維持**: 修正後は `npm run typecheck -w @shisetsu-viewer/scraper` が通ること。pre-commit でも検証されるが、ループ中に都度確認してよい。

### フェーズ 4: PR 作成（全対象施設が検証済み pass のとき）

1. ブランチを作成:

   ```bash
   git switch -c fix/repair-<municipality>-$(date +%Y%m%d)
   ```

2. 変更をコミット（修正したスクレイパー/エンジンのファイルのみ）:

   ```bash
   git add packages/scraper/<municipality>/index.ts  # エンジン修正時は packages/scraper/engines/<engine>.ts も
   git commit -m "fix(scraper): repair <municipality> selectors after site change"
   ```

3. PR を作成（本文に before/after と検証ログを含める）:

   ```bash
   gh pr create --title "fix(scraper): repair <municipality> selectors" --body "$(cat <<'EOF'
   ```

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

````

4. マージは人間が行う（このコマンドはマージしない）。

### フェーズ 4.5: CI 実走確認（PR 作成後・マージ前）

ローカルの `verify.ts` は単発の Playwright テストを 1 シャードで実行するだけで、CI の並列性・GitHub Actions の IP / レイテンシ・retry フェーズの挙動までは再現できない。PR を出した後、**PR ブランチに対して `Run Scraper` workflow を dispatch** し、本番と同じ環境で全シャードを走らせて修正が効くことを確認する。

1. dispatch を投げる:

```bash
gh workflow run scraper.yml --ref fix/repair-<municipality>-$(date +%Y%m%d) -f municipality=<municipality>
````

- `--ref` は今回作った修正ブランチ。これにより `workflow_dispatch` の prepare ジョブが PR ブランチをチェックアウトして CI を回す。
- `municipality` を絞ると prepare ジョブが `shardTotal=20` で起動して所要時間が短い（`all` 指定時は `100` シャード）。

2. 実行 ID を取得し、進捗を watch:

   ```bash
   gh run list --workflow=scraper.yml --branch fix/repair-<municipality>-$(date +%Y%m%d) --limit 1 --json databaseId,status,conclusion,url
   gh run watch <run-id>
   ```

3. 完了後、失敗ジョブの有無を確認:

   ```bash
   gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion=="failure") | .name'
   ```

4. 失敗ジョブがあれば、対象施設の `_failures/*.json` をダウンロードして再診断（フェーズ 1 へ戻る）。失敗が無ければ PR 本文に CI 実走結果を追記:

   ```bash
   gh pr comment <pr-number> --body "CI 実走確認 (Run Scraper workflow #<run-id>) でも全シャード成功: <run-url>"
   ```

**いつ省略してよいか**: メンテナンス窓ヒットや classifier 修正のような「コード上は構造変化に触れていない／touched files が `index.ts` を含まない」ケースは、PR の主目的が分類ロジックだけなので CI 実走確認は任意。逆に **`<municipality>/index.ts` または `engines/*.ts` を編集した修復はすべて CI 実走確認を必須**とする（ローカルで passしても CI で flaky になるパターンが多発するため）。エンジン修正時は同エンジンの全自治体分を dispatch する。

### フェーズ 5: エスカレーション（5 回で収束しない／全面リニューアルの場合）

1. PR は作らない。
2. 何を試し、なぜ pass しなかったか（最後の `errorMessage` / `validationErrors`、残った仮説）を要約する。サイトの**全面リニューアル**と判断した場合は、その旨と「セレクタ修復ではなくスクレイパー（`prepare`/`extract`/`transform`）の再設計・書き換えが必要」である根拠を明記する。
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
- CI 実走確認（フェーズ 4.5）の run ID / URL、または省略理由
- 本コマンドの改善案
