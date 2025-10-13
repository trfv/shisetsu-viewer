# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shisetsu Viewer is a web application for viewing public facility reservation status and information across multiple municipalities in Japan (Tokyo and Kawasaki). The project is a monorepo with two packages:
- **viewer**: React frontend application
- **scraper**: Playwright-based data scraping tools

## Development Commands

### Root-level Commands
```bash
npm start                     # Start viewer dev server (port 3000)
npm run build                 # Build viewer for production
npm run format:all            # Format all TypeScript files with Prettier
npm run lint:all              # Lint all TypeScript files with ESLint
```

### Viewer Package (`packages/viewer/`)
Always use `-w @shisetsu-viewer/viewer` for viewer-specific commands:

```bash
# Development
npm run start -w @shisetsu-viewer/viewer        # Start dev server (port 3000)
npm run build -w @shisetsu-viewer/viewer        # Production build
npm run build:analyze -w @shisetsu-viewer/viewer # Build with bundle analysis

# Testing
npm run test -w @shisetsu-viewer/viewer         # Watch mode
npm run test:ci -w @shisetsu-viewer/viewer      # CI mode (single run)
npm run test:unit -w @shisetsu-viewer/viewer    # Unit tests only
npm run test:integration -w @shisetsu-viewer/viewer
npm run test:e2e -w @shisetsu-viewer/viewer     # Playwright e2e tests
npm run test:e2e:ui -w @shisetsu-viewer/viewer  # e2e with UI
npm run test:all -w @shisetsu-viewer/viewer     # All tests

# Coverage
npm run coverage -w @shisetsu-viewer/viewer     # Generate coverage report
npm run coverage:open -w @shisetsu-viewer/viewer # Open in browser

# GraphQL
npm run generate -w @shisetsu-viewer/viewer     # Regenerate GraphQL client from queries

# Storybook
npm run storybook -w @shisetsu-viewer/viewer    # Start Storybook (port 6006)
npm run build-storybook -w @shisetsu-viewer/viewer
```

### Scraper Package (`packages/scraper/`)
```bash
npm run update:reservations         # Update reservation data
npm run update:institutions         # Update institution data
npm run test -w @shisetsu-viewer/scraper # Run scraper tests
```

## Architecture

### Monorepo Structure
This is an npm workspaces monorepo. Always use `-w @shisetsu-viewer/<package>` when running package-specific commands.

### Viewer Architecture

**Application Bootstrap** (App.tsx → router.tsx):
- App.tsx wraps the application with providers: Auth0 → ApolloClient → Theme → ErrorBoundary → React Router
- router.tsx uses lazy-loaded route components with a shared Layout (Header + ScrollToTop + ErrorBoundary)
- Routes defined in constants/routes.ts

**Data Flow**:
1. GraphQL queries defined in `api/queries/*.graphql`
2. Run `npm run generate -w @shisetsu-viewer/viewer` to generate typed hooks in `api/gql/`
3. Import and use hooks from generated code (DO NOT edit `api/gql/` files manually)
4. Apollo Client configured in `utils/client.ts` with Auth0 token injection and offset-limit pagination

**Auth & State**:
- Auth0 context (`contexts/Auth0.tsx`) provides authentication state and token
- Apollo Client receives token from Auth0 context for authenticated requests
- AuthGuard component protects routes requiring authentication

**Municipality Data**:
- Each municipality (Tokyo wards + Kawasaki) has constants in `constants/municipality/<name>.ts`
- Maps reservation statuses, time divisions, and fee structures specific to each municipality
- Used by both viewer and scraper to maintain consistency

**Theme & Styling**:
- Material-UI v7 with light/dark mode based on system preference
- Theme configuration in `utils/theme.ts`
- Uses Emotion for styled components

### Scraper Architecture

**Purpose**: Playwright-based scrapers that fetch reservation and institution data from municipal websites and update the GraphQL database.

**Structure**:
- `tools/updateReservations.mjs` - Updates reservation data
- `tools/updateInstitutions.mjs` - Updates institution data
- Municipality-specific scrapers in `<region>-<city>/` directories
- Shared utilities in `common/`

**Data Flow**:
1. Scrapers use Playwright to navigate municipal reservation systems
2. Extract and transform data using municipality constants
3. Update Hasura GraphQL backend via Apollo Client with admin credentials

## Testing Strategy

**Test Types & Locations**:
- Unit tests: Co-located with components (`*.test.tsx`)
- Integration tests: `test/integration/`
- Performance tests: `test/performance/`
- E2E tests: `e2e/` (Playwright)

**Testing Tools**:
- Vitest with browser mode (Chromium via Playwright)
- Testing Library for component testing
- MSW for API mocking (worker in `public/` directory)
- Playwright for E2E tests

**Running Tests**:
- Always set `TZ=Asia/Tokyo` (handled automatically by npm scripts)
- Coverage thresholds enforced in vitest.config.ts
- E2E tests start dev server automatically (playwright.config.ts webServer)

## GraphQL Workflow

**IMPORTANT**: `api/gql/` is generated code - never edit manually.

1. Edit queries in `api/queries/*.graphql`
2. Run `npm run generate -w @shisetsu-viewer/viewer`
3. Generated hooks appear in `api/gql/` directory
4. Import and use typed hooks in components

**Configuration**:
- codegen.ts defines schema endpoint (requires GRAPHQL_ENDPOINT and ADMIN_SECRET env vars)
- Uses @graphql-codegen/client-preset for type-safe hooks
- Backend is Hasura GraphQL with role-based access control

## Conventions

**File Naming**:
- Components: PascalCase (e.g., `SearchForm.tsx`)
- Utils/hooks: camelCase (e.g., `useAuth0.ts`)
- Tests: `*.test.tsx` alongside source files
- Stories: `*.stories.tsx` for Storybook

**Code Organization**:
- Components co-located with tests and stories
- Custom hooks in `hooks/`
- Shared utilities in `utils/`
- Pages are route components in `pages/`
- Constants in `constants/` (especially municipality-specific data)

**Internationalization**:
- Primary language: Japanese
- Text encoding: UTF-8
- Timezone: Asia/Tokyo

## Important Notes

- Node.js >=22 required
- Pre-commit hooks run lint-staged (ESLint + Prettier)
- Storybook for component documentation and visual testing
- Bundle analysis available via `build:analyze` (uses rollup-plugin-visualizer)
- Font files are external in build config (see vite.config.ts)
- MSW worker must be initialized: `npx msw init public -w @shisetsu-viewer/viewer`
