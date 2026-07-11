# shisetsu-viewer 再構築計画

## Context

ユーザーの依頼: リポジトリ全体を分析し、最新の情報を元に忖度なしで再構築計画を立てる。

分析の結論（忖度なし）: **アーキテクチャとライブラリ選定は健全**（React 19.2.7 = npm latest、Vite 8、Vitest 4、依存 6 個の薄い viewer、宣言的スクレイパー基盤）。問題は「古さ」ではなく、**(1) 過去の大移行（MUI/Apollo/react-router/codegen → 自前実装）の後始末、(2) 共通化の失敗による重複、(3) 実バグの放置、(4) CI/CD 運用の構造的な無駄、(5) 使っていない柔軟性（GraphQL）のために維持している失効性シークレット運用**に集中している。

ユーザー決定（確認済み）:
- スコープ: **アーキテクチャ刷新も含む**。優先度: **スクレイパー基盤強化と CI/CD 刷新を前半に**
- **Cloudflare 全寄せは承認済み**（「めちゃくちゃ良い」）
- **可能な限り Free tier に収める**。→ 実データ計測の結果、**差分書き込み設計により $0/月で成立**（下記「無料枠収支」）
- 計画は shisetsu-viewer MCP の実データを参照して裏取りすること → 実施済み（下記「実データ計測」）

## ターゲットアーキテクチャ

```
[現行]                                     [目標]
scraper (GH Actions, 100固定シャード)       scraper (GH Actions, 動的~43シャード, cron 23 8,20)
  → Auth0 M2M(失効・ローテ無効) + admin密鍵    → GitHub OIDC（静的シークレットゼロ）
  → Hasura v2 + Postgres (別リポ管轄)         → packages/api (CF Worker + D1, 型付きREST, 差分書き込み)
viewer SPA → Hasura GraphQL(手書き4クエリ)   viewer SPA → 型付き API クライアント
mcp-server → Hasura(シングルトン混線バグ)     mcp-server → D1 直バインド + per-request DI
デプロイ: 手動 wrangler                      デプロイ: master merge → deploy.yml 自動
型チェック: native-preview dev版(更新停止)    typescript@7 GA (alias 並走)
自治体リスト: 8 箇所手書きドリフト            shared/registry 単一ソース + ドリフト検査
```

- Auth0 は**人間のログイン用（viewer ゲート、MCP OAuth 上流 IdP）として維持**。機械間（M2M）のみ廃止。
- **費用: $0/月（Workers/D1 Free tier）**。差分書き込み設計で D1 Free の書き込み枠（10 万行/日）の約 1 割しか使わない。全行が変化する異常日に備えた escape hatch として Workers Paid（$5/月、込み枠 5,000 万行/月）へのワンクリック昇格を README に記載。Hasura/Postgres のホスティング費と Auth0 M2M 管理は消滅。
- shisetsu-database リポジトリは Phase 3 完了後に廃止（アーカイブ）。

## 実データ計測（shisetsu-viewer MCP、2026-07-11 実施）

search_reservations（2026-07-12 の 1 日分）と get_institution_reservations（代表施設の実効 horizon）で実測:

| 自治体 | 行数/日 | 実効 horizon（日） | 推定総行数 |
|---|---:|---:|---:|
| edogawa | 68 | 174 | 11,832 |
| arakawa | 49 | 366 | 17,934 |
| koutou | 41 | 144 | 5,904 |
| kawasaki | 37 | **427** | 15,799 |
| toshima | 36 | 252 | 9,072 |
| bunkyo | 32 | 113 | 3,616 |
| ota | 19 | 83 | 1,577 |
| sumida | 18 | 238※stale | 4,284 |
| kita | 11 | ~174（推定。※） | ~1,914 |
| chuo | 7 | 174 | 1,218 |
| meguro | **0** | — | 0 |
| suginami | 0 | — | 0 |
| **合計** | **318** | | **≈ 73,000 行** |

計測から確定した事実:
- **前方向きの実データは約 7.3 万行**。机上見積り（20 万行）の 1/3。フル書き換えでも 1 回 7.3 万行 upsert × 2 回/日。
- **meguro は施設 177 件（最大）を持ちながら予約データが 0 行** — 「半統合」が実データで実証された。統合すると +150 前後 行/日 × ~250 日 ≈ +3.8 万行。
- **sumida のデータは stale**（2027-03 まで残存、2027-02-26〜03-03 に欠落 gap）。7/10 からの structural 失敗と整合。
- **非 RFC 準拠 UUID が 17 施設**（toshima 11 / edogawa 3 / bunkyo 2 / kita 1、例: `f4d8d9d8-8594-b8b4-...` = version nibble が不正）。**mcp-server の `z.string().uuid()`（RFC 厳格）がこれらを弾き、get_institution_detail / get_institution_reservations で参照不可という実バグ**を発見（今回の計測中に実際に kita で再現）。viewer の `isValidUuid` は緩い 8-4-4-4-12 hex 検査のため影響なし。
- kawasaki の horizon は実測 427 日（14 ヶ月）で、コード上の monthsAhead:13 より広い。

