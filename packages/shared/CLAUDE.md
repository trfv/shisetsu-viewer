# Shared Package

Lightweight shared types and municipality registry consumed by both `@shisetsu-viewer/viewer` and `@shisetsu-viewer/scraper`. Zero runtime dependencies. No build step — uses `"main": "index.ts"` for direct TypeScript consumption.

## Commands

```bash
npm run typecheck -w @shisetsu-viewer/shared           # Type check with typescript7
```

## Exports

### Type Constants (`types.ts`)

Uses `as const` objects with dual-export pattern (`export const Foo = { ... } as const` + `export type Foo = ...`) for both runtime values and union types.

- `ReservationStatus` — 22 values (INVALID, VACANT, STATUS_1..STATUS_20)
- `ReservationDivision` — 40 values (INVALID, morning/afternoon/evening variants, DIVISION_1..DIVISION_30)
- `FeeDivision` — 22 fee periods
- `AvailabilityDivision` — AVAILABLE, UNAVAILABLE, UNKNOWN
- `EquipmentDivision` — EQUIPPED, UNEQUIPPED, UNKNOWN
- `InstitutionSize` — LARGE, MEDIUM, SMALL, UNKNOWN
- `UsageFeeEntry` — `{ division: string, fee: number }` for fee schedule entries
- `Institution` — full institution record type (26 fields: id, names, location, fees, availability, equipment, etc.)
- Aliases: `Division = ReservationDivision`, `Status = ReservationStatus`, `Reservation`, `TransformOutput`

### Municipality Registry (`registry.ts`)

- `MUNICIPALITIES` — municipality configs (currently 12) with `as const satisfies Record<string, MunicipalityConfig>`
- Each config: `key`, `slug`, `prefecture`, `label`, `reservationExcluded`, mappings for `reservationStatus`, `reservationDivision`, `feeDivision`
- Optional metadata: `scraperCiExcluded` (scraper exists but excluded from scheduled CI; consumed by `packages/scraper/playwright.config.ts`), `maintenanceWindowJst` (site maintenance hours `[start, end)` in JST)
- `feeDivision` keys MUST use `FeeDivision.*` — reusing `ReservationDivision.*` breaks fee label lookup against institution JSON values
- `getMunicipalityBySlug(slug)`, `getMunicipalityKeyBySlug(slug)`, `getReservationTargets()`, `getAllMunicipalityTargets()`
- Types: `MunicipalityConfig`, `MunicipalityKey`

Note: the scraper contract (`ScraperDefinition`) lives in `packages/scraper/common/defineScraper.ts`, not here — it depends on Playwright types.

## Adding a Municipality

1. Add entry to `MUNICIPALITIES` in `registry.ts`
2. Required fields: `key` (MUNICIPALITY_UPPERCASE), `slug` (lowercase), `prefecture`, `label` (Japanese display name), `reservationExcluded` (boolean), `reservationStatus`, `reservationDivision`, `feeDivision` mappings
3. Set `reservationExcluded: true` if no active scraper exists
4. Run viewer and scraper tests to verify no regressions
5. Run `npm run test:unit -w @shisetsu-viewer/scraper` — the registry drift checks point out every other place that must be updated (workflow choices, README, institutions JSON)
