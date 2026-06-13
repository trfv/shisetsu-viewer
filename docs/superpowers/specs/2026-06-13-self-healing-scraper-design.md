# 決定論的スクレイパー + 別レーン AI 自己修復 — 設計ドキュメント

- 日付: 2026-06-13
- ステータス: Phase 1 実装済み（tokyo-kita パイロット）
- 対象パッケージ: `packages/scraper`
- パイロット自治体: `tokyo-kita`

## 背景と目的

`packages/scraper` の各自治体スクレイパーは、Playwright テストとして実装され、
CI（`.github/workflows/scraper.yml`、cron `0 4,16 * * *`）で定期実行される。
セレクタは XPath・ロール名・ステータス画像ファイル名にハードコードされており、**決定論的だが、サイトの DOM 変化に対して脆い**。

既存の `prepare_retry` / `retry_scrape` は「同一セレクタでの再試行」であり、
一過性の失敗の救済には有効だが、**構造変化への追従ではない**。

### ゴール

1. **定期実行ワークフローは決定論的なまま維持する**（AI を一切挟まない）。
2. サイト構造が変わって壊れたときに**追従できる仕組み**を追加する。

### 設計判断（ブレインストーミングで確定）

| # | 論点 | 決定 |
|---|---|---|
| B | 追従のレベル | **AI による修正提案（半自動）**。壊れたら AI が修正案を生成し **PR を作る**。マージは人間。 |
| A+B | 修復の起動判定 | **リトライ枯渇トリガー + 失敗分類**。`retry_scrape` を一過性フィルタとして再利用し、Playwright のエラー種別と `validateTransformOutput` の結果で「構造系」を判定。 |
| A | 修復の信頼性 | **自己検証ループ（self-correcting loop）**。実サイトで再実行し `validateTransformOutput` が通る修正だけを PR 化。通らなければエスカレーション。 |
| C | 実行環境 | **段階移行**。当面は手元実行（開発者の Max サブスク、対話実行はフラットレート枠）。CI 自律化は将来の昇格オプションとして設計上の余地のみ残す。 |
| A | 初期スコープ | **1自治体（`tokyo-kita`）でパイロット** → 横展開。 |

### 実行環境に関する制約（事実確認済み）

- `anthropics/claude-code-action` および `claude -p`（ヘッドレス）で、GitHub Actions
  内から AI エージェントを `schedule` / `workflow_dispatch` / `workflow_run` トリガーで
  自律実行することは技術的に可能。Bash・ファイル編集・Playwright 実行・ブランチ作成・
  PR 起票まで一気通貫で行える。
- **ただし 2026-06-15 以降、サブスク（Max）の OAuth トークンを使った `claude -p` /
  Agent SDK の自動実行は、対話利用とは別の月次 Agent SDK クレジット（標準 API レート）
  から差し引かれる＝実質従量課金**になる。従量課金を避けたいという方針のため、
  当面 CI 自律実行（Phase 2）は採らない。
- 手元での対話実行（`claude` を開発者が起動）は引き続き Max のフラットレート枠であり、
  Phase 1 の「手元修復」は追加コストゼロで回せる。

この制約が課す設計要件：**修復ロジックを「実行環境に依存しない一つの成果物」として
作る**こと（手元実行でも将来の CI 実行でも、同じ入力・同じ手順で動く）。

## 全体アーキテクチャ（2レーン分離）

```
┌─ 決定論レーン（既存 + 検知だけ追加）──────────────┐
│ scraper.yml: scrape → retry_scrape                      │
│   各テスト失敗時に「失敗レコード」を分類して保存          │ ← AI なし
│ collect_failures: 構造系失敗だけ集約 → アーティファクト   │ ← AI なし
│                    + 通知（Issue upsert）                │
└────────────────────────────────────────────────────────┘
              │ 構造系失敗の「修復スペック」を引き渡し
              ▼
┌─ 修復レーン（新規・実行環境非依存）────────────────┐
│ 修復ハーネス（決定論スクリプト）: 実サイトで再実行→検証  │
│ 修復スキル（AI）: 仮説→編集→ハーネスで検証→ループ→PR     │
│   Phase1: 手元の Claude Code で実行（Max フラット枠）     │
│   Phase2(将来): claude -p で CI 自律化（従量を許容したら）│
└────────────────────────────────────────────────────────┘
```

**設計の肝**：「AI が提案する／決定論コードが検証する」を物理的に分離する。
検証の合否基準は既存の `validateTransformOutput()` をそのまま使う。

## コンポーネント詳細

### ① 失敗キャプチャ（決定論レーン / scraper パッケージ）

- `common/classifyFailure.ts` — 例外と validation 結果を3分類する純粋関数：
  - `transient` — `TimeoutError`、ネットワーク系、Cloudflare Turnstile 検知。
    retry_scrape に任せる、修復対象外。
  - `structural` — locator が0件 / 要素未検出 / `validateTransformOutput` が
    エラー配列を返す。**修復対象**。
  - `unknown` — 上記に当てはまらない。安全側で修復対象に含めるがフラグを立てる。
- `common/captureFailure.ts` — テスト失敗時に
  `test-results/<muni>/_failures/<facility>_<yyyyMM>.json` を書き出す。中身：
  - `municipality`, `facility`, `dateRange`
  - `failedStep`（`prepare` / `extract` / `transform` / `validate` のどれか）
  - `classification`, `errorMessage`, `errorStack`
  - `domSnapshotPath`（`page.content()` の HTML を隣に保存）, `screenshotPath`
  - `sourceRef`（壊れた可能性が高いスクレイパーのファイルパス）