## 無料枠収支（D1 / Workers Free tier、2026-07 時点の公式制限で検証済み）

| 資源 | Free 枠 | 本設計の消費 | 判定 |
|---|---|---|---|
| D1 rows written | **10 万行/日** | フル書き換えなら 14.6 万/日で**超過**。→ **差分書き込みで ~0.9 万/日**（新規日 ~320 行×2 + 変化行×1（churn 5% 仮定 7.3k）+ prune。churn 30% でも ~4.5 万） | ✓（枠の ~9%） |
| D1 rows read | 500 万行/日 | スクレイプ時の diff 読み ~15 万 + 検索 1 回 ~1 万行スキャン → 数百検索/日まで | ✓ |
| D1 ストレージ | 5 GB | ~30 MB（73k 行）。meguro 込み・1 年履歴保持でも <100 MB | ✓ |
| Workers リクエスト | 10 万/日 | アップロード ~300/日（500 行チャンク）+ 閲覧・MCP。静的アセット配信は無課金 | ✓ |
| Workers CPU | 10ms/呼び出し | 500 行チャンクの parse+diff は数 ms | ✓ |
| KV（MCP OAuth） | 10 万読/1 千書/日 | 現行と同じ | ✓ |

Free tier 成立の 4 条件（Phase 3 の設計に組み込み済み）:
1. **差分書き込み**: `ON CONFLICT DO UPDATE ... WHERE`（reservation/フラグに変化がある行のみ更新）。D1 応答の `meta.rows_written` をログして「無変化行が課金されない」ことを dual-write 中に実測検証。効かなければサーバ側 read-diff にフォールバック（読み取りは実質無料）
2. **インデックス最小化**: reservations は `PRIMARY KEY (institution_id, date)` の WITHOUT ROWID + `idx(date)` 1 本のみ → 書き込み増幅 ≤2 倍
3. **初期シード分割**: 全量 73k 行 × 増幅 2 = 14.6 万書き込み > 日次枠 → 自治体を 2 グループに分けて 2 日で投入（または一時的に Paid にして即日投入 → Free に戻す）
4. **書き込み予算ガード**: API が日次書き込み概算を追跡し、枠接近時は残りを次回 run に持ち越して正常応答（サイト全面改番のような「全行変化日」への防御）。恒久対処は Paid 昇格（$5）

## 調査で確定した事実（全主張はソース検証済み）

### 実バグ

1. **Rules of Hooks 違反**: `packages/viewer/pages/Detail.tsx:337-341` — 早期 return の後に `useGraphQLQuery()`。**真因: 全 5 ページが匿名 default export（`export default () => {}`）のため rules-of-hooks が発火しない**（名前付き化すると検出されるのはこの 1 件のみと検証済み）。
2. **URL 同期バグ**: `packages/viewer/hooks/useQueryParams.ts:79` — 初回のみ取り込み。ブラウザ履歴操作で検索フォームと URL が乖離。
3. **無限スクロール sentinel バグ**: `rows.length - 50` が 50 件未満で負値 → fetchMore 不発。計 4 箇所にコピペ。
4. **トークン混線リスク**: `packages/mcp-server/graphqlClient.ts:6-12` — モジュールレベル可変シングルトン。Workers 並行リクエストで別ユーザーのトークンを使い得る。
5. **cron がメンテ窓直撃（直近失敗の根本原因）**: GitHub cron 遅延が実測 1.8〜3.7 時間。`0 16 * * *`（JST 01:00 意図）が実際は **JST 02:49 開始で ota メンテ窓（02:00-05:00）に直撃**、7/9・7/10 の夜間 run が連続失敗。
6. **sumida は現在壊れている**: `_failures/` に 2026-07-10 付 structural 失敗 4 件。DB のデータも stale（実測）。
7. **registry.test.ts はどこからも実行されず、実行すれば落ちる**（期待 10 自治体 vs 実 12）。shared のテストは CI 経路自体が無い。
8. **workflow_dispatch で tokyo-sumida を選ぶと 0 テスト**（CI=true で testIgnore が効く）で全シャード失敗。choice リストが壊れている。
9. **MCP の UUID 厳格検証で 17 施設が参照不可**: `packages/mcp-server/tools/getInstitutionDetail.ts:51` 等の `z.string().uuid()` が非 RFC ID（toshima 11 / edogawa 3 / bunkyo 2 / kita 1 件）を拒否。viewer と同じ緩い 8-4-4-4-12 hex 形式に変更すべき。

### 幽霊・死にコード（viewer、約 2 割）

- `App.test.tsx` — 存在しない `./router` / `./utils/client`（Apollo 時代）を 48 行 mock する無意味なテスト。
- 設定 3 箇所が存在しない `api/graphql-client.tsx` を参照: `eslint.config.ts:15` / `.prettierignore` / `vitest.config.ts`（+ 実体のない `**/main.tsx`）。
- `components/Button/` 一式（7 ファイル）が import ゼロ。`MediumBox`/`LargeBox`/`MediumLabel`/`LargeLabel` も未使用。`env.d.ts` の `VITE_APP_TITLE` 未使用。

