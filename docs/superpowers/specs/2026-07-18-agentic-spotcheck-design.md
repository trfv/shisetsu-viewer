# agentic spot check（実サイトと D1 の実地照合）設計

- 日付: 2026-07-18
- 対象: `.claude/commands/spot-check.md`（新設）、`packages/scraper/tools/spotcheck/`（新設）、`.claude/commands/repair-scraper.md`（改修）
- 背景: Slack engineering の agentic testing 記事[^slack]の知見適用。直近の用途は Issue #1622（Hasura/D1 パリティ乖離 531 件）の原因層の切り分け

[^slack]: <https://slack.engineering/agentic-testing-where-agents-fit-in-the-e2e-testing-stack>。決定論的テストを CI の基盤に据え、エージェントは低頻度の標的型検証に限定する二層戦略。エージェント実行は Playwright MCP のライブビュー方式が最も堅牢（失敗率 0〜12%）で、コストの大半は既読スナップショットの再送信だったという実測を含む。

## 目的

スクレイパーが成功ステータスで完走しながら誤ったデータを保存する silent failure を、実サイトの表示と D1 の保存値を突き合わせて検出できるようにする。

現在の検証層は二つある。
スクレイプテストは「スクレイパーのコードが期待どおりの手順で動くか」を検証し、パリティ CI（`tools/backend/parity.ts`、Issue へ upsert）は「Hasura と D1 が一致するか」を検証する。
どちらも「保存されたデータが現実と一致するか」は検証しない。
セレクタは合っているがステータス記号の解釈を誤っている場合や、書き込み経路で行が黙って落ちる場合、既存の二層はどちらも緑のまま通過する。
**spot check** はこの空白を埋める第三の検証層であり、エージェントが実サイトの表示を人間のように読み、決定論スクリプトが D1 の保存値と突合する。

三層が揃うと、乖離の原因層を切り分けられる。
実サイトと D1 が食い違い、パリティ CI が Hasura と D1 の一致を示していれば、スクレイパーの解釈の誤りである。
実サイトと Hasura が一致し D1 だけ欠けていれば、dual-write の書き込み経路の欠陥である。

## スコープ

やること:

- `/spot-check` slash command と決定論ヘルパー 2 本（`plan.ts`、`judge.ts`）の新設
- `repair-scraper.md` への 2 点の追記（ライブ探索のエスカレーション基準、コスト規律）

やらないこと:

- 定期実行化。自己修復と同じく「定期実行は決定論レーン、AI は手動起動レーン」の分離原則を保つ。将来 schedule 化する場合も本設計の手順書をそのまま流用できる
- 本番スクレイピングのエージェント化。エージェント実行は同一手順の再現率が約 2 割しかなく[^slack]、日次の全自治体巡回には再現性とコストの両面で適さない
- Hasura への新規依存。Hasura は PR 3-5 で撤去されるため、突合相手は D1 のみとする。Hasura との差は既存パリティ CI の結果（tracker Issue）を参照して切り分ける
- 統計的な保証。spot check は少数サンプルの実地照合であり、「乖離が存在しない」ことは示せない。目的は silent failure の存在検出と原因層の切り分けである

## アーキテクチャ

決定論スクリプトでエージェントを挟む 3 段パイプラインとする。
エージェントの仕事を「実サイトの表示を読んで記録する」ことだけに絞り、サンプル選定と判定は AI を含まない決定論スクリプトが行う。
`tools/repair/verify.ts` と同じ役割分担であり、Slack の実測でエージェントの信頼性とコストが最も良かった構成（MCP ライブビュー + ゴール限定 + 文脈最小化）に一致する。

### 段 1: `tools/spotcheck/plan.ts`（決定論）

サンプルを選定し、D1 から期待値を取得して 2 ファイルを出力する。

サンプル選定は乖離駆動を既定とする。
パリティ tracker Issue（マーカー `<!-- parity-tracker -->`）の本文から `MunicipalityReport[]` を復元し、`MISSING in D1` のサンプルキー（`institution_id` + `date`）を対象にする。
乖離が無い、または Issue が無い場合は、CI 対象自治体の予約を持つ施設からの乱択にフォールバックする。
乱択といっても `Math.random` は使わず、ソートと先頭 N 件で決定論的に選ぶ（同じ日に再実行したとき同じサンプルを引き、比較可能にするため）。

