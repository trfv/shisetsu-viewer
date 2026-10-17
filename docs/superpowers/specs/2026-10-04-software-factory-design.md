# software factory 設計

日付: 2026-10-04
状態: 設計承認済み。2026-10-17 に実データで見直し（「2026-10-17 の見直し」）、同日に GitOps を見直し（「GitOps の見直し」）

## 背景

このリポジトリには、運用を自動化する部品がすでにある。
失敗分類（`classifyFailure.ts`）、決定論の検証ハーネス（`tools/repair/verify.ts`）、盲検の spot check（`tools/spotcheck/`）、構造系失敗を集約する tracker Issue、dependabot である。
部品の設計品質は高いが、工程と工程をつなぐ起動者がすべて人間であり、人間が見ていない期間はラインが止まる。

2026-10-04 時点の実測は次のとおりである。

- 定期スクレイプは 2026-09-09 から 2026-10-03 までの約 25 日間、全回 failure だった（kita、sumida、ota が交互に落ちる）。誰も止めなかった。
- tracker Issue #1699 にはクラウド側のエージェントが着手したが、実サイトに届かずに止まった。kita の修復は 2026-10-04 の #1706 でようやく入った。
- master の oxfmt 崩れにより、全 PR の static-analysis が赤い。修正 PR #1700 は 2026-09-11 から未マージである。
- dependabot の PR は 2〜6 週間滞留している。
- 手書きタイトルの #1552（6 月）と #1584（7 月）は自動クローズの対象外で、放置されている。

壊れているのは部品ではなく部品の間であり、もう一つは信号の劣化である。
毎回赤い CI は、検知器として価値を失っている。

## 目的と成功基準

目的は**運用の自走**である。
スクレイパーの破損、master の赤、依存更新の滞留といった維持の仕事を、人間が起動しなくても検知から修復 PR、マージまで回す。
人間の役割は、承認と例外対応に縮める。

成功基準は、人間が数週間見なくても次が成り立つことである。

- 未追跡の失敗が、2 回の定期実行を超えて残らない。
- structural の検知から修復 PR までが 24 時間以内に収まる。
- dependabot PR の滞留が 7 日未満に収まる。
- 人間に届く通知は `factory:needs-human` だけになる。

機能開発の量産（Issue に書いた仕様からエージェントが実装まで進めること）は対象外とする。

## 決定事項

- **実行場所**：GitHub Actions。実サイトへは Actions から直接届かせ、sumida だけは既存の国内 proxy（Cloudflare Tunnel、`JP_PROXY_HOSTNAME`）を経由する。
- **自動マージ**：dependabot の低リスク更新と、整形のみの master 修正に加え、スクレイパー修復も条件付きで自動マージする。
- **認証**：`claude setup-token` で発行したサブスクの OAuth トークンを `CLAUDE_CODE_OAUTH_TOKEN` として secret に置く。手元の利用と枠を共有するため、ワークフロー側に暴走止めを置く。食い合いが問題になれば API キーに切り替える（`claude-code-action` の入力を差し替えるだけで済む）。
- **通知**：GitHub 通知のみ。新しい通知経路は増やさない。
- **制御方式**：リコンサイラ型（後述）。イベント連鎖型は、イベントを一つ取りこぼすとラインが止まったまま気づかれないため採らない。監督エージェント型は、判断が非決定的で監査できず、自動マージと組み合わせるには危険なため採らない。

## 全体構成

構成は三層である。

```
┌─ 観測層（既存）────────────────────────────────────────┐
│ 定期スクレイプ / Node CI / dependabot / spot check   │
└──────────────────────┬─────────────────────────────────┘
                       │ 実行結果、失敗レコード、PR 状態
┌─ 制御層（新設、決定論）───▼─────────────────────────────┐
│ factory.yml（スクレイプ後 1 日 2 回 + 手動）           │
│   reconcile.ts: 状態を読む → あるべき作業項目と比較   │
│     → Issue を upsert → 予算内でステーションを起動    │
└──────────────────────┬─────────────────────────────────┘
                       │ workflow_dispatch（作業項目 Issue 番号）
┌─ 作業層（ステーション）───▼─────────────────────────────┐
│ 各ステーション = 1 workflow。エージェントは中でだけ動く │
└────────────────────────────────────────────────────────┘
```