### 重複・単一ソース違反

- 自治体リストが **8 箇所**に手書き重複しドリフト: `shared/registry.ts`(12・真) / scraper ディレクトリ(11) / `scraper.yml` choice(10) / `database.yml` choice(11) / `playwright.config.ts` testIgnore / README(11) / `viewer/utils/municipality.ts`(11、"Derive from the registry" コメント付き手書き) / `registry.test.ts`(10)。
- `/user/Home` 系 SPA（bunkyo/sumida/edogawa = 同一予約システム製品）が 3 本別実装。period-table 抽出が `engines/webrGrand.ts` 含め 3 コピー。
- Auth0 M2M トークン取得 3 実装、GraphQL retry クライアント 2 実装、upsert mutation 2 パッケージに逐語重複。
- viewer: `Institution.tsx`/`Reservation.tsx` が構造コピペ。デザイントークンが theme.css と constants/styles.ts に二重定義。タイポの定着（`initlalContext`/`resevation`/`Instutoin` 等）。

### 自己修復システム（2026-06 導入）の未完成

- `expectedDateCount` が全 11 スクレイパー未供給 = partial-extraction 検出（要）がデッドコード。`collectPaginated` は throw を握り潰して部分結果で正常終了 = 二重の検知漏れ。
- `classifyFailure` が英語エラーメッセージの正規表現依存。standalone 7 自治体に discover 無し。

### CI/CD・運用（実測値）

- スクレイプ対象 **237 targets / CI 有効 197**（koutou 50, edogawa 40, meguro 36, arakawa 22, ota 22, kawasaki 16, toshima 15, kita 13, bunkyo 12, chuo 7, sumida 4）。
- 100 シャード実測: 合計 440 分/run、平均 264 秒、p50 160 秒、**固定オーバーヘッド ~78 秒/シャード** → 空・薄シャードの構造的無駄（~74 分/run 削減余地）。
- `nodejs.yml` は `push: branches-ignore: [master]` のみ（**PR トリガー無し・master push で CI 無し**）。branch protection の required checks は**空**。e2e は build するのに **dev server を検証**。`lint:all` は警告でも exit 0。
- **CD 不在**（手動 wrangler deploy）。`rotate-m2m-token.yml` cron 無効 = M2M_TOKEN 失効で静かに死ぬ。`HASURA_ADMIN_SECRET`（全権）が CI に常駐。`SCRIPT_ENDPOINT` は参照ゼロの孤児 secret。
- composite action 内だけ古い action（dependabot が `.github/actions/scrape` を見ていない）。`upload-artifact@v7` のみタグピン。

### ツールチェーン

- 型チェックが `@typescript/native-preview` **7.0.0-dev.20260225.1**（dependabot ignore で更新停止）+ 未使用 typescript 5.9.3 の二重管理。ルート tsconfig の `composite`/`references` は空回り。
- viewer の予約検索 `maxDate = endOfMonth + 6ヶ月`（`Reservation.tsx:46`）に対し arakawa 366 日 / kawasaki 427 日（実測）を取得 → **約半分は UI から到達不能なデッドデータ**（arakawa は日送り ~400 クリック/施設 × 22 施設）。
- registry の意味的誤り: `SUGINAMI.feeDivision` が `ReservationDivision.AFTERNOON_*` キー流用（施設 JSON は `FEE_DIVISION_*` のため**料金ラベルが引けない実害あり**）。OTA STATUS_6 欠番は両側一貫で実害なし。
- `.claude/commands/new-scraper.md` の institutions JSON テンプレートが実形式と不一致（従うと壊れる）。CLAUDE.md 5 ファイルにドリフト多数。

## 最新動向（2026-07-11 時点、Web 検証済み）

| 項目 | 状況 | 対応 |
|---|---|---|
| TypeScript 7.0 | **2026-07-08 GA**（Go ネイティブ。プログラマティック API は 7.1 ~2026-10 まで無し） | typecheck を TS7 へ。**typescript-eslint の対応範囲は `>=4.8.4 <6.1.0`** のため `typescript` 5.9 を残し npm alias `typescript7` 並走。7.1 + 対応後に一本化 |
| ESLint 10 | 2026-02 リリース。eslint-plugin-react が peer 未対応（#3977） | 見送り。dependabot に major ignore。先に rules error 化 |
| Hasura v2 | LTS 年次継続、DDN 移行は opt-in | 存続性は問題ないが、未使用の柔軟性のためのコスト（失効トークン・全権シークレット・別リポ）として置き換える |
| Cloudflare D1 | Free: 書き込み 10 万行/日・読み 500 万行/日・5GB。Paid($5): 込み 5,000 万行/月 | 上記「無料枠収支」のとおり差分書き込みで Free 内 |
| React 19.2.7 / Vite 8 / Vitest 4 / Playwright 1.61 | 全て現行 latest 圏 | フレームワーク乗り換え不要の根拠 |

## フェーズ計画

各 PR は master ベース・独立 revert 可能。Phase 0 → 1 と 2 は並行可。Phase 3 は 0-2 と 1-2 の後、Phase 4 の構造整理は 3-3 の後が効率的。

