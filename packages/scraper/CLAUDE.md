# Scraper Package

Node が TS を直接実行する（ビルドなし）。1 予約システム = 1 ディレクトリで、`defineScraper()` の `scraper` を export する。新規は `/new-scraper`、修理は `/repair-scraper`。

## 守ること

- 各自治体の `index.test.ts` は共通の固定ボイラープレート。自治体固有ロジックを書かない。
- 取得期間は `horizon` で宣言し、日付計算を自前で書かない。`transform` で `as` キャストしない（未マッピング値は `*_INVALID` + 警告）。
- `engines/` の修正は同エンジンの全自治体に波及する。修正後は各自治体 1 施設ずつ検証する。tokyo-bunkyo / sumida / edogawa は同系 SPA だが抽出戦略が違うので、エンジンにまとめない。

## 罠

- 同じ enum 値に自治体内で別ラベルが要るとき、空いている `DIVISION_n` に逃がさない。D1 の生成列（`is_morning_vacant` など）が `RESERVATION_DIVISION_MORNING` を名指ししているため、「午前空き」検索から静かに漏れる。施設 JSON の `division_labels` でその施設だけ表示名を上書きする（例: tokyo-kita-cocokita）。
- `npx playwright test <target>` の位置引数はパスの正規表現。`tokyo-kita` は `tokyo-kita-genkiplaza/` にも一致するので末尾に `/` を付ける。
- `export:institutions` の並びは D1 の BINARY 照合で、Postgres 時代と前後が入れ替わる箇所がある。差分が並び替えだけなら取り込まなくてよい。
- 解決キー（`facility_name-room_name`）が空の施設がある（予約を持たない施設マスタ）。キーマップ上は `"-"` に潰れるが実害はない。
- 施設キーマップを引く `GET /v1/institutions?...&detail=true` はエッジキャッシュに載せない（upsert 直後に古い id 対応表を掴まないため）。
- 国内 proxy 経由の自治体（registry の `scraperViaJpProxy`）の故障の切り分けは `tools/jp-proxy/README.md`。

## Environment

`.env`（`D1_API_ENDPOINT`, `ADMIN_API_KEY`）。CI は GitHub OIDC で認証し、job に `permissions: id-token: write` があれば `ADMIN_API_KEY` は要らない。
