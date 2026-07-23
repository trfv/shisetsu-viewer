# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. Package-specific details are in each package's own CLAUDE.md.

## Project Overview

Shisetsu Viewer is a web application for viewing public facility reservation status across municipalities in Japan (Tokyo wards and Kawasaki). Monorepo packages:

- **viewer** (`packages/viewer/`) — React 19 frontend. Cloudflare Workers.
- **scraper** (`packages/scraper/`) — Playwright-based data scrapers.
- **shared** (`packages/shared/`) — shared types and municipality registry (source of truth).
- **mcp-server** (`packages/mcp-server/`) — MCP server for AI tool integration. Cloudflare Workers.
- **api** (`packages/api/`) — D1-backed API worker (Hasura 置き換えの移行中。dual-write 稼働中)。CLAUDE.md 未整備。

## Monorepo Setup

- npm workspaces. Use `-w @shisetsu-viewer/<package>`. Node >= 24, ES Modules throughout.
- Type checking: TypeScript 7 (`typescript@7`)。各パッケージの `typecheck` script は素の `tsc` を呼ぶ。

## Root Commands

`npm start` (viewer dev server, port 3000) / `npm run build` / `npm run format:check:all`・`format:fix:all` (oxfmt) / `npm run lint:all`・`lint:fix:all` (oxlint) / `npm run typecheck:all` / `npm run knip`

## Conventions

- Formatter: oxfmt (`.oxfmtrc.json` — printWidth 100, double quotes, trailing commas es5, sortImports)。Linter: oxlint (`.oxlintrc.json`)。disable コメントは `oxlint-disable-next-line <plugin>/<rule>` 形式（eslint-disable 構文も解釈される）。
- File naming: components PascalCase, utils/hooks camelCase, tests co-located `*.test.ts(x)`, CSS Modules `*.module.css`.
- default export は名前付き const で行う（匿名アロー関数の default export は禁止。hooks lint がコンポーネントを認識できなくなるため）。
- Primary language Japanese, timezone Asia/Tokyo.
- Pre-commit: lefthook (`lefthook.yml`)。gitleaks + typecheck + staged な ts/tsx への oxlint/oxfmt。lefthook と gitleaks は brew 管理で npm 依存ではない（`brew install lefthook gitleaks`）。clone 直後に `lefthook install` を一度実行してフックを登録する。`CI` が設定された環境では pre-commit 全体を skip する。

## Cross-Package Architecture

- `@shisetsu-viewer/shared` の `registry.ts` / `types.ts` が自治体データと enum の source of truth。viewer / scraper 双方が import する。
- Data flow: scrapers が自治体サイトを巡回 → 変換 → Hasura GraphQL へ upload（Auth0 M2M token）。viewer は自作 fetch ベース GraphQL client で取得（Auth0 Bearer token）。
- MCP server は同データを AI 向けに公開（Workers デプロイは read-only、local stdio は write 可）。
