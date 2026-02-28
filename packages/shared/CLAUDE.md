# Shared Package

Lightweight shared types and municipality registry consumed by both `@shisetsu-viewer/viewer` and `@shisetsu-viewer/scraper`. Zero runtime dependencies. No build step — uses `"main": "index.ts"` for direct TypeScript consumption.

## Exports

### Type Constants (`types.ts`)

Uses `as const` objects with dual-export pattern (`export const Foo = { ... } as const` + `export type Foo = ...`) for both runtime values and union types.

- `ReservationStatus` — 21 statuses (VACANT, STATUS_1..STATUS_20)
- `ReservationDivision` — 32 time divisions (MORNING, AFTERNOON, EVENING, plus numbered)
- `FeeDivision` — 22 fee periods
- `AvailabilityDivision` — AVAILABLE, UNAVAILABLE, UNKNOWN
- `EquipmentDivision` — EQUIPPED, UNEQUIPPED, UNKNOWN
- `InstitutionSize` — LARGE, MEDIUM, SMALL, UNKNOWN
- Aliases: `Division = ReservationDivision`, `Status = ReservationStatus`, `Reservation`, `TransformOutput`

### Municipality Registry (`registry.ts`)

- `MUNICIPALITIES` — 10 municipality configs with `as const satisfies Record<string, MunicipalityConfig>`
- Each config: `key`, `slug`, `prefecture`, `label`, `reservationExcluded`, mappings for `reservationStatus`, `reservationDivision`, `feeDivision`
- `getMunicipalityBySlug(slug)`, `getMunicipalityKeyBySlug(slug)`, `getReservationTargets()`
- Types: `MunicipalityConfig`, `MunicipalityKey`

### ScraperModule Interface (`scraper.ts`)

- `ScraperModule<ExtractOutput, Page>` — generic interface: `prepare()`, `extract()`, `transform()`
- Page type is generic to avoid `@playwright/test` dependency in shared

## Adding a Municipality

1. Add entry to `MUNICIPALITIES` in `registry.ts`
2. Required fields: `key` (MUNICIPALITY_UPPERCASE), `slug` (lowercase), `prefecture`, `label` (Japanese display name), `reservationExcluded` (boolean), `reservationStatus`, `reservationDivision`, `feeDivision` mappings
3. Set `reservationExcluded: true` if no active scraper exists
4. Run viewer and scraper tests to verify no regressions
