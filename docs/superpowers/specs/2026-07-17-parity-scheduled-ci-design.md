# Hasura / D1 パリティ突合の定期実行 設計

- 日付: 2026-07-17
- 対象: `packages/scraper/tools/backend/parity.ts`、`.github/workflows/scraper.yml`
- 背景: Phase 3 バックエンド刷新（`docs/superpowers/plans/2026-07-12-backend-rebuild.md`）の「2 週間パリティゲート」

## 目的

dual-write 中の Hasura と D1 の予約データが一致し続けていることを、人手のコマンド実行ではなく CI で毎日観察できるようにする。
PR 3-3（viewer 切替）に進む判断材料を、Actions の履歴と GitHub Issue の形で自動的に蓄積することがゴールである。

現状、パリティ突合はローカルで `node --env-file=.env tools/backend/parity.ts` を手で叩く運用になっている。
2 週間毎日これを続けるのは現実的でなく、実行漏れがそのままゲート判断の穴になる。

## スコープ

やること:

- `parity.ts` に機械可読なレポート出力を追加する
- `scraper.yml` の末尾に `parity` job を追加し、既存の定期実行（`cron: 23 8,20 * * *`）に相乗りさせる
- 乖離をトラッカー Issue として upsert する

やらないこと:

- 独立したワークフローファイルの新設（スクレイプ完了後の最終状態を突合したいので、scraper.yml に相乗りする）
- 乖離の自動修復
- `packages/api` の export エンドポイントへの日付パラメータ追加（後述の突合窓はクライアント側で解決する）

## 認証の前提（実測で確定）

| 対象 | CI での認証 | 根拠 |
| --- | --- | --- |
| Hasura | `secrets.GRAPHQL_ENDPOINT` + `secrets.M2M_TOKEN` | M2M トークンの role は `machine`。実プロダクションへの probe で `reservations` / `institutions` の select が 200 で通ることを確認済み |
| D1 API | GitHub OIDC（`id-token: write`） | `tools/backend/d1Api.ts` の `getAuthHeaders()` が `ACTIONS_ID_TOKEN_REQUEST_URL` の有無で OIDC / `ADMIN_API_KEY` を自動で切り替える |

**新しい secret の追加は不要である。**

引き継ぎメモには「parity.ts の Hasura 読みは `HASURA_ADMIN_SECRET` で実行」とあったが、その制約の実体は `holidays` テーブル（admin のみ select 可）であり、`holidays` を引かない parity.ts には効かない。
`tools/request.ts` の `getAuthHeaders()` は `HASURA_ADMIN_SECRET` があればそれを優先し、無ければ M2M Bearer にフォールバックするため、CI ではその env を渡さなければ自動的に M2M 経路に乗る。
ローカル実行時に `HASURA_ADMIN_SECRET` が要るのは、`.env` に `M2M_TOKEN` が無い（`scripts/run.ts` が Auth0 から都度取得する設計の）ためである。

## 設計

### 1. `tools/backend/parity.ts`

三つの変更を加える。

**NUL バイトの除去。**
`key()` が `` `${r.institution_id}\0${r.date}` `` という NUL 区切りの文字列を組み立てており、この 1 バイトのために git がファイル全体をバイナリと判定し、差分がレビューできない。
コミット `fe5e480`（PR3-2）の時点から入っている。
`institution_id` は UUID、`date` は ISO 日付なので、区切りをスペースにしても一意性は保たれる。

**`fetchAllHasura` の取り込み。**
自治体ごとに Hasura を叩く旧実装をやめ、全 `reservations` を 1 回だけページングで取得し、`institutions` から作った `institution_id → municipality` の写像でクライアント側に振り分ける。
`reservations` には institution へのリレーションが無いこと、`searchable_reservations` は音楽室フィルタで母集団がずれることが理由である。
CI の実行時間に直結するため、この版を前提とする。

**突合窓の統一（実データで判明した必須の修正）。**
`fetchAllHasura` は Hasura を `date >= 本日` で絞る一方、D1 の `exportReservations()` は**全期間を dump する**。
このため両側の母集団がずれ、実プロダクションでの突合は偽陽性で埋まる:

- 過去日（例 `2026-07-15`）の D1 行が全部 `EXTRA in D1` になる（D1 は過去日も保持、Hasura は本日以降しか引かない）。
- 遠い未来日（例 kawasaki の `2027-09-10`）の Hasura 行が `MISSING in D1` になる。これは dual-write の漏れではなく、Hasura に残った古い遺物で、どのスクレイパーの現在の取得地平（kawasaki でも本日 + 13 ヶ月 = 2027-08 まで）も届かない日付である。D1 は 2026-07-15 に空から作り直したのでこの種のレガシー行を持たない。

対策として、突合窓を**両側そろえて** `[本日, endOfMonth(本日) + 5 ヶ月]` に限定する。
上限を 5 ヶ月にする根拠は、全自治体の `horizon.monthsAhead` の**最小が 5**（中央 / 北 / 江戸川 / 大田）だからである。
全自治体で「両側とも確実に取得しているはず」の範囲だけを比べることになり、偽陽性が原理的に出ない。
実装:

- Hasura クエリに `date: { _lte: $to }` を追加する（`$to` = 上限日）。
- D1 側は `exportReservations()` の戻り行を `本日 <= date <= 上限` でクライアントフィルタする（api の export エンドポイントは変えない）。

副次効果として、上限を入れると Hasura の取得行数が大きく減り（arakawa/kawasaki は 13 ヶ月先まで持つ）、下記のタイムアウトも起きにくくなる。

**Hasura 全件取得のタイムアウト耐性。**
`fetchAllHasura` の offset ページングは、実プロダクションで単一リクエストが 5 分ストリームタイムアウト（`UND_ERR_INFO: fetch failed`）を踏むことがある。
`tools/request.ts` のリトライは HTTP 5xx のみが対象で、この fetch レベルのタイムアウトは拾わない。
CI では parity 実行 step 自体を `for attempt in 1 2 3` のリトライループで包む（scraper.yml の Playwright インストールと同じ実績パターン）。
これは job のインフラ堅牢性の問題であり、突合ロジックとは独立に扱う。

**`PARITY_REPORT <json>` 出力の追加。**
自治体ごとに以下を集計し、最後に stdout へ 1 行の JSON として出す。

```
{
  target: string,        // 例 "tokyo-kita"
  hasuraRows: number,
  d1Rows: number,
  missing: number,       // Hasura にあり D1 に無い
  extra: number,         // D1 にあり Hasura に無い
  diff: number,          // 両方にあるが reservation が異なる
  samples: string[]      // 先頭 5 件の行キー（`MISSING in D1: <key>` 等の形式）
}
```

既存の人間向けログ（`PARITY OK ...` / `PARITY FAIL ...`）と `exit 1` は維持する。
ローカル実行の使い勝手を変えないためと、workflow 側が JSON だけを見ればよい構造にするためである。
この形は `tools/repair/verify.ts` の `REPAIR_VERIFY_RESULT <json>`（決定論的ハーネスが JSON を吐き、上位が解釈する）という既存の型に倣っている。

集計部は純粋な関数として切り出し、`node --test` でユニットテストを書く。

### 2. `.github/workflows/scraper.yml` の `parity` job

```yaml
parity:
  name: Hasura/D1 parity
  needs: [scrape, prepare_retry, retry_scrape]
  if: ${{ !cancelled() && vars.D1_API_ENDPOINT != '' }}
  permissions:
    contents: read
    id-token: write
    issues: write
```

- `needs` と `if: !cancelled()` は `collect_failures` job と同じ条件である。retry が無い run でも走り、retry で直った分を乖離として誤検出しない。
- `vars.D1_API_ENDPOINT` が空なら job ごとスキップする。dual-write のキルスイッチを引いたときにパリティだけが騒ぎ続ける事態を避ける。
- 対象は常に全自治体とする。Hasura 側は全件を 1 回で取るので、自治体を絞ってもコストはほとんど変わらない。CI 除外自治体（目黒 / 墨田 / 杉並）の状態もここで可視化される。
- parity 実行 step は `continue-on-error: true` で受け、後続の github-script step が Issue を upsert する。job 自体は緑を保つ。

### 3. トラッカー Issue

`collect_failures` と同じ upsert パターンを使う。

- マーカー: `<!-- parity-tracker -->`
- タイトル: `[parity] Hasura と D1 の乖離`
- 本文: 自治体別の表（Hasura 件数 / D1 件数 / MISSING / EXTRA / DIFF）＋ 各自治体のサンプルキー
- 乖離ゼロなら、既存の Issue にコメントして自動クローズする
- Issue body は 65,536 文字上限があるため、`collect_failures` と同様に行数上限を設けて省略表記にする

## エラーハンドリング

parity step には `continue-on-error: true` を付けるため、そのままでは乖離もインフラ障害もどちらも緑になってしまう。
両者を切り分ける判定は、後続の github-script step が `PARITY_REPORT` 行の有無で行う。
レポートが出ていれば突合そのものは完遂しており（乖離があっても観察としては成功）、出ていなければ突合に到達していない（障害）。

| 事象 | `PARITY_REPORT` | 振る舞い |
| --- | --- | --- |
| 乖離あり | あり | Issue を upsert。job は緑 |
| 乖離なし | あり | Issue があればコメントしてクローズ。job は緑 |
| Hasura / D1 への接続失敗 | なし | Issue は触らず、github-script が `core.setFailed()` で job を赤にする |
| `D1_API_ENDPOINT` 未設定 | — | job スキップ |

## 検証

1. `npm run test:unit -w @shisetsu-viewer/scraper` — 集計部のユニットテスト
2. `npm run typecheck:all` / `npm run lint:all`
3. ローカルで実プロダクションに対し parity を 1 回実行し、`PARITY_REPORT` の形を目視確認する
4. `workflow_dispatch` で 1 回まわし、Issue が実際に立つこと、乖離解消時にクローズされることを確認する

## 補足

PR は master ベースで作る（Phase 3 の各 PR は独立 revert 可能であること、という既存の方針に従う）。
現在のブランチ `fix/rebuild-wrangler-db-id` にある `fetchAllHasura` の未コミット変更は、この PR に取り込む。
