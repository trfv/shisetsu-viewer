# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Package-specific details are in each package's own CLAUDE.md.

## Project Overview

Shisetsu Viewer is a web application for viewing public facility reservation status across municipalities in Japan (Tokyo wards and Kawasaki). The project is a monorepo with three packages:

- **viewer** (`packages/viewer/`) — React 19 frontend application. See `packages/viewer/CLAUDE.md`.
- **scraper** (`packages/scraper/`) — Playwright-based data scraping tools. See `packages/scraper/CLAUDE.md`.
- **shared** (`packages/shared/`) — Shared types and municipality registry. See `packages/shared/CLAUDE.md`.

## Monorepo Setup

- npm workspaces. Use `-w @shisetsu-viewer/<package>` for package-specific commands.
- Node >= 24, npm >= 10, ES Modules throughout.
- Root `tsconfig.json` extends `@tsconfig/strictest` with composite project references.

## Root Commands

```bash
npm start                     # Start viewer dev server (port 3000)
npm run build                 # Build viewer for production
npm run format:all            # Format all TypeScript files with Prettier
npm run lint:all              # Lint all TypeScript files with ESLint
npm run knip                  # Detect unused files, deps, exports
```

## Conventions

**Prettier** (`.prettierrc.yaml`): printWidth 100, tabWidth 2, double quotes, trailing commas (es5).

**ESLint**: flat config in `eslint.config.ts`. TypeScript recommended + React/React-hooks plugins for `.tsx` files.

**File Naming**: Components PascalCase (`SearchForm.tsx`), utils/hooks camelCase (`useAuth0.ts`), tests `*.test.ts(x)` co-located with source, CSS Modules `*.module.css`.

**Internationalization**: primary language Japanese, UTF-8, timezone Asia/Tokyo.

**Pre-commit hooks**: Husky + lint-staged runs ESLint and Prettier on staged `.ts`/`.tsx` files.

## Cross-Package Architecture

- `@shisetsu-viewer/shared` is the source of truth for municipality data, enums (`ReservationStatus`, `ReservationDivision`, etc.), and types. Both viewer and scraper import from it.
- Backend: Hasura GraphQL with role-based access control. Viewer authenticates via Auth0 Bearer token; scraper authenticates via `X-Hasura-Admin-Secret` header.
- Data flow: scrapers navigate municipal websites → extract/transform reservation data → upload to Hasura via GraphQL mutations. Viewer fetches and displays this data via custom fetch-based GraphQL client.
