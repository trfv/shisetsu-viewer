# Scraper Package

Playwright-based web scrapers that navigate municipal reservation systems, extract reservation/institution data, and upload to Hasura GraphQL backend. Dependencies: `@playwright/test`, `date-fns` only. Uses `node --env-file=.env` for environment loading (Node >= 24).

## Commands

```bash
npm run typecheck -w @shisetsu-viewer/scraper          # Type check with typescript7
npm run test -w @shisetsu-viewer/scraper              # Run scraper tests (Playwright)
npm run test:unit -w @shisetsu-viewer/scraper         # Run common/ unit tests (node --test)
npm run discover -w @shisetsu-viewer/scraper -- <municipality>  # Crawl site and list scrape-target candidates
npm run update:reservations -w @shisetsu-viewer/scraper  # Upload reservation data to Hasura
npm run update:institutions -w @shisetsu-viewer/scraper  # Upload institution data from local JSON to Hasura
npm run export:institutions -w @shisetsu-viewer/scraper  # Export institution data from Hasura to local JSON
```

## Architecture

### ScraperDefinition Pattern

Each municipality directory exports a single declarative `scraper` object built with `defineScraper()` (`common/defineScraper.ts`):

```typescript
export const scraper = defineScraper({
  municipality: "tokyo-example",       // ディレクトリ名と一致させる
  targets,                             // スクレイプ対象の配列（1 target = 1 Playwright テスト）
  horizon: { startOffsetDays: 1, monthsAhead: 5, unit: "day" }, // 取得期間（common/horizon.ts）
  facility: (t) => t.facilityName,     // 失敗レコード・出力ファイルに使う施設名
  title: (t) => `${t.facilityName} ${t.roomName}`,   // テストタイトル（省略時 facility）
  context: (t) => ({ roomName: t.roomName }),        // 修復エージェント向けコンテキスト
  outputs: (data, t) => [...],         // 出力ファイル分割（省略時 facility 名 1 ファイル）
  prepare, extract, transform,         // 自作 or engines/ の hooks をスプレッド
});
```

- `prepare(page, target)` — navigate to the facility's availability table
- `extract(page, target, pageCount)` — scrape raw data across paginated results; use `collectPaginated()` from `common/paginate.ts` for the standard "extract → click next" loop
- `transform(extracted, target)` — flatten raw data into `RawSlot[]` (roomName / date / division / status as raw site text) and finish with `rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP)` from `common/reservation.ts`. Unmapped raw values fall back to `*_INVALID` with a console warning (never cast with `as`)

Each `index.test.ts` is identical boilerplate (do not add per-municipality logic there):

```typescript
import { test } from "@playwright/test";
import { runScrapeTarget, scrapeTestTitle } from "../common/scrapeTest.ts";
import { scraper } from "./index.ts";

for (const target of scraper.targets) {
  test(scrapeTestTitle(scraper, target), async ({ page }) => {
    await runScrapeTarget(scraper, target, page);
  });
}
```

`runScrapeTarget()` drives prepare → extract → transform → validate → persist, captures classified failure records (DOM/screenshot) on error, and clears them on success (see `common/runScrapeTest.ts` / `common/captureFailure.ts`).

### Vendor Engines (`engines/`)

Municipalities that use the same reservation-system product share one engine; the municipality file only supplies config (base URL, DIVISION_MAP/STATUS_MAP, targets):

- `engines/openreaf.ts` — OpenReaf (`*.openreaf02.jp`): tokyo-kita, tokyo-chuo. Config knob: `roomLinkMatch: "prefix"` for sites that append capacity suffixes to room links.
- `engines/webrGrand.ts` — WebR Grand: tokyo-meguro, tokyo-toshima. Config knob: `facilityCellExact`.

Usage: `...openreafHooks({ baseUrl, divisionMap, statusMap })` spread into `defineScraper()`. When a site structure changes, fix the engine once — all municipalities on that product follow. tokyo-bunkyo / tokyo-sumida / tokyo-edogawa run the same `/user/Home` SPA product family but with genuinely different extraction strategies, so they stay standalone.

### Scrape Horizon (`common/horizon.ts`)

`horizon` declares how far ahead to scrape instead of hand-written date math per municipality: `startOffsetDays` (0 = today, 1 = tomorrow), `monthsAhead` (added to endOfMonth of start), and `unit` ("day" | "week" | "twoWeeks" | "calendarWeek" — what one page-turn covers). Pass a function `(target) => number` when the page count differs per target (e.g. tokyo-koutou scrapes month-sized ranges).

### Target Discovery (`common/discover.ts` + `scripts/discover.ts`)

Instead of hand-transcribing facility/room lists, crawl the site to enumerate target candidates:

```bash
npm run discover -w @shisetsu-viewer/scraper -- tokyo-kita                 # 既存自治体: 現行 targets との差分も表示（新設施設・閉館の検知）
npm run discover -w @shisetsu-viewer/scraper -- --engine openreaf --url https://example.openreaf02.jp/ --name tokyo-example  # スクレイパー未作成の新地区（既知エンジンのみ）
```

Output goes to `data/targets/<name>.candidates.json`. Each candidate has a `musicLikely` flag (name-based heuristic: 音楽/スタジオ/ホール/リハーサル/練習...) and a `target` field that can be pasted into `index.ts` targets verbatim. Curation (music-capable or not) is done by a human or the /new-scraper flow — sites with purpose filters (arakawa, koutou, bunkyo, sumida) already narrow to music in `prepare`, so discovery matters most for room-list sites (OpenReaf, kawasaki). Engines provide `discover` automatically; standalone scrapers can implement the optional `discover` hook in `defineScraper()`.

