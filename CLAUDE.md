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
- Type checking: TypeScript 7 (`typescript7` = npm alias for `typescript@7`). Each package's `typecheck` script invokes `node ../../node_modules/typescript7/bin/tsc` directly. **Do not call bare `tsc`** — the legacy `typescript` package (kept for typescript-eslint / knip / prettier-plugin-organize-imports) also provides a `tsc` bin. Collapse the alias to plain `typescript@7` once typescript-eslint supports TS7 (≈2026 autumn).

## Root Commands

`npm start` (viewer dev server, port 3000) / `npm run build` / `npm run format:check:all`・`format:fix:all` (Prettier) / `npm run lint:all`・`lint:fix:all` (ESLint) / `npm run typecheck:all` / `npm run knip`

## Conventions

- Prettier: printWidth 100, double quotes, trailing commas es5. ESLint: flat config `eslint.config.ts`.
- File naming: components PascalCase, utils/hooks camelCase, tests co-located `*.test.ts(x)`, CSS Modules `*.module.css`.
- Primary language Japanese, timezone Asia/Tokyo.
- Pre-commit: Husky + lint-staged (ESLint/Prettier on staged files) + gitleaks secret scan (`brew install gitleaks`).

## Cross-Package Architecture

- `@shisetsu-viewer/shared` の `registry.ts` / `types.ts` が自治体データと enum の source of truth。viewer / scraper 双方が import する。
- Data flow: scrapers が自治体サイトを巡回 → 変換 → Hasura GraphQL へ upload（Auth0 M2M token）。viewer は自作 fetch ベース GraphQL client で取得（Auth0 Bearer token）。
- MCP server は同データを AI 向けに公開（Workers デプロイは read-only、local stdio は write 可）。