制御層の reconcile は、何が起きたか（イベント）ではなく、今どうなっているか（状態）に反応する。
冪等なので、何回巡回しても安全であり、取りこぼしは次の巡回で拾い直す。
判断はすべて決定論スクリプトが行い、エージェントは各ステーションの作業だけを担う。
これは既存の自己修復設計（決定論レーンと AI 修復レーンの分離）の延長である。

### 配置

- `packages/factory/`：新しい workspace。`reconcile.ts`、ステーション判定の純関数、ゲート判定の純関数と、それらの `node --test` テストを置く。
- `.github/workflows/factory.yml`：制御層。
- `.github/workflows/factory-<station>.yml`：作業層。
- `.github/workflows/factory-gate.yml`：自動マージのゲート。

## 作業キュー

作業項目は GitHub Issue で表す。
外部のストレージは使わない。

- 作業項目 1 件を Issue 1 件で表す。本文に重複排除キーを埋め込む（例 `<!-- factory:scraper-repair:tokyo-kita -->`）。
- 本文に隠し JSON で状態を持たせる（連続観測回数、最終観測 run、試行回数、最終試行時刻）。人間がスマホで Issue を開けば、そのまま工場の内部状態が読める。
- 状態はラベルで表す。

| ラベル | 意味 |
|---|---|
| `factory:queued` | 起動待ち |
| `factory:running` | ステーション実行中 |
| `factory:pr-open` | PR を出してゲート待ち、またはマージ待ち |
| `factory:needs-human` | 人間に渡す。所有者を assign して GitHub 通知で届ける |
| `factory:hold` | 人間が付ける。reconcile はこの項目に手を出さない |

クローズが完了を表す。
reconcile は、原因が観測されなくなった項目を、理由をコメントしてクローズする。

## ステーション

初期のステーションは 5 種である。

| ステーション | 起動条件（reconcile が判定） | 実行者 | 出口 |
|---|---|---|---|
| scraper-repair | 同じ自治体の structural または unknown の失敗が、2 回連続の定期実行で残る | エージェント（headless の `/repair-scraper`） | 修復 PR。失敗時は needs-human |
| master-red | master の Node CI が赤い | エージェント | 修正 PR |
| dependency | dependabot PR が開いている | 決定論。CI が赤い場合だけエージェントが原因を調べる | マージ、修正 PR、または needs-human |
| spot-check | 週 1 回、自治体を巡回する | 決定論（plan、observe、judge）とエージェント（凡例の補完のみ） | MISMATCH は needs-human |
| infra | sumida の proxy preflight が 530 または 403 を返す | なし | needs-human（Mac のスリープを疑う） |

「2 回連続」の閾値により、単発の失敗は retry と次回の実行に任せ、持続する失敗だけを作業にする。

spot check の MISMATCH を自動修正の対象から外すのは、spot check がスクレイパーから独立した検知器だからである。
検知器の判定で修正まで自動にすると、検知器の誤検知がそのまま本番データの変更になる。

infra はエージェントが直せない作業だが、ステーションとして明示しておく。
そうしておくと、静かなのが正常だからか、止まっているからかを区別できる。

## 信号の健全化

### 自治体別サマリ

Run Scraper は、1 シャードでも落ちると run 全体が failure になる。
この結論は、毎回赤いために信号として機能していない。

Run Scraper の最終ジョブ（現在の `collect_failures` を拡張する）が、`run-summary.json` を artifact として出力する。
中身は、自治体ごとの状態（`ok`、`transient`、`structural`、`infra`）、失敗した施設、run ID である。
reconcile はこのサマリだけを読み、run 全体の結論は見ない。