### Phase 0: CI 足場と応急処置

**PR 0-1: PR/master CI 是正**
- `nodejs.yml`: トリガーを `pull_request` + `workflow_call`（後の deploy.yml から再利用）+ `workflow_dispatch` に変更。concurrency で重ね push キャンセル。
- shared テスト配線: `packages/shared/registry.test.ts` を `node:test` 化 + **期待リストに meguro 追加**（現状は配線した瞬間落ちる）、shared に test script、nodejs.yml test ジョブに追加。
- e2e の webServer を CI では `vite preview`（build 成果物検証）に変更（`packages/viewer/playwright.config.ts`）。
- `lint:all` に `--max-warnings=0`。`upload-artifact@v7` 2 箇所を SHA ピン。
- マージ後の運用: required checks に `ci-success` を設定（`gh api`）。
- 本計画を `docs/superpowers/specs/2026-07-11-repository-rebuild-design.md` として commit（リポジトリ規約に従う）。

**PR 0-2: 応急処置（secrets + 即効バグ）**
- `rotate-m2m-token.yml` の cron を月次で再有効化（例 `23 21 1 * *`）+ 失敗時に Issue を立てるステップ追加（Phase 3 で根治するまでの止血）。
- `scraper.yml` / `database.yml` の env から `HASURA_ADMIN_SECRET` を除去 → 定期 run 2 回緑を確認後に secret 本体を削除。孤児 secret `SCRIPT_ENDPOINT` を削除（運用作業）。
- **mcp-server の UUID 検証緩和**（実バグ 9）: `getInstitutionDetail.ts` / `getInstitutionReservations.ts` の `z.string().uuid()` を viewer と同等の 8-4-4-4-12 hex regex に変更 → 17 施設が参照可能に。`npm run cli -- detail <kita の非RFC ID>` で検証、`npm run deploy -w mcp-server`。

### Phase 1: スクレイパー基盤強化（最優先）

**PR 1-1: 自治体レジストリ単一ソース化**
- `packages/shared/registry.ts`: `scraperCiExcluded?: boolean`（sumida・meguro）と `maintenanceWindowJst?: [start, end]`（ota: [2,5]）を追加。**SUGINAMI.feeDivision のキーを `FeeDivision.AFTERNOON_ONE/_TWO` に修正**（料金ラベル表示が直る）。OTA STATUS_6 欠番に経緯コメント。
- `packages/scraper/playwright.config.ts`: testIgnore を registry から導出 + **`SCRAPER_FORCE_INCLUDE` 環境変数で個別解除**。`.github/actions/scrape/action.yml` に `SCRAPER_FORCE_INCLUDE: ${{ inputs.municipality }}` を配線（dispatch では CI 除外自治体も走る。sumida 0 テストバグ解消 + meguro 検証手段の確保）。
- ドリフト検査（node --test、既存 test:unit レーンで CI 実行）: `common/registryDrift.test.ts`（scraper.yml/database.yml choices・README 対応地区・scraper ディレクトリ実在・institutions JSON 実在 = registry と一致）+ `common/registryContract.test.ts`（全スクレイパーの DIVISION/STATUS_MAP 値域が registry キーに存在）。
- choice 是正: scraper.yml = getReservationTargets() 全 11 + all、database.yml に meguro 追加。README に目黒区追記。
- `.claude/commands/new-scraper.md` の institutions テンプレートを実形式（`Institution[]` フラット配列）に修正。`packages/shared/CLAUDE.md` の数値ドリフト修正。

**PR 1-2: 動的シャード + cron 移動**（カナリア手順厳守）
- `common/shardMatrix.ts`（純関数 + unit test）: `playwright test --list` 出力から自治体別テスト数 → `ceil(count/density)` で matrix include JSON 生成（**テスト 0 の自治体は構造的に消滅**）。density デフォルト 5（dispatch input で可変）→ **100 → 約 43 シャード、~74 分/run 削減**。
- job 名 `Scrape <muni> (i/N)` 化、`prepare_retry` の正規表現更新、artifact 名を `failures-<phase>-<muni>-<i>-<N>` に（衝突防止で必須）、cache restore に `fail-on-cache-miss`。
- **cron を `23 8,20 * * *`（JST 17:23/05:23 起点）に変更** — 実測遅延 3.7h を足しても ota メンテ窓に到達しない。
- composite action 内の action を SHA ピンで最新に統一。`dependabot.yml` の github-actions に `directories: ["/", "/.github/actions/scrape"]`。
- カナリア: 朝 run 成功直後にマージ → 即 dispatch all で 43 シャード・retry 空・upsert 件数同水準を確認 → 夜 schedule 観察。失敗時 revert 一発。