引数は次のとおり。

- `--municipality <slug>`：対象自治体を絞る。`scraperCiExcluded` による除外より優先する（`resolveParityTargets` と同じ規則）
- `--key <institution_id>:<date>`：サンプルを明示指定する。複数可
- `--samples <N>`：件数。既定 8、上限 12。上限はコスト規律によるハードキャップで、引数では超えられない

D1 アクセスは `npx wrangler d1 execute shisetsu-db --remote --json --config packages/api/wrangler.jsonc` に統一する。
`institution_id` から施設名と部屋名（`building_system_name` / `institution_system_name`）への解決も同経路で行う。
新規 secret は増えない（wrangler login 済みが前提）。

出力は 2 ファイルに分ける。

- `test-results/_spotcheck/plan.json`：エージェント用。自治体、施設名、部屋名、日付だけを含み、**期待値を含めない**
- `test-results/_spotcheck/expected.json`：judge 用。各サンプルの D1 の reservation JSON、または「D1 に行なし」

サンプルは自治体をまたぎうるため、出力ディレクトリは自治体別に切らず `_spotcheck/` 直下の 1 世代とする。
plan.ts は実行のたびにディレクトリを消してから書く（verify.ts の失敗レコード処理と同じ規約）。

期待値をエージェントに見せないのは**盲検**のためである。
期待値を知ったエージェントは観測がそれに引っ張られ、silent failure 検出器としての独立性を失う。

### 段 2: エージェント（`/spot-check` コマンド、Playwright MCP）

plan.json の各サンプルについて、実サイトの空き状況ページへ到達し、表示を記録する。

- サイト URL は `packages/scraper/<municipality>/index.ts` を Read して特定する。ただし STATUS_MAP による解釈は行わず、**表示されている生の記号と文言**（「○」「×」「予約あり」など）をそのまま記録する
- ページに凡例（「○=空き」など）があれば併せて記録する。判定段で記号の意味の一次根拠になる
- サンプルごとにスクリーンショットを 1 枚保存し、証跡とする
- 結果は `observed.json` にサンプルごとに逐次 Write する（形式: 施設、部屋、日付、区分ごとの記号、凡例、URL、スクリーンショットパス）

判定はしない。
到達と読み取りだけがエージェントの仕事である。

### 段 3: `tools/spotcheck/judge.ts` + `symbolMap.ts`（決定論）

expected.json と observed.json を突合し、標準出力の末尾に `SPOTCHECK_RESULT <json>` を 1 行出す（verify.ts と同じ規約）。

記号から意味への解釈は、scraper の STATUS_MAP を import しない。
STATUS_MAP 自体の誤りを検出したいのに、それを判定に使えば同じ誤りを再現して MATCH を出してしまうからである。
代わりに spotcheck 独自の記号表（`symbolMap.ts`。○、△、×、−など予約システムで通用している記号の対応）を持ち、エージェントが取得した凡例があれば凡例を優先する。
未知の記号は UNMAPPED として人間の確認に回す。

比較は enum の粒度ではなく、空き系、埋まり系、対象外の 3 カテゴリで行う。
記号と enum の細かい対応まで判定に含めると、記号表の側の誤りで偽陽性を量産するためである。
レポートには D1 の enum 値と観測記号の両方をそのまま載せ、カテゴリ判定の根拠を人間が追えるようにする。

判定種別は次のとおり。

| 判定 | 意味 |
| --- | --- |
| MATCH | サイト表示と D1 のカテゴリが一致 |
| MISMATCH | 両方に値があるがカテゴリが食い違う（スクレイパー解釈バグの一次候補） |
| SITE_HAS_DATA_D1_MISSING | サイトに表示があるのに D1 に行が無い（書き込み経路バグの一次候補） |
| SITE_NO_DATA | サイトにその日付の表示が無く、D1 にも行が無い（Hasura 遺物仮説を支持） |
| SITE_NO_DATA_D1_STALE | サイトにその日付の表示が無いのに D1 に行がある（D1 側の陳腐化。要調査） |
| OUT_OF_WINDOW | サイトの予約受付期間の外で表示自体が存在しない（SITE_NO_DATA の特殊形として区別） |
| UNREACHABLE | 該当ページに到達できなかった（構造変化の疑い。/repair-scraper へ接続） |
| UNMAPPED | 観測記号が記号表にも凡例にも無い |

