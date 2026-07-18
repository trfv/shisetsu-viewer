# Scraper Package

Playwright-based scrapers for municipal reservation systems; results are uploaded to the Hasura GraphQL backend. Deps: `@playwright/test`, `date-fns` only. Node が TS を直接実行する（`erasableSyntaxOnly` + `allowImportingTsExtensions`、ビルドなし）。Commands: see `package.json` scripts (`typecheck`, `test`, `test:unit`, `discover`, `update:reservations`, `update:institutions`, `export:institutions`).

## ScraperDefinition Pattern

1 自治体 = 1 ディレクトリ `<prefecture>-<slug>/`。`defineScraper()`（`common/defineScraper.ts`）で単一の `scraper` オブジェクトを export する。

- `municipality` はディレクトリ名と一致させる。`targets` の 1 要素 = 1 Playwright テスト。
- 取得期間は `horizon: { startOffsetDays, monthsAhead, unit }`（`common/horizon.ts`）で宣言する。日付計算を自前で書かない。
- hooks: `prepare`（空き状況テーブルまで遷移）→ `extract`（`collectPaginated()` でページ送り収集）→ `transform`（`RawSlot[]` に平坦化し `rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP)` で仕上げる。`as` キャスト禁止、未マッピング値は `*_INVALID` フォールバック + 警告）。
- `DIVISION_MAP` / `STATUS_MAP` は `export` 必須（`common/registryContract.test.ts` が shared registry との整合を検証する）。
- `index.test.ts` は全自治体共通の固定ボイラープレート（`runScrapeTarget` / `scrapeTestTitle` を回すだけ）。自治体固有ロジックを書いてはならない。
- `runScrapeTarget()` が prepare → extract → transform → validate → persist を駆動し、失敗時は分類付き失敗レコード（DOM/screenshot）を記録、成功時に除去する。

## Vendor Engines (`engines/`)

同一予約システム製品はエンジンを共有し、自治体側 `index.ts` は設定（URL・マップ・targets）のみ:

- `engines/openreaf.ts` — OpenReaf（`*.openreaf02.jp`）: tokyo-kita, tokyo-chuo
- `engines/webrGrand.ts` — WebR Grand: tokyo-meguro, tokyo-toshima

エンジン修正は同エンジンの全自治体に波及するため、修正後は各自治体 1 施設ずつ検証すること。tokyo-bunkyo / sumida / edogawa は同系 `/user/Home` SPA だが抽出戦略が異なるため standalone。

## Target Discovery

`npm run discover -w @shisetsu-viewer/scraper -- <municipality>`（既存自治体は現行 targets との差分も表示。未作成地区は `--engine openreaf --url <baseUrl> --name <name>`）。出力は `data/targets/<name>.candidates.json`。各候補に `musicLikely` フラグと、そのまま targets に貼れる `target` フィールドが付く。

## Data Contracts

- テスト出力: `test-results/<municipality>/<fileName>.json`（FileData 形状 — 境界契約）: `{ facility_name, data: [{ room_name, date: "YYYY-MM-DD", reservation }] }`
- **突合キー**: `facility_name` ↔ `institutions.building_system_name`、`room_name` ↔ `institutions.institution_system_name`。institution 解決キーは `` `${facility_name}-${room_name}` ``。
- 出力は `validateTransformOutput()` で検証。失敗は `test-results/<municipality>/_failures/` に transient/structural 分類付きで記録される（/repair-scraper ワークフロー用）。
- Institution metadata の source of truth はローカル JSON `data/institutions/<prefecture>-<slug>.json`（DB-ready enum 値の `Institution` フラット配列）。upsert は `tools/updateInstitutions.ts`、逆輸出は `tools/exportInstitutions.ts`。
- GraphQL 書き込みは `tools/backend/hasura.ts` にのみ存在。`tools/updateReservations.ts` は薄いオーケストレーション（`buildReservationRows()` 純関数 → `upsertReservations()`）。

## Playwright Config (`playwright.config.ts`)

- testMatch は `**/index.test.ts`。非 index の `*.test.ts` は `node --test` 用ユニットテスト（`npm run test:unit`）で、Playwright には拾われない。
- Workers: 4 local / 1 CI。`WORKERS` / `SLOW_MO` env で上書き。
- CI 除外は registry 駆動: shared `registry.ts` の `scraperCiExcluded` から `testIgnore` を構築（`SCRAPER_FORCE_INCLUDE` で個別上書き）。

## Adding a New Municipality

`/new-scraper` コマンドを使う。要点: 既知エンジン製品なら hooks を spread して設定のみ書く。それ以外は `prepare` / `extract` / `transform` を自作。shared `registry.ts` にエントリ追加後、`npm run test:unit -w @shisetsu-viewer/scraper` の registry drift 検査が他の追記漏れ（workflow choices・README・institutions JSON）を指摘する。

## Environment

`.env.sample` → `.env`（`GRAPHQL_ENDPOINT`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`）。CI は `M2M_TOKEN` を直指定して Auth0 Client Credentials Flow をスキップする。