**PR 1-3: 自己修復の完成**
- `common/horizon.ts` に `daysForHorizon()` 追加、`common/scrapeTest.ts` で `expectedDateCount` を horizon から**既定自動導出**（koutou は関数 horizon のため明示、bunkyo は導入前に実測校正）。導入前に `scripts/coverageReport.ts`（新規）で全自治体の distinct date 比を実測。
- `common/paginate.ts`: truncation イベントバッファ（シグネチャ不変）。`runScrapeTest` が partial 検出時にメッセージへ打ち切り根本原因を含める + 失敗レコード `context.paginationTruncations`。
- `common/errors.ts`（型付きエラー）+ `classifyFailure` v2（instanceof → error.code → TimeoutError name → 既存正規表現の順）。
- ota のメンテ窓ハードコード 2 箇所を削除し、registry の `maintenanceWindowJst` による共通ガード（窓内は transient で fast-fail）に置換。

**PR 1-4: 共通マップ + 期間テーブル util**
- `common/maps.ts`: `BASE_DIVISION_MAP`（午前/午後/夜間 + ""→INVALID）のみ共通化。**STATUS_MAP は共通化しない**（番号割当が自治体別契約）。
- `common/periodTable.ts`: webrGrand/sumida/edogawa に 3 コピーされた「日付ヘッダー列 × 部屋行 → RawSlot[]」抽出を共通化。

**PR 1-5a/b/c: /user/Home エンジン統合**（1 自治体 1 PR、実サイト検証込み）
- `engines/userHome.ts` 新設（entry: purpose/category、フィルタ開閉は edogawa 方式、テーブル更新待ちを追加、日付は期間ヘッダー起点 + addDays — edogawa の年跨ぎ潜在バグも解消）。XPath 廃止。discover も実装（3 自治体分が同時に片付く）。
- 順序: **edogawa**（現行ロジックが最も engine に近い）→ **sumida**（現在壊れているため必要なら先に `/repair-scraper tokyo-sumida`。FORCE_INCLUDE 経由で検証）→ **bunkyo は prepare のみ**（extract は詳細ページ + SVG 戦略が本質的に別物のため統合しない。CLAUDE.md の記述を正す）。
- 各 PR: `tools/repair/verify.ts` で代表施設 + `gh workflow run scraper.yml -f municipality=<x>` 全 target 検証。

**PR 1-6: meguro 正式統合**
- dispatch を日時を変えて 3〜5 回観測（合格: structural/unknown 0、60 分に余裕）→ registry の `scraperCiExcluded` 解除 → cron 対象化。同 PR で `viewer/utils/municipality.ts` を registry から導出化、README/database.yml 反映。不合格なら理由コメント付きで除外維持。
- 注: meguro 統合で D1 行数は +~3.8 万（統合後合計 ~11 万行）。差分書き込みなら日次書き込みへの影響は +数百行で Free 枠内（シードのみ分割投入）。

**PR 1-7: horizon 適正化**
- arakawa/kawasaki を `monthsAhead: 13 → 6`（viewer の maxDate と一致）。実測 366/427 日 → ~180 日、arakawa のページ送り約 52% 削減 + D1 総行数 −1.8 万。ホール系の 12-13 ヶ月先予約を製品として拾う場合は viewer maxDate 拡張とセットで戻す（backlog 化）。

### Phase 2: CD + ツールチェーン刷新（Phase 1 と並行可）

**PR 2-1: 自動デプロイ**
- `.github/workflows/deploy.yml` 新設: `push: branches [master]` → `ci` ジョブ（nodejs.yml を workflow_call 再利用）→ viewer / mcp-server（将来 +api）を `npx wrangler deploy` → スモークチェック（app.shisetsudb.com 200 + `#root`、mcp の無認証エンドポイント 200）。
- `CLOUDFLARE_API_TOKEN`（scope: Workers Scripts:Edit のみ）/ `CLOUDFLARE_ACCOUNT_ID` を secrets 追加。concurrency で直列化。初回は dry_run input で素振り。パスフィルタ無しの全デプロイ（冪等・各 1-2 分）。
- ロールバック: CF ダッシュボード instant rollback / 旧コミットから dispatch 再デプロイ。

**PR 2-2: TypeScript 7 移行**
- `@typescript/native-preview` 削除。`typescript` **5.9.3 は維持**（typescript-eslint/knip/organize-imports の API 提供役）+ npm alias **`"typescript7": "npm:typescript@7.0.x"`** 追加。
- 各パッケージ typecheck を `node ../../node_modules/typescript7/bin/tsc -p .` に変更（`.bin/tsc` は同名 bin 衝突で非決定のため不使用。CLAUDE.md に明記）。
- ルート tsconfig から `composite`/`references`/`ignoreDeprecations` を削除、各パッケージの空 `references: []` 削除。
- `dependabot.yml`: native-preview の ignore 削除、`typescript` の semver-major ignore 追加（7.1 + typescript-eslint 対応時に解除、と期限メモ）。
- 事前にブランチで全パッケージ素振り（GA は 2 月 dev 版から 4.5 ヶ月分の新チェックを含む）。

**PR 2-3: ESLint 強化 + Hooks 違反修正**
- 5 ページの匿名 default export を名前付きに（rules-of-hooks 発火の前提）。
- `Detail.tsx` を外側 `DetailPage`（id 検証 + Redirect のみ）と内側 `DetailContent`（全 hooks）に分割して違反を修正。
- `rules-of-hooks` / `exhaustive-deps` を **error** 化。匿名 default export 禁止の `no-restricted-syntax` 追加。
- 化石参照除去: eslint.config.ts / .prettierignore / vitest.config.ts の `graphql-client.tsx` と `**/main.tsx`。
- ESLint 10 は見送り、eslint の semver-major を dependabot ignore。

