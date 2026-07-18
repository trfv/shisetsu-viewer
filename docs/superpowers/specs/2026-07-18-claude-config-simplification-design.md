# Claude 設定の簡素化 設計

日付: 2026-07-18
目的: リポジトリの Claude 関連設定（CLAUDE.md 群と `.claude/` 配下）から不要・矛盾・冗長な記述を除去し、コンテキスト効率を上げる。

## 背景

- `.claude/context.md` / `rules.md` / `hooks.md` / `prompts.md` は初期に生成されたボイラープレートで、Claude Code はこれらの非標準ファイル名を自動読み込みしない。内容も現状と矛盾している（Apollo Client・MUI・codegen 前提だが、実際は fetch ベース自作クライアント・CSS Modules・手書き `queries.ts`）。
- CLAUDE.md 群（ルート + 4 パッケージ、計 500 行）には、コードや package.json から導出できる列挙（コマンド一覧、ディレクトリ構造の全列挙）が多く含まれる。
- `.claude/settings.local.json`（gitignore 済み）の permissions が約 100 エントリに肥大化し、一回限りのエントリが多数残っている。

## 変更内容

### 1. 死荷重ファイルの削除

- `.claude/context.md`、`.claude/rules.md`、`.claude/hooks.md`、`.claude/prompts.md` を git から削除する。
- `.claude/.DS_Store` を削除し、`.DS_Store` が gitignore されていることを確認する（されていなければ追記）。

### 2. CLAUDE.md 群の積極圧縮（500 行 → 目安 200 行前後）

原則: **コードから導出できる記述を削り、コードから読み取れない制約・罠・横断契約だけ残す**。

- ルート: 密度は維持し、パッケージ別コマンドの重複を削減。TS7 の bare `tsc` 禁止の警告は必ず残す。
- viewer: コマンド一覧は package.json 参照に置き換え、罠のみ残す（`queries.ts` は手書きで codegen なし、wouter の API 対応表、CSS Modules、MSW 初期化）。ディレクトリ全列挙・ルート一覧・環境変数詳細は削除。
- scraper: defineScraper 契約、engines の共有関係、FileData 境界契約（`facility_name`/`room_name` 突合キー）、registry ドリフト検査の存在は残す。`common/` の全ファイル列挙と一部のコード例は削除。
- shared: feeDivision の罠（`FeeDivision.*` 必須）と registry 追加手順のみに縮約。
- mcp-server: 3 つの認証モード（Workers OAuth / stdio M2M / CLI PKCE）の対応と CLI の存在のみに縮約。
- `.claude/commands/` の 3 コマンドは内容維持（new-scraper は scraper/CLAUDE.md を `!cat` 埋め込みするため、圧縮の恩恵が波及する）。

### 3. permissions の共有化と整理

- 新規 `.claude/settings.json`（チェックイン）: リポジトリ作業に必要な汎用許可のみ（`Bash(git:*)`、`Bash(npm run:*)`、`Bash(npx:*)`、`Bash(node:*)`、`Bash(gh:*)`、`Bash(jq:*)` 程度の 10 件前後）。
- `settings.local.json`: 共有側でカバーされるエントリ、一回限りのエントリ（長大な `node -e`、`echo "exit: $?"` 系、過去のコミットコマンド断片）を削除。MCP ツール許可と個人設定（`outputStyle`、`prefersReducedMotion`、`enableAllProjectMcpServers`）のみ残す。

## スコープ外

- Opus 固有の挙動ガードレール追加。
- hooks の追加（lint-staged は Husky 側で機能済み）、新規コマンドの追加。

## 検証

- 圧縮後の CLAUDE.md に、削除対象と定めた列挙以外の情報欠落（罠・契約の消失）がないことをレビューで確認する。
- `.claude/settings.json` が有効な JSON であり、Claude Code が起動時に読めること。
- `/new-scraper` コマンドの `!cat packages/scraper/CLAUDE.md` 参照が壊れないこと（ファイル名は不変）。
