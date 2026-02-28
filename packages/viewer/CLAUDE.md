# Viewer Package

React 19 SPA for browsing public facility reservation data. Deployed to Cloudflare Workers.

Key dependencies: React 19, wouter 3 (lightweight router), @auth0/auth0-spa-js (dynamic import), date-fns 4. Build: Vite 7 + SWC.

## Commands

```bash
# Development
npm run start -w @shisetsu-viewer/viewer        # Dev server (port 3000)
npm run build -w @shisetsu-viewer/viewer        # tsc && vite build
npm run build:analyze -w @shisetsu-viewer/viewer # Build + bundle analysis (raw-data JSON)
npm run typecheck -w @shisetsu-viewer/viewer    # Type check with tsgo

# Testing
npm run test -w @shisetsu-viewer/viewer         # Vitest watch mode
npm run test:ci -w @shisetsu-viewer/viewer      # Single run
npm run test:unit -w @shisetsu-viewer/viewer    # Unit tests (verbose)
npm run test:integration -w @shisetsu-viewer/viewer

# E2E
npm run test:e2e -w @shisetsu-viewer/viewer     # Playwright E2E
npm run test:e2e:ui -w @shisetsu-viewer/viewer  # With UI
npm run test:e2e:debug -w @shisetsu-viewer/viewer
npm run test:e2e:headed -w @shisetsu-viewer/viewer
npm run test:all -w @shisetsu-viewer/viewer     # Unit + E2E

# Coverage & Deploy
npm run coverage -w @shisetsu-viewer/viewer     # Coverage report
npm run deploy -w @shisetsu-viewer/viewer       # Deploy via wrangler
```

## Architecture

### Application Bootstrap

```
index.tsx:  StrictMode > Auth0Provider > App
App.tsx:    ErrorBoundary > ColorModeProvider > Router > ScrollToTop + Header + ErrorBoundary > Switch/Route
```

Uses wouter's `<Router>`, `<Switch>`, `<Route>` for declarative routing. All page components are lazy-loaded inline in App.tsx (no separate router file). `Navigate` → `Redirect`, `useNavigate()` → `useLocation()[1]` (setLocation), `useLocation()` → `useLocation()[0]` + `useSearch()`.

Routes (`constants/routes.ts`):
- `/` — Top (home)
- `/waiting` — Auth0 redirect callback
- `/reservation` — Reservation search (AuthGuard-protected)
- `/institution` — Institution list
- `/institution/:id` — Institution detail

All page components are lazy-loaded via `React.lazy()`.

### Data Flow (GraphQL)

- Custom fetch-based GraphQL client in `api/graphqlClient.ts`. Calls Hasura endpoint with Auth0 Bearer token.
- Query strings and response types hand-written in `api/queries.ts`. Four queries: `institutions`, `institutionDetail`, `institutionReservations`, `reservations`.
- **IMPORTANT**: `api/queries.ts` is hand-maintained. No codegen.
- `useGraphQLQuery<T>()` hook — simple query with auto-refetch on variable/token change.
- `usePaginatedQuery<TData, TNode>()` hook — Relay-style cursor pagination with `fetchMore()`.
- Both hooks inject Auth0 token from `useAuth0()` context automatically.

### Auth & State

- `contexts/Auth0.tsx` — wraps `@auth0/auth0-spa-js` Auth0Client. Provides `isLoading`, `token`, `userInfo`, `login()`, `logout()`.
- `components/utils/AuthGuard` — protects routes requiring authentication (Reservation page).
- `contexts/ColorMode.tsx` — light/dark/system mode. Persists to localStorage. Sets `data-theme` attribute on `<html>`.

### Styling

- CSS Modules (`.module.css`) for component-scoped styles.
- Global theme tokens in `theme.css` using CSS Custom Properties (`--color-*`, `--font-*`, etc.).
- Light/dark mode via `[data-theme="dark"]` selector in `theme.css`.
- Fonts served from `public/fonts/` (Roboto, Noto Sans JP). Externalized in Vite build config — not bundled.
- Design constants in `constants/styles.ts`.

### Municipality Data

Enum constants (ReservationStatus, AvailabilityDivision, etc.) re-exported from `@shisetsu-viewer/shared` via `constants/enums.ts`. Municipality configs (labels, divisions, statuses) come from `@shisetsu-viewer/shared` registry.

## Directory Structure

```
api/          — GraphQL client (graphqlClient.ts) and queries (queries.ts)
components/   — Reusable UI components, each in own directory with .tsx, .test.tsx, .module.css
constants/    — App constants: env vars, routes, styles, enums
contexts/     — Auth0 and ColorMode React contexts
hooks/        — useGraphQLQuery, usePaginatedQuery, useQueryParams, useIsMobile
pages/        — Route page components: Top, Institution, Detail, Reservation, Waiting, Loading
utils/        — Utility functions: enums, format, id, institution, interval, municipality, relay, reservation, search
test/         — Test infrastructure
  browser-setup.ts  — Vitest browser setup (Auth0 mocks, MSW init, polyfills)
  mocks/            — MSW handlers (handlers.ts), data factories (data.ts), browser worker (browser.ts)
  utils/            — renderWithProviders() test helper (test-utils.tsx)
  integration/      — Integration tests
  performance/      — Performance tests
e2e/          — Playwright E2E tests
public/       — Static assets: fonts, icons, mockServiceWorker.js
```

## Testing

### Unit / Integration Tests

- Vitest 4 with browser mode (Chromium via Playwright provider). Config in `vitest.config.ts`.
- Setup: `test/browser-setup.ts` — mocks Auth0Client, starts MSW worker, polyfills matchMedia/IntersectionObserver/ResizeObserver.
- MSW 2 for API mocking: handlers in `test/mocks/handlers.ts`, mock data factories in `test/mocks/data.ts`.
- Test helper: `renderWithProviders()` from `test/utils/test-utils.tsx`
  - Wraps with MockAuth0Provider (mock token/userInfo) + wouter Router (memoryLocation)
  - Returns `{ user, ...renderResult }` where `user` is `vitest/browser` userEvent
  - Re-exports all `@testing-library/react` utilities
- Coverage: Istanbul provider. Thresholds: branches 60%, functions 60%, lines 70%, statements 70%.
- Always runs with `TZ=Asia/Tokyo` (set in npm scripts).

### E2E Tests

- Playwright config in `playwright.config.ts`. Tests in `e2e/` directory.
- Projects: chromium, firefox, webkit.
- Dev server started automatically via `webServer` config (port 3000).
- Retries: 0 locally, 3 on CI. Screenshots/video on failure. Trace on first retry.

## Environment Variables

- `VITE_GRAPHQL_ENDPOINT` — Hasura GraphQL endpoint
- `VITE_AUTH0_DOMAIN` — Auth0 domain
- `VITE_AUTH0_CLIENT_ID` — Auth0 client ID
- `VITE_AUTH0_AUDIENCE` — Auth0 audience

Copy `.env.sample` to `.env` and fill in values.

## Build & Deployment

- Vite config: `vite.config.ts`. SWC plugin for fast refresh.
- Font files externalized in Rollup config (served from public, not bundled).
- Manual chunks: react/react-dom bundled together. wouter is in the index chunk (~6 kB gz).
- Bundle analysis: `build:analyze` generates `dist/stats.json` (raw-data format with gzip/brotli sizes).
- Cloudflare Workers via Wrangler. Config in `wrangler.jsonc`. SPA mode.
- MSW worker must be initialized: `npx msw init public -w @shisetsu-viewer/viewer`