**PR 2-4: pre-commit 軽量化 + ツール更新**
- pre-commit の typecheck を「staged ファイルから対象パッケージを導出して絞り込み」に変更（ルート設定変更時は全パッケージへフォールバック）。まず現状を実測し、5 秒未満なら現状維持でよい判断基準も記載。
- lint-staged 16→17、prettier 3.9.x、knip 6.26.x へ更新。

### Phase 3: バックエンド刷新（Hasura + Auth0 M2M → D1 + 型付き API + GitHub OIDC、Free tier 設計）

**Go/No-Go ゲート（着手前）**: shisetsu-database から `searchable_reservations` ビュー定義と Auth0 JWT クレーム構造を持ち出し、`is_*_vacant`/`is_holiday` のセマンティクスを docs に記録。Auth0 access token に role/trial クレームが入っているか実トークンで確認。

**PR 3-0: アップロード境界の分離**（Hasura のまま実施可能な準備）
- `packages/scraper/tools/backend/hasura.ts` 新設: `fetchInstitutionKeyMap` / `upsertReservations` / `upsertInstitutions` の 3 インターフェースに集約。updateReservations/updateInstitutions/exportInstitutions は薄いオーケストレーションに。`scripts/run.ts` のインライン M2M 実装を削除し `tools/m2mToken.ts` に一本化。
- 境界契約 = `test-results/<muni>/*.json` の FileData 形状を CLAUDE.md に明文化。

**PR 3-1: packages/api 新設（読み取り）**
- 新パッケージ `packages/api`（CF Worker, D1 binding, custom domain api.shisetsudb.com）。mcp-server 同居は不採用（OAuthProvider が全パス占有）、viewer worker 同居も不採用（デプロイ独立性）。
- **D1 スキーマ（Free tier 最適化）**: institutions は 25 フィールドを 1:1 カラム化（fee 系 3 つのみ JSON TEXT）+ `idx(municipality, building_kana, institution_kana)`。reservations は **`PRIMARY KEY (institution_id, date)` の WITHOUT ROWID**（UNIQUE 用の暗黙インデックスを排除）+ `reservation` JSON TEXT + 書き込み時導出の `is_holiday`/`is_*_vacant` 4 フラグ（非インデックス）+ **二次インデックスは `idx(date)` 1 本のみ**。keyset カーソルは `(date, institution_id)`。`scrape_runs` テーブル（muni×run の取得時刻、~24 行/日）を追加 — 差分書き込みでは行の updated_at が「最終変化時刻」に意味が変わるため、「最終取得時刻」の表示ソースとして分離。
- エンドポイント: `GET /v1/institutions`（公開・フィルタ+カーソル）/ `GET /v1/institutions/:id`（公開）/ `GET /v1/institutions/:id/reservations`（要 JWT）/ `GET /v1/reservations/search`（要 JWT）/ `GET /v1/health`。レスポンスは現行型と同形。ID の path 検証は**緩い 8-4-4-4-12 hex**（非 RFC ID 17 件を弾かないこと。実バグ 9 の再発防止）。
- 認可: Auth0 JWKS 検証（`jose`）、anonymous/trial は reservations 系 403。institutions は公開 + `Cache-Control: max-age=300`。
- `packages/shared/apiTypes.ts`（DTO 型）と registry への `divisionGroups`（division → 時間帯対応。DB ビューに隠れていたセマンティクスのファイルファースト化）を追加。
- `db/queries.ts` は `(db: D1Database, params) => DTO` の**純関数**（モジュール状態なし）— mcp-server が直接 import して共用。
- テスト: `@cloudflare/vitest-pool-workers` で実 D1 エミュレーション。

**PR 3-2: 書き込み + dual-write（差分書き込み）**
- `PUT /v1/admin/reservations` / `PUT /v1/admin/institutions`。**チャンクは 500 行/リクエスト**（Workers Free の CPU 10ms に余裕、json_each 1 パラメータ方式でバインド 100 個制限を回避）。
- **差分 upsert**: `INSERT ... SELECT ... FROM json_each(?) ON CONFLICT (institution_id, date) DO UPDATE SET ... WHERE reservations.reservation <> excluded.reservation OR フラグ差分` — 無変化行を書き込みにカウントさせない。応答に D1 `meta.rows_written` を含め、scraper 側でログ集計（WHERE ガードの有効性を実測検証。効かない場合はサーバ側 read-diff 実装へ切替）。
- **書き込み予算ガード**: API が当日の rows_written 概算を追跡（scrape_runs に累計を記録）し、日次 8 万行を超えたら残チャンクを 202 で受け流して次回 run に委ねる（全行変化日への防御）。
- 認可: **GitHub Actions OIDC**（`id-token: write`、API 側で GitHub JWKS 検証 + repository/ref 制約）or `ADMIN_API_KEY`（ローカル用長乱数 1 本）。**Auth0 M2M・静的トークン・ローテーション workflow が全部消える**。
- `packages/scraper/tools/backend/d1Api.ts` 新設 + dual-write フラグで **Hasura と D1 に 2 週間並行書き込み**（差分書き込みなので Free 枠内）。パリティスクリプトで件数・サンプル行・4 フラグを突合。CF ダッシュボードで rows_written 実測を確認（試算 ~0.9 万/日）。
- **初期シード**: institutions（594 行）+ reservations を自治体 2 グループに分けて 2 日で投入（1 日あたり ≤8 万書き込み）。
- 検証: dispatch で tokyo-kita 1 自治体 → 全量 cron 並行稼働。

