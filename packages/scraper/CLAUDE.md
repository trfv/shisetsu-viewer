# Scraper Package

Playwright-based web scrapers that navigate municipal reservation systems, extract reservation/institution data, and upload to Hasura GraphQL backend. Dependencies: `@playwright/test`, `date-fns` only. Uses `node --env-file=.env` for environment loading (Node >= 24).

## Commands

```bash
npm run test -w @shisetsu-viewer/scraper              # Run scraper tests (Playwright)
npm run update:reservations -w @shisetsu-viewer/scraper  # Upload reservation data to Hasura
npm run update:institutions -w @shisetsu-viewer/scraper  # Upload institution data to Hasura
```

## Architecture

### ScraperModule Pattern

Each municipality scraper implements the `ScraperModule<ExtractOutput, Page>` interface from `@shisetsu-viewer/shared`:

1. `prepare(page, facilityName)` — navigate to facility page, set search filters
2. `extract(page, maxCount)` — scrape table data across paginated results
3. `transform(extractOutput)` — map raw data to `TransformOutput` (room_name, date, reservation record)

Non-standard scrapers (tokyo-chuo, kanagawa-kawasaki) have hand-written tests instead of `testFactory`.

### Test-Driven Scraping

Scrapers run as Playwright tests via `createScraperTests()` from `common/testFactory.ts`:
- Each facility is a separate test case
- Test output is written to `test-results/<municipality>/<facility>.json`
- Validates output via `validateTransformOutput()` before writing

### Data Upload Pipeline

1. Scraper tests produce JSON in `test-results/<municipality>/`
2. `tools/updateReservations.ts` reads JSON, resolves institution IDs via GraphQL, upserts reservation records
3. `tools/request.ts` — fetch-based GraphQL client with exponential backoff retry (3 retries, server errors only), authenticates via `X-Hasura-Admin-Secret` header

## Directory Structure

```
tokyo-arakawa/    — Arakawa ward scraper (index.ts + index.test.ts)
tokyo-chuo/       — Chuo ward scraper (non-standard, hand-written tests)
tokyo-kita/       — Kita ward scraper
tokyo-koutou/     — Koutou ward scraper
tokyo-sumida/     — Sumida ward scraper (ignored on CI)
kanagawa-kawasaki/ — Kawasaki city scraper (non-standard)
common/           — Shared utilities
  testFactory.ts  — createScraperTests() factory
  types.ts        — Re-exports from @shisetsu-viewer/shared
  validation.ts   — validateTransformOutput() data quality checks
  dateUtils.ts    — toISODateString() with Japanese calendar support
  arrayUtils.ts   — stripTrailingEmptyValue()
  playwrightUtils.ts — selectAllOptions(), getCellValue()
tools/            — Data upload scripts
  updateReservations.ts — Reservation data uploader
  updateInstitutions.ts — Institution data uploader
  request.ts      — GraphQL client with retry
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
4. Use `createScraperTests()` from `common/testFactory.ts` if the scraper follows the standard pattern
5. Add municipality to `@shisetsu-viewer/shared` registry in `registry.ts`

## Environment Variables

- `GRAPHQL_ENDPOINT` — Hasura GraphQL endpoint (admin access)
- `ADMIN_SECRET` — Hasura admin secret for authenticated mutations
- `SLOW_MO` — (optional) Playwright slowMo override in ms
- `WORKERS` — (optional) Playwright worker count override

Copy `.env.sample` to `.env` and fill in values.
