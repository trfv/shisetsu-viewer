# Shared Package

viewer / scraper 双方が使う共有型と自治体レジストリ。Zero runtime deps、ビルドなし（`"main": "index.ts"` で TS を直接 consume）。

- `types.ts` — `as const` オブジェクト + 同名 type の dual-export パターン（`ReservationStatus`, `ReservationDivision`, `FeeDivision`, `AvailabilityDivision`, `EquipmentDivision`, `InstitutionSize`, `Institution` など）。
- `registry.ts` — `MUNICIPALITIES`（自治体設定の source of truth）。各エントリ: `key` / `slug` / `prefecture` / `label` / `reservationExcluded` + `reservationStatus` / `reservationDivision` / `feeDivision` マッピング。オプション: `scraperCiExcluded`（scraper の定期 CI から除外）、`maintenanceWindowJst`、`additionalScrapers`（同一自治体の 2 つ目以降の予約システム。`getScraperTargets()` / `getMunicipalityByScraperTarget()` で解決する）。
- **罠**: `feeDivision` のキーは必ず `FeeDivision.*` を使う。`ReservationDivision.*` を流用すると施設 JSON の `FEE_DIVISION_*` 値と食い違い、viewer で料金ラベルが引けなくなる（杉並区で実際に発生）。
- `auth.ts` — Auth0 のアクセストークンのクレームの解釈（`readClaims`）。api の認可と viewer の BFF が同じ関数を使う。trial はロールに影響せず、UI だけが使う。
- `auth0PostLogin.cjs` — Auth0 の Post Login Action の原本（管理画面のコードはこの写し）。変えたらテストを通し、全文を Actions → Library に貼って Deploy する。`auth0PostLogin.test.ts` が Action の出力を `readClaims` で読み戻して契約を検証する。
- scraper 契約（`ScraperDefinition`）は Playwright 型に依存するため、ここではなく `packages/scraper/common/defineScraper.ts` にある。

自治体追加は `registry.ts` にエントリを足した後、`npm run test:unit -w @shisetsu-viewer/scraper` の registry drift 検査で追記漏れ（workflow choices・README・institutions JSON）を洗い出す。`additionalScrapers` を足したときも同じ検査がスクレイパーディレクトリと workflow choices の不足を指摘する。