**PR 3-3: viewer 切り替え**
- `api/client.ts`（fetch ラッパ ~30 行）+ `api/endpoints.ts`（型付き 4 関数）を新設。`api/queries.ts`(302 行) / `api/graphqlClient.ts` / `utils/relay.ts`（atob ハック）を削除。
- `useGraphQLQuery` → `useApiQuery`、`usePaginatedQuery` は `{items, pageInfo}` 形状に。**TanStack Query は不採用**（4 クエリ・更新 1 日 2 回にキャッシュ無効化要件なし）。
- **このタイミングで sentinel バグを共通フック化して修正**（`useInfiniteScrollSentinel`、`rows.length < 50` で不発になる件）。「取得日時」表示は scrape_runs 由来（または行 updated_at =「最終変化時刻」と併記）に整理。
- MSW ハンドラを REST 化、E2E 確認、`VITE_API_ENDPOINT` へ切替。ロールバック = Workers version rollback（Hasura は PR 3-5 まで残す）。

**PR 3-4: mcp-server 切り替え**
- `wrangler.jsonc` に同一 D1 binding。`createServer({ data: DataSource, role })` に依存注入化し、`worker.ts` が**リクエストごとに** DataSource とロール判定を生成 → **シングルトン混線バグを型構造上不可能に**。
- `graphqlClient.ts` / `m2mToken.ts` 削除。`DataSource` は D1 直（worker）と HTTP（stdio/CLI）の 2 実装。`buildFieldSelection.ts` は結果オブジェクトの pick に置換。stdio の write は ADMIN_API_KEY。

**PR 3-5: Hasura 撤去**
- dual-write 削除、`tools/backend/hasura.ts` / `tools/request.ts` / `tools/m2mToken.ts` / `rotate-m2m-token.yml` 削除。secrets 整理（M2M_TOKEN / AUTH0 M2M 系 / GH_PAT_SECRETS_RW / GRAPHQL_ENDPOINT 削除 → 最終形: CLOUDFLARE_* + ADMIN_API_KEY のみ）。
- 撤去前に pg_dump で過去履歴をアーカイブ（R2 無料枠 10GB or ローカル）。撤去後 1 サイクルの cron 成功と viewer/mcp 動作確認 → shisetsu-database 側の停止・アーカイブ（別リポ作業）。
- （任意）90 日より古い行の月次 prune cron（Cron Triggers は Free で利用可。delete も書き込みカウントのため月 ~2 万行 = 枠内）。

### Phase 4: viewer 内部再構築

**PR 4-1: 幽霊・死にコード除去**（いつでも実施可、早いほど良い）
- `App.test.tsx` を実態に即した最小テストに書き直し（幽霊 mock 48 行を削除）。
- `components/Button/` 一式、`MediumBox`/`LargeBox`/`MediumLabel`/`LargeLabel`、`BaseBox` の未使用 `box()` ファクトリ、`env.d.ts` の `VITE_APP_TITLE` を削除。knip で残骸検出。

**PR 4-2: 残バグ修正**（3-3 の後）
- `useQueryParams` を `search` 変更（ブラウザ履歴）で再同期するよう修正し、テストの不可解な rerender ハック（TODO コメント付き）を除去。
- module-level `new Date()`（Detail.tsx:323、Reservation.tsx の minDate/maxDate）をレンダ時 or フック内評価に。

**PR 4-3: 構造整理**（3-3 の後）
- `Institution.tsx` / `Reservation.tsx` の共通「検索ページ」抽象を抽出。DataTable の tableCols/cardCols 統合。
- デザイントークンを theme.css に一元化し `constants/styles.ts` の重複値を参照化。Box 系のインラインスタイル再発明を CSS Modules 方針に整理。
- タイポ一括リネーム: `initlalContext` / `resevationSearchParams` / `handleInstitutoinSizesChange` / `INSTUTITON_SIZE_MAP` / `SnackBar`・`Snackbar` 不一致。

### Phase 5: リポジトリ衛生

**PR 5-1: ドキュメント・環境統一**
- CLAUDE.md 5 ファイル全面更新（「数値・列挙はソースを指す」原則。自治体一覧や enum 数はドリフトテストで守る）。
- `.node-version`（= 24）新設 + 全 workflow を `node-version-file` 参照に。`@types/node` を 24.x に。Node 26 LTS 化（2026-10）で一斉更新、とメモ。
- mcp-server の `^` レンジを exact 化（save-exact ポリシー統一）。未使用 Dockerfile 削除（復活条件をコミットメッセージに記録）。`.env.test` に「ダミー値専用」ヘッダ。

