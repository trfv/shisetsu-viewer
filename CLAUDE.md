# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. Package-specific details are in each package's own CLAUDE.md.

## Project Overview

Shisetsu Viewer is a web application for viewing public facility reservation status across municipalities in Japan (Tokyo wards and Kawasaki). Monorepo packages:

- **viewer** (`packages/viewer/`) — React 19 frontend. Cloudflare Workers.
- **scraper** (`packages/scraper/`) — Playwright-based data scrapers.
- **shared** (`packages/shared/`) — shared types and municipality registry (source of truth).
- **mcp-server** (`packages/mcp-server/`) — MCP server for AI tool integration. Cloudflare Workers.
- **infra** (`packages/infra/`) — Cloudflare の設定のうち `wrangler.jsonc` に書けないもの（Workers Builds のトリガー）の宣言と検査。
- **api** (`packages/api/`) — D1-backed API worker。読み書きの単一の口。Cloudflare Workers。CLAUDE.md 未整備。

## Monorepo Setup

- npm workspaces. Use `-w @shisetsu-viewer/<package>`. Node >= 24, ES Modules throughout.
- Type checking: TypeScript 7 (`typescript@7`)。各パッケージの `typecheck` script は素の `tsc` を呼ぶ。

## Conventions

- Formatter: oxfmt (`.oxfmtrc.json`)。Linter: oxlint (`.oxlintrc.json`)。disable コメントは `oxlint-disable-next-line <plugin>/<rule>` 形式（eslint-disable 構文も解釈される）。
- File naming: components PascalCase, utils/hooks camelCase, tests co-located `*.test.ts(x)`, CSS Modules `*.module.css`.
- default export は名前付き const で行う（匿名アロー関数の default export は禁止。hooks lint がコンポーネントを認識できなくなるため）。
- Primary language Japanese, timezone Asia/Tokyo.
- Pre-commit: lefthook (`lefthook.yml`)。gitleaks + typecheck + staged な ts/tsx への oxlint/oxfmt。lefthook と gitleaks は brew 管理で npm 依存ではない（`brew install lefthook gitleaks`）。clone 直後に `lefthook install` を一度実行してフックを登録する。`CI` が設定された環境では pre-commit 全体を skip する。

## Cross-Package Architecture

- `@shisetsu-viewer/shared` の `registry.ts` / `types.ts` が自治体データと enum の source of truth。viewer / scraper 双方が import する。
- Data flow: scrapers が自治体サイトを巡回 → 変換 → **`packages/api` の admin REST へ書き込む**（CI は GitHub OIDC、ローカルは `ADMIN_API_KEY`）。viewer は自分の Worker（BFF）経由で同じ api の公開 REST を叩く（要認証エンドポイントには BFF が Auth0 のアクセストークンを付ける）。D1 に直接書くのは api worker だけ。
- MCP server は同データを AI 向けに公開（Workers デプロイは D1 直バインドで read-only、local stdio は api 経由で write 可）。

## Deploy

- 3 Worker とも Cloudflare Workers Builds（設定は Cloudflare 側）。viewer は全ブランチ（master 以外は版のアップロードのみ）、api / mcp-server は master のみで、監視パス（`package-lock.json`・`packages/shared/**`・自パッケージ）が変わったときだけ走る。マージから本番まで約 2〜3 分。
- api は `npm run deploy:ci`（`packages/api/scripts/deployCi.sh`）: D1 マイグレーション → 版タグにコミット SHA を付けてデプロイ。`/v1/health` の `version` が稼働中のコミット。
- 施設マスタ（`packages/scraper/data/institutions/**`）が master に入ると Database ワークフローが自動で全自治体を反映する（差分 upsert）。同じ push で api も変わっていれば、新しい api が出るまで待つ。
