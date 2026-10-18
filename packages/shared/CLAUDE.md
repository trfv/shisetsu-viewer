# Shared Package

自治体レジストリ（`registry.ts`）と共有型。ビルドなしで TS を直接 consume する。

- **罠**: `feeDivision` のキーは `FeeDivision.*` を使う。`ReservationDivision.*` を流用すると施設 JSON の `FEE_DIVISION_*` と食い違い、viewer で料金ラベルが引けなくなる（杉並区で実際に発生）。
- `auth0PostLogin.cjs` は Auth0 の Post Login Action の原本で、管理画面のコードはその写し。変えたらテストを通し、全文を Actions → Library に貼って Deploy する。
- 自治体を足したら `npm run test:unit -w @shisetsu-viewer/scraper` の registry drift 検査で追記漏れ（workflow choices・README・institutions JSON・スクレイパーディレクトリ）を洗い出す。