- パイロットでは `tokyo-kita/index.test.ts` の catch 節からこれを呼ぶ。

### ② 失敗集約（決定論レーン / scraper.yml）

- `retry_scrape` の後に `collect_failures` ジョブを追加（AI なし）。
- `_failures/*` のうち `structural` / `unknown` だけを集めてアーティファクト化。
- **専用 Issue を upsert**：固定タイトル（例 `[scraper-repair] 構造変化の疑い`）で、
  本文に「自治体・施設・失敗ステップ・分類・アーティファクトへのリンク」を表形式で
  記載。既存 Issue があれば追記更新し、解消したらクローズ。
- この Issue は「決定論レーンが人間に向けて吐く構造化シグナル」であり、人間が読んでも
  将来 AI が読んでもそのまま修復スペックになる、という二重の役割を持つ。

### ③ 修復ハーネス（決定論・実行環境非依存 / tools/repair/）

- `tools/repair/verify.ts` — 引数で受けた1自治体・1施設について、
  prepare→extract→transform→validate を**実サイトに対して**実行し、構造化結果
  （`pass | fail` + validation エラー + 失敗時の新しい DOM スナップショット）を返す。
- 中身は既存の Playwright テストをターゲット指定（`-g "<facility>"`）で呼ぶ薄いラッパ。
- **これが自己検証ループの「検証」半分**であり、AI を一切含まない。

### ④ 修復スキル（AI 半分 / `.claude/skills/`）

- 新スキル `/repair-scraper <municipality>`。手順を固定：
  1. `_failures/` の失敗レコード + DOM スナップショットを読む。
  2. 既知の正しいセレクタ（現行 `index.ts`）と新 DOM を突き合わせ、**最小の差分**で
     修正を仮説立てる。
  3. `index.ts` を編集 → ③のハーネスで検証。
  4. 緑になるまでループ（**上限 N 回。既定 N=5、調整可能**）。
  5. 緑 → ブランチ作成 + PR 起票（before/after セレクタ + 検証ログを本文に）。
  6. N 回で枯れない → 修復失敗としてエスカレーション要約を Issue に追記
     （人間が引き取る）。

## データフロー（壊れてから PR まで）

```
定期実行(cron) → scrape 失敗 → retry_scrape 失敗（同セレクタ再試行で救済されず）
  → 各テストが _failures/<facility>.json + DOM/screenshot を保存（分類済み）
  → collect_failures: structural のみ集約 → アーティファクト + Issue upsert
  ──（決定論レーンここまで／追従の遅延ゼロで「壊れた事実」が可視化）──
  → 人間が Issue に気づく
  → 手元で `/repair-scraper tokyo-kita` 起動（Max フラット枠）
  → [仮説→index.ts編集→ハーネスで実サイト検証→validateTransformOutput] をループ
  → 緑 → PR 起票（検証ログ付き）→ 人間レビュー → マージ
     or N回枯れ → Issue にエスカレーション要約
```

定期実行は**一切待たず・一切 AI を挟まず**進む。修復は完全に非同期の別レーン。
マージは必ず人間（決定 B）。

## エラーハンドリングと安全性

- **分類の誤検知（transient を structural と誤判定）**：修復ループの初回検証で実サイトが
  普通に通る → エージェントは「既に動く・変更不要」と結論しクローズ。無害。
- **構造系の見逃し（structural を transient と誤判定）**：`unknown` を安全側で修復対象に
  含める設計でリスク低減。さらに `validateTransformOutput` 失敗は常に structural 扱いの
  ため、データが取れていない状態は必ず捕捉される。
- **修復ループ非収束**：上限 N 回で打ち切り → エスカレーション。CI も手元実行も暴走
  しない（将来 CI 化時は `--max-turns` でも二重ガード）。
- **影響範囲の局所化**：修復は当該1自治体の `index.ts` のみ編集。スキーマや共有コード
  には触れない。PR は人間マージ必須。
- **決定論レーンの不可侵**：修復は別ファイル・別ワークフロー・別タイミング。
  `scraper.yml` の決定論的挙動は変更しない（追加するのは「失敗を保存・集約する」
  副作用のみ）。

## テスト戦略

- `classifyFailure` … サンプル例外（`TimeoutError` / locator 0件 / validation エラー）で
  分類を単体テスト。
- `captureFailure` … 期待する JSON 形状を書き出すか単体テスト。
- 修復ハーネス … 既存スクレイパーテストがそのまま動作保証。
- **エンドツーエンド検証（手動・受け入れ基準）**：`tokyo-kita/index.ts` のセレクタを
  意図的に1つ壊し、`/repair-scraper` がループで自己修復して緑の PR を出せるかを実際に
  確認する。これが仕組み全体の受け入れ基準。

## 段階移行（決定 C）

- **Phase 1（今回）**：失敗キャプチャ + 集約（決定論）+ 修復ハーネス + 修復スキルを構築。
  修復は開発者の Claude Code で手元実行（Max・フラットレート枠、追加コストなし）。
- **Phase 2（将来・任意）**：`scraper-repair.yml` で `claude -p` + シークレットを使い
  CI 自律化。**同じハーネス・同じプロンプトを再利用**。従量課金を許容する判断が
  できたときのみ昇格する。

## スコープ外（YAGNI）

- 全10自治体への一斉対応（パイロットを枯らしてから横展開）。
- Phase 2 の CI 自律実行ワークフローの実装（設計上の余地のみ残す）。
- スクレイパーのセレクタ抽象化・汎用 DSL 化などの大規模リファクタ。
