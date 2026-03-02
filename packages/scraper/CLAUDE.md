# Scraper Package

Playwright-based web scrapers that navigate municipal reservation systems, extract reservation/institution data, and upload to Hasura GraphQL backend. Dependencies: `@playwright/test`, `date-fns` only. Uses `node --env-file=.env` for environment loading (Node >= 24).

## Commands

```bash
npm run typecheck -w @shisetsu-viewer/scraper          # Type check with tsgo
npm run test -w @shisetsu-viewer/scraper              # Run scraper tests (Playwright)
npm run update:reservations -w @shisetsu-viewer/scraper  # Upload reservation data to Hasura
npm run update:institutions -w @shisetsu-viewer/scraper  # Upload institution data from local JSON to Hasura
npm run export:institutions -w @shisetsu-viewer/scraper  # Export institution data from Hasura to local JSON
```

## Architecture

### ScraperModule Pattern

Each municipality scraper implements the `ScraperModule<ExtractOutput, Page>` interface from `@shisetsu-viewer/shared`:

1. `prepare(page, facilityName)` — navigate to facility page, set search filters
2. `extract(page, maxCount)` — scrape table data across paginated results
3. `transform(extractOutput)` — map raw data to `TransformOutput` (room_name, date, reservation record)

Each scraper's `index.test.ts` is a self-contained Playwright test that calls prepare → extract → transform, validates output via `validateTransformOutput()`, and writes JSON via `writeTestResult()` from `common/testUtils.ts`.

### Test-Driven Scraping

Scrapers run as Playwright tests:
- Each facility is a separate test case
- Test output is written to `test-results/<municipality>/<facility>.json` via `writeTestResult()`
- Validates output via `validateTransformOutput()` before writing

### Institution Data Management

Institution metadata is stored as JSON files in `data/institutions/{prefecture}-{slug}.json` (one file per municipality). These files are the source of truth, version-controlled, and AI-editable. Each file contains an array of `Institution` objects in DB-ready format (enum values, not Japanese text).

- `tools/updateInstitutions.ts` reads local JSON files and upserts to Hasura
- `tools/exportInstitutions.ts` queries Hasura and writes JSON files (for initial migration or re-export)

### Reservation Data Upload Pipeline

1. Scraper tests produce JSON in `test-results/<municipality>/`
2. `tools/updateReservations.ts` reads JSON, resolves institution IDs via GraphQL, upserts reservation records
3. `tools/request.ts` — fetch-based GraphQL client with exponential backoff retry (3 retries, server errors and 401), authenticates via Auth0 M2M Bearer token
4. `tools/m2mToken.ts` — Auth0 Client Credentials Flow token fetch with in-memory caching (5-min expiry margin)

## Directory Structure

```
tokyo-arakawa/    — Arakawa ward scraper (index.ts + index.test.ts)
tokyo-chuo/       — Chuo ward scraper
tokyo-kita/       — Kita ward scraper
tokyo-koutou/     — Koutou ward scraper
tokyo-sumida/     — Sumida ward scraper (ignored on CI)
kanagawa-kawasaki/ — Kawasaki city scraper
common/           — Shared utilities
  testUtils.ts    — writeTestResult() JSON output helper
  types.ts        — Re-exports from @shisetsu-viewer/shared
  validation.ts   — validateTransformOutput() data quality checks
  dateUtils.ts    — toISODateString() with Japanese calendar support
  arrayUtils.ts   — stripTrailingEmptyValue()
  playwrightUtils.ts — selectAllOptions(), getCellValue()
data/             — Local data files (source of truth for institution metadata)
  institutions/   — JSON files per municipality (e.g., tokyo-koutou.json)
tools/            — Data upload/export scripts
  updateReservations.ts — Reservation data uploader
  updateInstitutions.ts — Institution data uploader (reads from data/institutions/)
  exportInstitutions.ts — Institution data exporter (writes to data/institutions/)
  request.ts      — GraphQL client with retry
  m2mToken.ts     — Auth0 M2M token fetch and cache
```

## Playwright Configuration

Config in `playwright.config.ts`:

- Test match: `**/index.test.ts`
- Workers: 4 local (override via `WORKERS` env), 1 on CI
- Timeout: 15 min local, 60 min CI
- `slowMo`: 500ms default (override via `SLOW_MO` env)
- Chromium launch args: disable GPU, images, extensions for performance
- Trace: on-first-retry locally, off on CI
- `tokyo-sumida` excluded on CI via `testIgnore`
- TypeScript: `erasableSyntaxOnly` + `allowImportingTsExtensions` (runs directly via Node, no build)

## Adding a New Municipality Scraper

1. Create `<prefecture>-<city>/` directory with `index.ts` and `index.test.ts`
2. Implement `prepare()`, `extract()`, `transform()` following `ScraperModule` interface
3. Define `DIVISION_MAP` (raw text → `ReservationDivision`) and `STATUS_MAP` (raw text → `ReservationStatus`) based on the municipality's reservation system UI
4. Write a self-contained `index.test.ts` following the existing test pattern (prepare → extract → transform → validate → `writeTestResult()`)
5. Add municipality to `@shisetsu-viewer/shared` registry in `registry.ts`

## Environment Variables

- `M2M_TOKEN` — (optional) Pre-set M2M Bearer token. Skips Auth0 Client Credentials Flow when set (used in CI).
- `GRAPHQL_ENDPOINT` — Hasura GraphQL endpoint
- `AUTH0_DOMAIN` — Auth0 tenant domain (e.g., `your-tenant.auth0.com`)
- `AUTH0_CLIENT_ID` — Auth0 M2M application client ID
- `AUTH0_CLIENT_SECRET` — Auth0 M2M application client secret
- `AUTH0_AUDIENCE` — Hasura API audience identifier
- `SLOW_MO` — (optional) Playwright slowMo override in ms
- `WORKERS` — (optional) Playwright worker count override

Copy `.env.sample` to `.env` and fill in values.