現在の単一 tracker Issue の upsert は廃止し、reconcile による自治体別の作業項目に置き換える。

### 失敗分類に infra を足す

sumida の proxy 断や Mac のスリープは、サイトの構造変化ではない。
現状ではこれらが structural や unknown に紛れ込み、修復エージェントの無駄打ちを招く。
`classifyFailure.ts` に `infra` を足し、preflight の失敗と proxy 経由のネットワーク断をこれに分類する。

### 相互監視

reconcile 自体が止まると、工場全体が静かに止まる。
Run Scraper と `factory.yml` は、起動時に相手の最終成功が 26 時間以上前でないかを確かめ、古ければ needs-human の Issue を立てる。

GitHub は、60 日間アクティビティの無い公開リポジトリの schedule workflow を自動で無効化する。
両方が同時に無効化されると相互監視は効かないので、無効化を知らせる GitHub からのメール通知を受け取れる状態にしておく。
普段は、factory の自動マージそのものがアクティビティになる。
GitHub Actions 全体の停止は検知しない。

## 自動マージのゲート

### 原則

エージェントの自己申告は証拠として扱わない。
PR 本文に「verify pass」と書かれていても、それはゲートの判断材料にしない。
ゲートの証拠は、別の決定論ジョブが PR の head で取り直したものに限る。

エージェントは、自分を縛るゲートのコードに触れられない。
これはパス制約で機械的に弾く。
目的は、テストが通らないのでテストを緩める、という近道を塞ぐことである。

### scraper-repair PR の条件

次をすべて満たす場合に限り自動マージする。

1. **差分の範囲**：変更ファイルが `packages/scraper/<対象自治体>/index.ts` または `packages/scraper/engines/*.ts` だけであり、変更行数が上限（初期値 40 行）以内である。
2. **禁止パス**：`packages/scraper/tools/repair/`、`packages/scraper/tools/spotcheck/`、`packages/scraper/common/classifyFailure.ts`、`.github/`、`packages/factory/` に触れていない。
3. **Node CI**：既存の `ci-success` が緑である。
4. **実走**：`factory-gate` が PR head で Run Scraper を対象自治体に dispatch し、全シャードが成功する。エンジンを修正した場合は、同じエンジンを使う全自治体で実走する。
5. **spot check**：4 の実走で D1 が更新された後、対象自治体の spot check がすべて MATCH である。MISMATCH、UNREACHABLE、UNMAPPED が 1 件でもあれば不可とする。

1 つでも満たさなければ、PR は開いたまま needs-human にし、落ちたゲートを PR にコメントする。

`factory-gate` は factory が作った PR だけに付くステータスである。
branch protection の必須チェックには加えないので、人間の PR には影響しない。
auto-merge を有効にするのは、gate の success を確認した reconcile だけである。

ゲート 4 と 5 で PR ブランチのスクレイプが本番 D1 に書くのは、既存の `/repair-scraper` フェーズ 4.5 と同じ運用である。
自動化によって頻度が上がる点だけが新しい。

### その他の PR

- **dependabot**：patch と minor で CI が緑なら自動マージする。major と、Cloudflare ツールチェイン群（wrangler、miniflare、`@cloudflare/vitest-pool-workers`）を含む更新は needs-human にする。マージがそのまま Workers のデプロイになるうえ、Cloudflare ツールチェインは同日公開の組で揃える必要があるためである。
- **master-red**：base で `format:fix:all` と `lint:fix:all` を決定論的に実行した結果と PR の差分が一致する場合に限り、自動マージする。それ以外は needs-human にする。

### 事後の安全網

自動マージの後、次の定期実行で同じ自治体が再び structural になるか、spot check で MISMATCH が出た場合、reconcile は revert PR を作ったうえで needs-human にする。
人間が行うのはマージ 1 回だけになる。

D1 への書き込みは upsert なので、誤った修復で入ったデータは次の正常なスクレイプで上書きされる。
被害は、修復から次の正常実行までの約半日分に収まる。