**運用: ブランチ掃除**（破壊的 — 各段階でユーザー確認を挟む）
1. merged 29 本 + develop（master への固有コミット 0 確認済み）→ 一覧提示 → 削除。
2. 化石 unmerged: renovate/* 11 本（2021 年）、旧 develop 宛 dependabot ~12 本 → 一覧提示 → 削除。
3. 残り 5 本（claude/*、feature/* 等）は各 head のログ付きで個別 Yes/No。ローカルも同様。

## 検証方法

- **各 PR 共通**: `npm run typecheck:all` / `lint:all --max-warnings=0` / `format:check:all` / `knip` / `test:unit`（scraper + shared）/ viewer vitest + E2E。PR 上で ci-success 緑（Phase 0-1 以降は required check）。
- **scraper 系 PR**: `tools/repair/verify.ts` による実サイト検証 + `gh workflow run scraper.yml -f municipality=<x>` での CI 実走 + 同エンジン他自治体 1 施設ずつ verify。PR 1-2 は「朝 run 成功直後マージ → dispatch all カナリア → 夜 schedule 観察」の手順を厳守。
- **バックエンド系 PR**: vitest-pool-workers のユニット + `wrangler dev` 疎通 + **dual-write 2 週間のパリティ突合（件数・サンプル行・4 フラグ）+ D1 rows_written 実測（試算 ~0.9 万/日以内、WHERE ガードの有効性確認）** + 実 Auth0 トークンでの 401/403/200 + MCP Inspector / CLI / 実クライアントでの 6 ツール実行（**非 RFC UUID の 17 施設が引けることも確認**）。
- **全体完了条件**: cron スクレイプが新基盤のみで 1 週間安定稼働、viewer/mcp が D1 経由で全機能動作、**D1 の日次 rows_written が Free 枠の 5 割未満で安定**、secrets が CLOUDFLARE_* + ADMIN_API_KEY のみ、ドリフトテスト全緑、CLAUDE.md が実装と一致。

## リスクと軽減策

| リスク | 軽減策 |
|---|---|
| scraper.yml 改修が定期スクレイプを壊す（最重要） | 純関数 + unit test、カナリア手順厳守、revert 一発で旧ロジック回帰 |
| `searchable_reservations` ビューとのセマンティクス差 | Phase 3 Go/No-Go ゲートでビュー定義を先に持ち出し、dual-write パリティテストで検証 |
| **D1 Free の日次 10 万行書き込み超過**（全行変化日・初期シード） | 差分 upsert（WHERE ガード）+ 書き込み予算ガード（超過分は次回 run へ持ち越し）+ シード 2 日分割 + rows_written 実測監視。恒久 escape hatch = Paid $5 昇格 |
| WHERE ガード付き upsert の無変化行が課金される可能性（D1 の計測仕様） | dual-write 初日に meta.rows_written で実測。課金される場合はサーバ側 read-diff（読み 500 万行/日で余裕）に切替 |
| expectedDateCount の誤検知で tracker Issue が汚れる | 導入前に coverageReport で実測校正、`() => 0` オプトアウト、導入後 1 週間監視 |
| TS7 GA の新規チェックでエラー噴出 | ブランチで素振りしてから PR 化。alias 並走は 7.1 対応で畳む暫定（2026 秋見込み） |
| sumida/エンジン統合の巻き添え | 1 自治体 1 PR、実サイト verify 必須、壊れている sumida は先に修理 |
| M2M_TOKEN 失効（Phase 3 完了まで） | PR 0-2 の月次ローテ再有効化 + 失敗時 Issue 化 |
| Auth0 access token にクレームが無い | PR 3-1 着手時に実トークンで確認。namespace claim へのフォールバック実装でロックステップ回避 |

## やらないこと（検討の上、不採用）

- **フロントエンドのフレームワーク乗り換え**: React 19 + wouter + CSS Modules は最新かつ最軽量。5 ルートの SPA に SSR/RSC の便益なし。
- **Workers Paid 前提の設計**: 実測 7.3 万行 + 差分書き込みで Free 内に収まるため。Paid は異常時の escape hatch に格下げ。
- **TanStack Query / ESLint 10（今は）/ STATUS_MAP 共通化 / webrGrand と userHome の完全統合 / wrangler versions 段階ロールアウト / cron 3 回化 / OTA STATUS_6 renumber**（それぞれ本文の根拠どおり）。

## 進め方の注意

- 各 PR は master ベースで作成。破壊的操作（ブランチ掃除・secret 削除・Hasura 停止）は実行直前に一覧を提示してユーザー確認。
- Phase 1-5（userHome）と Phase 3 は必ず実サイト・実環境での検証を挟む。既存の `/repair-scraper` フローと `tools/repair/verify.ts` を流用。
- Phase 3 の費用前提: Cloudflare アカウントが Free のままなら追加費用ゼロ。D1 の rows_written は CF ダッシュボードで日次確認する運用を dual-write 期間に確立する。
