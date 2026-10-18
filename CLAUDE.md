# CLAUDE.md

日本の自治体（東京の区・川崎市）の公共施設の予約状況を見る Web アプリ。npm workspaces の monorepo で、各パッケージの罠はそれぞれの CLAUDE.md にある。

## 構成

- D1 に直接書くのは `packages/api` だけ。scraper は api の admin REST に書き込み（CI は GitHub OIDC、ローカルは `ADMIN_API_KEY`）、viewer（BFF 経由）と mcp-server（Service Binding）は api の REST を読む。
- 自治体データと enum の source of truth は `packages/shared` の `registry.ts` / `types.ts`。

## 守ること

- 主言語は日本語、タイムゾーンは Asia/Tokyo。
- default export は名前付き const で行う。匿名アロー関数だと hooks lint がコンポーネントと認識できない。
- pre-commit は lefthook（`brew install lefthook gitleaks` のあと `lefthook install`。npm 依存ではない）。

## コメント

t-wada の原則に従う。「コードには How、テストコードには What、コミットログには Why、コードコメントには Why not」。コメントは最低限にし、迷ったら書かない。

- 書くのは Why not だけ。自然に思いつく別の書き方を選ばなかった理由と、知らないと素直に書き直して壊す外部の制約（相手サイトの癖、プラットフォームの仕様、セキュリティ上の理由）。1〜2 行に収める。
  例: `// UNAVAILABLE を先に置く。「空きなし」が AVAILABLE 側の「空き」に誤マッチする。`
- 書かないもの:
  - 名前や処理を言い換えた JSDoc（フィールドごとの一行 doc を含む）。
  - 手順の番号付き説明。
  - ファイル冒頭の概要と使い方（CLI は `usage()` が担う）。
  - `// ---- section ----` のような区切り。
- 経緯（「以前は〜」「PR #n で〜」「〜から移行した」「目安 2026 秋」）はコミットログと PR に書く。コメントに残すと古びる。
- テストのコメントは書かず、テスト名で What を表す。期待値の言い換えの行末コメントや、Arrange / Act / Assert の見出しは要らない。
- 同じ罠の説明は、罠が起きる場所の 1 か所にだけ書く。ファイル冒頭・呼び出し側・CLAUDE.md の 3 か所に重ねない。CLAUDE.md には、コードを開く前に知っておくべきことだけを書く。
- 値の書式（`// YYYY-MM-DD`）のように、型で表せない契約は残してよい。ツール用の指示（`oxlint-disable-next-line <plugin>/<rule>` など）は消さない。

## Deploy

- 3 Worker とも Cloudflare Workers Builds で、設定は Cloudflare 側にある。viewer は全ブランチ、api / mcp-server は master のみで、監視パスが変わったときだけ走る。マージから本番まで約 2〜3 分。api の `/v1/health` の `version` が稼働中のコミット。
- 施設マスタ（`packages/scraper/data/institutions/**`）が master に入ると、Database ワークフローが全自治体に差分 upsert する。