## 暴走止めと停止スイッチ

### 停止スイッチ

| 粒度 | 手段 | 効果 |
|---|---|---|
| 工場全体 | repo variable `FACTORY_MODE`（`off`、`observe`、`on`） | `observe` では、reconcile は Issue の upsert と報告だけを行い、ステーションの起動も auto-merge もしない |
| ステーション | repo variable `FACTORY_STATIONS`（例 `dependency,master-red`） | 列挙したステーションだけを起動する |
| 作業項目 | Issue に `factory:hold` | その項目には手を出さない |

`observe` で運用すると、`on` だったら何をしていたかが Issue に残る。
これを、自動化を有効にする前のドライランの証拠として使う。

### 予算の上限

- エージェントのジョブは `concurrency: factory-agent` で同時に 1 本までとする。
- エージェントの起動は 1 日 3 回までとし、reconcile が数える。
- 1 作業項目あたりの試行は 2 回までとする。2 回失敗したら needs-human にする。失敗後は 24 時間のクールダウンを置く。
- 1 回の実行に `--max-turns` と `timeout-minutes: 60` の上限を付ける。

## エージェントの実行環境

- `anthropics/claude-code-action` に `claude_code_oauth_token` を渡して使う。
- PR は Claude GitHub App のトークンで作る。`GITHUB_TOKEN` で作った PR では CI が起動せず、ゲート 3 が満たされないためである。
- エージェントのジョブには、本番への書き込み権限を渡さない。渡すのは、ブランチへの push と PR の作成だけである。マージ権限も、D1 への書き込み経路（OIDC、Cloudflare Access の secret）も渡さない。D1 に書くのは、ゲートが dispatch する Run Scraper だけである。
- 実サイトの DOM は信頼できない入力であり、プロンプトインジェクションの経路になりうる。エージェントにできるのはブランチへの push と PR の作成までで、その先はゲートで止まるので、被害はブランチの中に閉じる。
- `/repair-scraper` のライブ探索で使う Playwright MCP は、Actions 上で headless 起動する mcp-config を用意する。

### コマンドの非対話化

`/repair-scraper` と `/spot-check` は、現在 `AskUserQuestion` とローカルでの失敗レコードの展開を前提にしている。
両方に非対話モードを足す。

- 入力は作業項目 Issue の番号とする。
- 失敗レコードは、run-summary が指す artifact を自分で取得する。
- 人間に聞く場面では、Issue にコメントして needs-human で終了する。

### spot check の D1 読み取り

`tools/spotcheck/plan.ts` は `wrangler login` を前提に D1 を読んでいる。
これを api の公開 GET 経由の読み取りに切り替え、CI から認証なしで動くようにする。
公開 GET で必要な値が取れない場合は、D1 の read 専用 API token を secret に置く。

## 段階導入

各フェーズを 1 つの実装計画（1〜数 PR）とする。
前のフェーズの成功基準を満たすまで、次に進まない。

| フェーズ | 内容 | エージェント | 次に進む条件 |
|---|---|---|---|
| 0. 在庫一掃 | #1700 のマージ、tracker と #1552、#1584 の整理、滞留 dependabot PR の処理 | なし | master の CI が緑。開いている factory 系 Issue がすべて現状と一致する |
| 1. 信号 | `run-summary.json`、`infra` 分類、相互監視 | なし | 1 週間、サマリが毎回出る。sumida の proxy 断が `infra` に分類される |
| 2. 制御層 | `packages/factory`、reconcile、作業項目 Issue、停止スイッチ。`FACTORY_MODE=observe` で運用 | なし | 2 週間、起動していたはずの判断が Issue に記録され、人間が見て妥当と判断できる |
| 3. 低リスクのステーション | OAuth secret と GitHub App の設定。dependency と master-red を有効化 | あり | dependabot PR の滞留が 7 日未満。誤マージがない |
| 4. spot check の CI 化 | `plan.ts` の読み取り経路変更、週 1 回のステーション | 凡例の補完のみ | 週次実行が回り、MISMATCH が needs-human として届く |
| 5. scraper-repair（人間マージ） | headless の `/repair-scraper`、`factory-gate`。auto-merge は無効 | あり | gate が success を出した修復 PR を、人間が 3 件連続でそのままマージしてよいと判定する |
| 6. 修復の自動マージ | scraper-repair の auto-merge を有効化し、事後の revert PR を用意する | あり | 恒常運用 |