### Issue #1622 への適用

有力仮説は「Hasura は累積で、dual-write 開始前の行やスクレイプ窓外の行が残り続けるため、D1 に永久に来ない」である。
MISSING キーをサンプルにした spot check はこの仮説を直接判定する。
たとえば koutou の「D1 の最終日 2026-11-30 に対し欠落が 12-01」というケースは、サイトが 12-01 を表示していなければ SITE_NO_DATA（遺物仮説の支持）、表示していれば SITE_HAS_DATA_D1_MISSING（書き込み経路の実バグ）に落ちる。
初回の実運用はこの乖離サンプルで行い、結果を本 spec に追記する。

## エラー処理

- wrangler 未ログインや D1 接続不可のとき、plan.ts は即エラーで停止し、`! npx wrangler login` の案内を出す。エージェントは plan.json が無ければ先へ進まない
- ナビゲーション失敗は 1 サンプルにつき試行 2 回まで。以降は UNREACHABLE として記録して次のサンプルへ進む。失敗の深追いはコストとフレークの主因である[^slack]
- UNREACHABLE が過半のときは、個別データの問題ではなくサイト構造変化の疑いとして報告し、/repair-scraper の起動を提案する
- Turnstile 採用サイト（杉並区など）は到達できず UNREACHABLE になるだけで、パイプラインは壊れない

## コスト規律

Slack の実測では、コストの大半は既読スナップショットの再送信だった[^slack]。
コマンドに次を明記する。

- 1 実行の上限 12 サンプル（plan.ts がハードキャップ）
- サイト閲覧は 1 タブを使い回す。`browser_snapshot` はページ遷移ごとに 1 回までとし、同一ページを再 snapshot しない
- observed.json はサンプルごとに逐次 Write し、スナップショットの内容を会話に持ち越さない

## テスト

- `judge.test.ts`：expected と observed から判定を導く純関数を `node --test` で検証する。8 種の判定すべてと、未知記号、凡例優先の分岐を含める
- plan のサンプル選定と Issue 本文のパースも純関数に切り出してユニットテストを書く（`parityReport.test.ts` と同型）。wrangler と gh の呼び出しは薄い皮に隔離する
- コマンド md 自体は初回実運用（#1622 の乖離サンプル）で検証する

## repair-scraper.md への改修

spot check とは独立に適用できる 2 点を、同じ知見の適用として本 spec に含める。

**ライブ探索のエスカレーション基準。**
フェーズ 2 手順 3 の「必要なら Playwright MCP で実サイトを開いて確認する」を、基準のある記述に置き換える。
キャプチャ DOM と現行セレクタの突き合わせで仮説が立たないとき、または verify が 2 回連続で fail したときにライブ探索へ切り替える。
全面リニューアル判定（フェーズ 5 直行）の根拠にもライブ探索の結果を使う。
静的キャプチャからの状態再構築は壊れやすく、ライブビューの方が堅牢だという実測[^slack]が根拠である。

**コスト規律の追記。**
フェーズ 2 に小節を足す。
DOM キャプチャは丸ごと Read せず、Grep で失敗セレクタ周辺の行番号を特定してから offset/limit 付きで部分 Read する。
同一キャプチャの再読と、同一ページの再 snapshot をしない。

## 参考

- Slack engineering: Agentic testing: where agents fit in the e2e testing stack[^slack]
- 自己修復スクレイパー設計: `docs/superpowers/specs/2026-06-13-self-healing-scraper-design.md`（決定論レーンと AI レーンの分離原則）
- パリティ定期実行設計: `docs/superpowers/specs/2026-07-17-parity-scheduled-ci-design.md`
