# @shisetsu-viewer/factory

software factory の制御層である。
定期スクレイプの結果、master の CI、dependabot PR を読み、あるべき作業項目と比べて GitHub Issue を維持する。
人間が起動しなくても、維持の仕事が検知から作業項目まで進むようにするのが目的である。

設計は `docs/superpowers/specs/2026-10-04-software-factory-design.md`、実装計画は `docs/superpowers/plans/2026-10-04-software-factory-phase0-2.md` にある。

## 運用フロー

現在は **observe モード**（フェーズ 2）で動いている。
reconcile は作業項目 Issue の作成、更新、クローズと、dependabot PR へのラベル付けまでを行い、エージェントの起動と自動マージはしない。
図の点線は、フェーズ 3 以降で有効にする部分である。

```mermaid
flowchart TD
  subgraph observe["観測層"]
    cron(["schedule<br/>JST 17:23 / 05:23 起点"]) --> scrape["Run Scraper<br/>シャード実行 → 失敗分のみ retry"]
    scrape --> collect["collect_failures<br/>run-summary.json を artifact に出す"]
    ci["Node CI（master への push）"]
    dep["dependabot PR"]
  end

  subgraph control["制御層（factory.yml、決定論）"]
    trigger(["Run Scraper 完了<br/>＋ 日次の保険 cron JST 09:41"]) --> wd1["watchdog:scraper<br/>定期スクレイプが 26h 以内に走ったか"]
    wd1 --> rec["reconcile<br/>直近 6 回の run-summary、master CI、<br/>dependabot PR、既存の作業項目を読む"]
  end

  collect -- workflow_run --> trigger
  collect --> wd2["watchdog:factory<br/>factory.yml が 26h 以内に走ったか"]
  ci --> rec
  dep --> rec

  rec --> judge{"スクレイパーごとの判定"}
  judge -- "structural / unknown が 2 回連続" --> repair["[factory] スクレイパー修復<br/>factory:queued"]
  judge -- "infra が 2 回連続" --> infra["[factory] 国内 proxy の経路断<br/>factory:needs-human"]
  judge -- "最新で ok" --> close["既存の項目をクローズ"]
  judge -- "1 回だけ、transient、サマリに無い" --> noop["何もしない"]
  rec -- "master CI が赤" --> red["[factory] master の CI が赤い<br/>factory:queued"]
  rec -- "patch / minor で CI 緑" --> depq["PR に factory:queued"]
  rec -- "major、0.x の minor、Cloudflare ツールチェイン" --> deph["PR に factory:needs-human"]

  wd1 -- "止まっている" --> stale["[factory] 定期実行が止まっている<br/>factory:needs-human"]
  wd2 -- "止まっている" --> stale

  infra --> human(["人間：GitHub 通知で受け取る"])
  deph --> human
  stale --> human

  subgraph work["作業層（フェーズ 3 以降）"]
    station["ステーション<br/>scraper-repair / master-red / dependency"]
    gate["factory-gate<br/>差分範囲、CI、実走、spot check"]
  end
  repair -.-> station
  red -.-> station
  depq -.-> station
  station -.-> gate
  gate -. "全条件を満たす" .-> merge(["auto-merge"])
  gate -. "1 つでも欠ける" .-> human
```

この流れには、要所が三つある。

一つめは、単発の失敗を作業にしないことである。
タイムアウトが structural に分類されても次の定期実行で解消することは多く、2026-10 の kanagawa-kawasaki（#1714、#1718）がその例である。
2 回連続という閾値は、分類器のこの精度不足を時間方向の冗長性で補っている。

二つめは、reconcile がイベントではなく状態に反応することである。
毎回、直近の run-summary と既存の Issue を突き合わせて差分だけを適用するので、何回実行しても結果は変わらない。
ある回の起動を取りこぼしても、次の回が同じ判断を出し直す。

三つめは、人間に届く通知を `factory:needs-human` に絞ることである。
エージェントで直せない経路断（Mac のスリープなど）、人間の判断が要る依存更新、定期実行そのものの停止だけが、所有者への assign として届く。

## 作業項目の状態

作業項目は Issue 1 件で表す。
本文末尾の隠しマーカーに重複排除キー（`<!-- factory:key scraper-repair:tokyo-kita -->`）と状態（`<!-- factory:state {"consecutive":2,"lastRunId":…} -->`）を持つので、Issue を開けば工場の内部状態がそのまま読める。

```mermaid
stateDiagram-v2
  [*] --> queued: 2 回連続の失敗、master CI が赤
  [*] --> needs_human: infra、定期実行の停止
  queued --> running: ステーション起動（フェーズ 3〜）
  running --> pr_open: 修正 PR を出す
  running --> needs_human: 2 回試行して失敗
  pr_open --> needs_human: ゲート不合格
  queued --> [*]: 原因が観測されなくなりクローズ
  pr_open --> [*]: マージ後、次の巡回で ok
  needs_human --> [*]: 原因が観測されなくなりクローズ
  note right of needs_human
    reconcile は needs-human を外さない。
    人間への引き渡しは一方向である。
  end note
```

`factory:hold` は人間が付けるラベルで、reconcile はその項目を作成も編集もクローズもしない。
状態図には描いていないが、どの状態からでも付けられる。

## 止め方

| 粒度 | 手段 | 効果 |
|---|---|---|
| 工場全体 | repo variable `FACTORY_MODE=off` | reconcile も watchdog も何もしない |
| 工場全体 | `FACTORY_MODE=observe`（未設定時の既定） | 作業項目の維持だけを行う |
| 作業項目 | Issue や PR に `factory:hold` | その項目には触らない |

フェーズ 2 では、`FACTORY_MODE=on` も observe として扱う。

## 状態の見方

```bash
gh issue list --label factory --state open
gh pr list --label factory
gh run list --workflow factory.yml --limit 6
```

reconcile の各回のログには、読んだ run-summary の run ID と、適用した操作の JSON が出る。

## 開発

```bash
npm run test -w @shisetsu-viewer/factory
FACTORY_OWNER=trfv node packages/factory/src/cli/reconcile.ts --dry-run
```

判定はすべて `src/*.ts` の純関数にあり、`node --test` で固定している。
2026-10 の実際の run（sumida の preflight 530 の連続、kawasaki の単発の structural）と、滞留していた dependabot PR をフィクスチャに含める。
`src/gh.ts`、`src/applyOps.ts`、`src/cli/` は `gh` を呼ぶだけの薄い層で、単体テストを持たない。