フェーズ 4 をフェーズ 5 より前に置くのは、修復の自動マージがゲート 5（spot check）に依存するからである。

## テスト方針

- reconcile の判定は純関数にする。入力はサマリ、Issue、PR の状態のスナップショットで、出力は作業項目と起動するアクションの一覧である。過去の実際の run（2026-09 の 25 日停止など）をフィクスチャにして `node --test` で固定する。
- `factory-gate` の差分範囲と禁止パスの検査も純関数にして、テストで固定する。
- ワークフロー自体は、フェーズ 2 の observe 運用で実地検証する。

## 未決事項

- Claude GitHub App をこのリポジトリにインストールするか、PAT を使うか。フェーズ 3 の計画で決める（既存の `GH_PAT_SECRETS_RW` は用途が違うので流用しない）。
- `--max-turns` の具体値と、差分上限 40 行の妥当性。フェーズ 2 の observe 運用と、フェーズ 5 の人間マージの実績から調整する。

## 2026-10-17 の見直し

2026-10-04 から 2026-10-17 までの 13 日間、master へのコミットは 1 件もなかった。
この期間の Run Scraper は 29 回中 13 回が failure であり、設計の前提がそのまま再現した。

この期間の実データで、次の判断を確かめた。

- kanagawa-kawasaki の structural の tracker（#1714、#1718）は、どちらも次の定期実行で自動クローズされた。即時に修復を起動していれば 2 回とも無駄打ちになっていたので、「2 回連続」の閾値は妥当である。
- tokyo-sumida は 3 回連続で失敗したが、tracker は立たなかった。proxy 断がどこにも記録されないので、`infra` 分類が必要である。
- dependabot PR は 13 日間滞留し、人間が一括で処理した。dependency ステーションの効果がいちばん大きい。
- 直近の修正 #1725、#1727 は、どちらも失敗として現れないデータ欠落だった。run-summary では検知できないので、spot-check ステーションの価値は想定より大きい。

これを受けて、次のとおり変更する。

- **作業項目のキーはスクレイパー単位にする。** #1668 で予約システム単位への一般化が入り、1 つの区に複数のスクレイパー（`tokyo-kita`、`tokyo-kita-cocokita`、`tokyo-kita-genkiplaza`）がある。キーは `scraper-repair:<スクレイパーのディレクトリ名>` とし、ゲート 1 の差分範囲も `packages/scraper/<スクレイパー>/` と `packages/scraper/engines/*.ts` に読み替える。
- **フェーズ 1 の 1 週間の待ちをなくす。** サマリが毎回出ることは、フェーズ 2 の observe 運用の 2 週間で同時に確かめられる。
- **フェーズ 3 を 3a と 3b に分ける。** 3a は決定論だけの dependency ステーション（patch と minor の自動マージ）とし、エージェントも OAuth も使わない。3b は OAuth と GitHub App を入れた master-red とする。こうすると、未決事項の GitHub App の判断を待たずに 3a を始められる。3a では `GITHUB_TOKEN` でマージするので、その push は他の workflow を起動しない。Workers Builds は Cloudflare 側で動くのでデプロイには影響しない。
  ただし、`.github/workflows/` を変える更新（github-actions グループ、例 #1717）は、`workflows` 権限の無い `GITHUB_TOKEN` では merge できない見込みである。3a ではこれを needs-human に回すか、3b で GitHub App のトークンを入れてから扱う。dependabot の分類（`classifyDependabotPr`）はリスクの判定に留め、この制約は実行側で扱う。

