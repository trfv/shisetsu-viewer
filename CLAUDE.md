# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Package-specific details are in each package's own CLAUDE.md.

## Project Overview

Shisetsu Viewer is a web application for viewing public facility reservation status across municipalities in Japan (Tokyo wards and Kawasaki). The project is a monorepo with four packages:

- **viewer** (`packages/viewer/`) — React 19 frontend application. See `packages/viewer/CLAUDE.md`.
- **scraper** (`packages/scraper/`) — Playwright-based data scraping tools. See `packages/scraper/CLAUDE.md`.
- **shared** (`packages/shared/`) — Shared types and municipality registry. See `packages/shared/CLAUDE.md`.
- **mcp-server** (`packages/mcp-server/`) — MCP server for AI tool integration (Cloudflare Workers). See `packages/mcp-server/CLAUDE.md`.

## Monorepo Setup

- npm workspaces. Use `-w @shisetsu-viewer/<package>` for package-specific commands.
- Node >= 24, npm >= 10, ES Modules throughout.
- Root `tsconfig.json` extends `@tsconfig/strictest` with composite project references.
- Type checking: `tsgo` (`@typescript/native-preview`) — each package has `npm run typecheck` script.

## Root Commands

```bash
npm start                     # Start viewer dev server (port 3000)
npm run build                 # Build viewer for production
npm run format:check:all      # Check formatting (Prettier, no write)
npm run format:fix:all        # Fix formatting (Prettier, write)
npm run lint:all              # Lint all TypeScript files (ESLint, no auto-fix)
npm run lint:fix:all          # Lint and auto-fix (ESLint --fix)
npm run typecheck:all         # Type check all packages with tsgo
npm run knip                  # Detect unused files, deps, exports
```

## Conventions

**Prettier** (`.prettierrc.yaml`): printWidth 100, tabWidth 2, double quotes, trailing commas (es5).

**ESLint**: flat config in `eslint.config.ts`. TypeScript recommended + React/React-hooks plugins for `.tsx` files.

**File Naming**: Components PascalCase (`SearchForm.tsx`), utils/hooks camelCase (`useAuth0.ts`), tests `*.test.ts(x)` co-located with source, CSS Modules `*.module.css`.

**Internationalization**: primary language Japanese, UTF-8, timezone Asia/Tokyo.

**Pre-commit hooks**: Husky + lint-staged runs ESLint and Prettier on staged `.ts`/`.tsx` files. Gitleaks runs `protect --staged` for secret detection (requires `brew install gitleaks`).

**Secret detection**: Gitleaks (`.gitleaks.toml`). Pre-commit scans staged files; CI scans full history. Install locally: `brew install gitleaks`.

## Cross-Package Architecture

- `@shisetsu-viewer/shared` is the source of truth for municipality data, enums (`ReservationStatus`, `ReservationDivision`, etc.), and types. Both viewer and scraper import from it.
- Backend: Hasura GraphQL with role-based access control. Viewer authenticates via Auth0 Bearer token; scraper authenticates via Auth0 M2M Bearer token.
- Data flow: scrapers navigate municipal websites → extract/transform reservation data → upload to Hasura via GraphQL mutations. Viewer fetches and displays this data via custom fetch-based GraphQL client.
- MCP server: exposes Hasura data as MCP tools/resources for AI assistants. Authenticates to Hasura via Auth0 M2M token. Local stdio mode enables write tools; Cloudflare Workers deployment is read-only with API token auth.