### Test-Driven Scraping

Scrapers run as Playwright tests:

- Each target is a separate test case
- Test output is written to `test-results/<municipality>/<fileName>.json`
- Output is validated via `validateTransformOutput()` before writing; failures are captured to `test-results/<municipality>/_failures/` with transient/structural classification for the repair workflow

### Institution Data Management

Institution metadata is stored as JSON files in `data/institutions/{prefecture}-{slug}.json` (one file per municipality). These files are the source of truth, version-controlled, and AI-editable. Each file contains an array of `Institution` objects in DB-ready format (enum values, not Japanese text).

- `tools/updateInstitutions.ts` reads local JSON files and upserts to Hasura
- `tools/exportInstitutions.ts` queries Hasura and writes JSON files (for initial migration or re-export)

### Reservation Data Upload Pipeline

1. Scraper tests produce JSON in `test-results/<municipality>/` (FileData 形状 — 境界契約):
   - `{ facility_name: string; data: { room_name: string; date: "YYYY-MM-DD"; reservation: Record<string, string> }[] }`
   - キー対応: `facility_name` ↔ `institutions.building_system_name` / `room_name` ↔ `institutions.institution_system_name`。
     institution 解決キーは `` `${facility_name}-${room_name}` ``。
2. `tools/updateReservations.ts` — 薄いオーケストレーション。ファイル読み込み → `tools/backend/transform.ts` の
   `buildReservationRows()`（純関数、テスト付き）→ backend の `upsertReservations()`
3. `tools/backend/hasura.ts` — 書き込み先バックエンドの Hasura 実装
   （`fetchInstitutionKeyMap` / `upsertReservations` / `upsertInstitutions` / `listInstitutions`）。
   GraphQL はこのファイルにのみ存在する
4. `tools/request.ts` — fetch-based GraphQL client with retry / `tools/m2mToken.ts` — `getM2MToken()`（env から M2M Bearer を読む） /
   `tools/m2mAuth.ts` — `fetchM2MToken()`（Auth0 Client Credentials Flow でトークン取得。`scripts/run.ts` が使う）

## Directory Structure

```
<prefecture>-<slug>/ — one directory per municipality
  index.ts        — DIVISION_MAP/STATUS_MAP + targets + defineScraper({...})
  index.test.ts   — fixed boilerplate generating one test per target
engines/          — shared implementations per reservation-system vendor
  openreaf.ts     — OpenReaf systems (kita, chuo)
  webrGrand.ts    — WebR Grand systems (meguro, toshima)
common/           — core runtime + utilities
  defineScraper.ts — ScraperDefinition contract + defineScraper()
  scrapeTest.ts   — runScrapeTarget()/scrapeTestTitle() test driver
  discover.ts     — DiscoveredTarget + music heuristic + diff report
  runScrapeTest.ts — prepare→extract→transform→validate→persist skeleton
  horizon.ts      — declarative scrape-window → page count
  paginate.ts     — collectPaginated() standard pagination loop
  reservation.ts  — RawSlot + rawSlotsToOutput() type-safe mapping
  captureFailure.ts / classifyFailure.ts / failureTypes.ts — failure records for repair
  validation.ts   — validateTransformOutput() data quality checks
  dateUtils.ts    — toISODateString() with Japanese calendar support
  arrayUtils.ts   — stripTrailingEmptyValue()
  playwrightUtils.ts — selectAllOptions(), getCellValue()
  testUtils.ts    — writeTestResult() JSON output helper
data/             — Local data files (source of truth for institution metadata)
  institutions/   — JSON files per municipality (e.g., tokyo-koutou.json)
data/targets/     — Generated target candidates (discovery output, for curation)
tools/            — Data upload/export scripts
  updateReservations.ts — Reservation data uploader
  updateInstitutions.ts — Institution data uploader (reads from data/institutions/)
  exportInstitutions.ts — Institution data exporter (writes to data/institutions/)
  repair/verify.ts — deterministic verify harness for the repair workflow
  request.ts      — GraphQL client with retry
  m2mToken.ts     — Auth0 M2M token fetch and cache
scripts/          — run.ts (scrape+upload), discover.ts (target enumeration), shardMatrix.ts (CI シャード matrix 生成)
```

## Playwright Configuration

Config in `playwright.config.ts`:

- Test match: `**/index.test.ts`
- Workers: 4 local (override via `WORKERS` env), 1 on CI
- Timeout: 15 min local, 60 min CI
- `slowMo`: 100ms default (override via `SLOW_MO` env)
- Chromium launch args: disable GPU, images, extensions for performance
- Trace: on-first-retry locally, off on CI
- CI exclusion is registry-driven, not hardcoded: `testIgnore` is built from every municipality whose `scraperCiExcluded` flag is set in `@shisetsu-viewer/shared`'s `registry.ts` (source of truth), with per-run override via `SCRAPER_FORCE_INCLUDE`
- TypeScript: `erasableSyntaxOnly` + `allowImportingTsExtensions` (runs directly via Node, no build)

## Adding a New Municipality Scraper

1. Create `<prefecture>-<city>/` directory with `index.ts` and `index.test.ts` (test file is the fixed boilerplate above)
2. Check whether the site is a known vendor product (OpenReaf / WebR Grand). If so, spread the engine hooks and only write config + targets
3. Otherwise implement `prepare` / `extract` / `transform` in `defineScraper({...})`, reusing `collectPaginated()` and `rawSlotsToOutput()`
4. Define `DIVISION_MAP` (raw text → `ReservationDivision`) and `STATUS_MAP` (raw text → `ReservationStatus`) based on the municipality's reservation system UI
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