## GitOps の見直し（2026-10-17）

Anthropic の [Redesigning source control](https://www.anthropic.com/engineering/redesigning-source-control) を参照し、マージから本番までの流れを見直した。
記事は、エージェントが主要な書き手になった規模で git、ミラー、マージキュー、全行レビューが限界に達したことと、その対処（サーバー中心のソース管理 Scion、意味的な承認条件を持つレビュー基盤）を報告している。
このリポジトリとは規模が数桁違うので、仕組みではなく判断の根拠だけを持ち込む。

### 持ち込まないもの

- **git の置き換えと部分クローン**：記事の動機はチェックアウトの通信量とミラーの運用負荷である。このリポジトリのクローンは数秒で終わり、同時に動くエージェントは 1 本なので、同じ限界は来ない。
- **マージキューと base 追従の必須化**：記事は、人間向けのマージキューはエージェントの規模では意味をなさないとし、並行変更の衝突はマージ後のテストとエージェントによる修正で吸収している。branch protection の `strict: false`（base への追従を求めない）は、この方針と一致するので維持する。
- **ゲートへの AI レビューの追加**：記事は、敵対的レビューを課すとエージェントが過剰な防御と複雑さを足すことがあったと報告している。ゲートは決定論のまま保つ。

### 変更クラスによる承認条件

記事のレビュー基盤は、承認条件を意味的に定義し、コメントだけの変更と論理の変更を区別して、人間のレビュー対象を絞っている。
現在の設計では、自動マージの条件が scraper-repair、dependency、master-red の各節に別々に書かれている。
これらは、どれも「変更の種類によって、マージが本番に何をするかと、誰が承認するかが決まる」という同じ判断に帰着する。
そこで、PR の差分から**変更クラス**を決める純関数 `classifyChange` を置き、承認条件をクラスごとの表として一か所にまとめる。

| 変更クラス | 判定 | マージが本番にすること | 承認 |
|---|---|---|---|
| format | base で `format:fix:all` と `lint:fix:all` を実行した結果と差分が一致 | viewer の再デプロイのみ | 自動 |
| deps | dependabot の patch、minor（既存の `classifyDependabotPr` の結果に従う） | 依存を含む Worker の再デプロイ | 自動。1 回の reconcile で 1 本まで |
| scraper | `packages/scraper/<スクレイパー>/` だけ | 次の定期実行から D1 の値が変わる | ゲート 1〜5 を満たせば自動（フェーズ 6） |
| engine | `packages/scraper/engines/*.ts` を含む | 同じエンジンの全スクレイパーが変わる | ゲート 1〜5 を全該当自治体で満たせば自動（フェーズ 6） |
| institutions | `packages/scraper/data/institutions/**` | Database ワークフローが全自治体へ upsert する | 人間 |
| contract | `packages/shared/**`、`packages/api/**` | api と mcp-server が並行して再デプロイされ、順序を制御できない | 人間 |
| migration | `packages/api/migrations/**` | `deploy:ci` が D1 にマイグレーションを当てる | 人間 |
| workflow | `.github/**`、`packages/factory/**`、ゲートが使う検証ツール | factory 自身の振る舞いが変わる | 人間 |
| other | 上のどれにも当たらない | 不明 | 人間 |

1 つの PR が複数のクラスに当たるときは、承認がいちばん重いクラスに従う。
contract を自動マージから外すのは、クライアントとサーバーの契約を同時に変える PR が、旧サーバーと新クライアントの組み合わせで誤動作した前例（PR #1661、D1 の日次読み取りが枠の 5.9 倍になった）があるためである。

人間が承認するクラスでも、見るのは差分の各行ではなく意図である。
factory が作る PR の本文には「意図」欄（どの症状を、どの前提を変えて直すか）を必須にし、人間はそれが作業項目の症状と一致するか、差分が意図の外に及んでいないかを確かめる。
フェーズ 5 の「そのままマージしてよい」の判定も、この 2 点で行う。

### マージ後の状態の収束

このリポジトリでは、master へのマージがそのまま本番への作用になる。
経路は三つある。

- Workers Builds が 3 つの Worker をデプロイする。api の `deploy:ci` は、その前に D1 マイグレーションを当てる（#1724、まだ一度も走っていない）。
- 施設マスタの変更で、Database ワークフローが D1 に upsert する。
- scraper の変更は、次の定期実行から D1 の値を変える。

どれも push 型であり、成否を reconcile は見ていない。
とくに Workers Builds は Cloudflare 側で動き、api と mcp-server のビルドは PR のチェック欄に出ない。
人間がマージする間は、マージした本人が直後に確かめていた。
自動マージが入ると、マージは成功したがデプロイが失敗した状態を、誰も見なくなる。

GitOps の本来の形は、git に宣言した状態と実際の状態を比べて差を埋めることである。
現在の reconcile は作業項目だけを収束させているので、これをデプロイの状態にも広げる。
reconcile は毎回次を確かめ、master へのマージから 30 分を過ぎても差があれば、needs-human の作業項目 `deploy-drift:<対象>` を立てる。

- api の `/v1/health` の `version` が、api の監視パスに触れた master の最新コミットと一致する。
- viewer と mcp-server の最新ビルドが成功している（check run、または Workers Builds の builds API の GET）。
- master への push で起動した Database ワークフローの直近の実行が成功している。

差を自動では埋めない。
ビルドを API から起動する手段が今のところ無い（2026-10-17 に試し、`10000 Authentication error` だった）うえ、デプロイ失敗の原因はトークンの権限やマイグレーションの不整合のように人間が見るべきものが多いためである。

### 並行変更の衝突の扱い

記事は、グローバルなロックを置かずに衝突を許し、マージ後のテストと修正で吸収している。
このリポジトリでも同じ方針を採り、衝突の頻度を速度で抑える。

- dependabot の自動マージは、1 回の reconcile で 1 本までとする。lockfile を触る PR を続けてマージすると、テキストの衝突は無くても組み合わせで壊れることがある。1 本ずつなら、壊れたときに原因の PR が一つに決まる。
- マージ後に master が赤くなれば master-red が拾う。原因の PR が自動マージしたものであれば、事後の安全網と同じく revert PR を作る。

### ref を増やさない

記事は、全サーバーで合意すべきグローバル状態を減らすために、master とリリースブランチ以外の ref を原則として使わない。
このリポジトリで ref を減らす理由は別にある。
viewer の Workers Builds は全ブランチで版をアップロードするので、放置されたブランチは未デプロイの版として残り、`wrangler secret put` を拒否させる。
また、工場の状態の所在は作業項目 Issue と master の 2 か所に限りたい。

- 長命のブランチは master だけとする。
- factory のブランチは `factory/<作業項目キー>` とし、1 作業項目に 1 本だけ持つ。マージ時の削除は repo 設定（`delete_branch_on_merge`）で済んでいる。
- 作業項目をクローズするとき、reconcile は対応する `factory/` ブランチが残っていれば削除する。

### 段階導入への反映

- **2-C に変更クラスの observe を足す。** `classifyChange` を実装し、人間の PR も含む全 PR に `change:<クラス>` ラベルを付ける。2 週間の observe で、人間の判断とずれる分類が無いかを見る。ラベルを付けるだけなので、副作用は無い。
- **3a の前提にデプロイの収束判定を置く。** 自動マージを始める前に、マージ後を見る仕組みを用意する。3a に進む条件に「`deploy-drift` の判定が observe で 1 週間誤報なく動いている」を足す。
- **3a の dependency は 1 回 1 本にする。**

記事の「スーパーファン」（各コンポーネントを Claude に監視させ、通常のアラートで見つけにくい異常を拾う）は、spot-check ステーションがすでに近い役割を持つ。
観測専用の監視エージェントを足すかは、OAuth の枠を手元と共有している間は決めず、フェーズ 6 の後に検討する。
