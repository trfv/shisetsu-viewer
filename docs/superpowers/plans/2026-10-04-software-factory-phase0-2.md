# software factory フェーズ 0〜2 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在庫を一掃し、定期スクレイプの結果を自治体別サマリという信頼できる信号に変え、その信号から作業項目 Issue を決定論的に維持する制御層（reconcile）を observe モードで動かす。

**Architecture:** Run Scraper の最終ジョブがジョブ結果と失敗レコードから `run-summary.json` を作る。新設の `packages/factory` が、直近のサマリ、master の CI、dependabot PR、既存の作業項目 Issue を読み、純関数 `reconcile()` で Issue 操作の一覧を計算して適用する。エージェントはこのフェーズでは一切起動しない。

**Tech Stack:** Node 24（型ストリッピングで `.ts` を直接実行）、`node --test`、GitHub Actions、`gh` CLI（ランナーに標準搭載）。追加の npm 依存はない。

**Spec:** `docs/superpowers/specs/2026-10-04-software-factory-design.md`

## Global Constraints

- Node >= 24、ES Modules。`packages/factory` は npm 依存を持たず、node 組込モジュールと `gh` CLI だけを使う。
- TypeScript は `@tsconfig/strictest`（`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` が有効）。省略可能プロパティは `?:` ではなく `| null` で表す。
- enum を使わない（Node の型ストリッピングは `erasableSyntaxOnly` 前提）。
- 書式は oxfmt（printWidth 100、ダブルクォート、trailing comma es5）、lint は `oxlint --deny-warnings`。
- 作業項目のラベルは `factory`、`factory:queued`、`factory:running`、`factory:pr-open`、`factory:needs-human`、`factory:hold` の 6 つ。PR の変更クラスを表す `change:<クラス>` は作業項目の状態ではなく、Task 11 で別に扱う。
- 作業項目 Issue の本文には `<!-- factory:key <key> -->` と `<!-- factory:state <json> -->` を埋め込む。
- 連続観測の閾値は 2 回。相互監視の閾値は 26 時間。
- repo variable `FACTORY_MODE` は `off`、`observe`、`on`。未設定は `observe` とみなす。フェーズ 2 では `on` も `observe` として扱う。
- master へ直接 push しない。各 PR はブランチから出す。commit は `PATH="$PWD/node_modules/.bin:$PATH" git commit` で行い、`--no-verify` は使わない。
- worktree で作業する場合は、最初に `npm install` を実行する。

## Review Focus

- 定期実行が cancel されて run-summary が無い、あるいは最新サマリにその自治体が載っていない場合、既存の作業項目を「解消した」とみなしてクローズしてはならない（Task 7 のテスト「最新サマリに自治体が無ければ触らない」）。
- 失敗したシャードに失敗レコードが 1 件も無い（ジョブのタイムアウトやクラッシュ）場合、`ok` ではなく `unknown` として扱う（Task 3 のテスト「失敗シャードにレコードが無ければ unknown」）。
- 人間が本文を編集して state の JSON が壊れても、同じ key の Issue を重複して作らない（Task 7 のテスト「state が壊れた既存項目は作り直さず edit する」）。
- `factory:hold` が付いた項目は、解消条件を満たしてもクローズも編集もしない（Task 7 のテスト「hold は解消してもクローズしない」）。
- grouped な dependabot PR に major 更新が 1 つでも混ざれば needs-human にする（Task 6 のテスト「group 内に major が 1 つでもあれば needs-human」）。
- 複数の変更クラスに当たる PR は、承認がいちばん重いクラスにする。dependabot の PR でも `.github/` を含めば workflow にする（Task 11 のテスト「重いクラスが勝つ」「dependabot でも workflow を含めば workflow」）。

## spec からの調整

- 相互監視は spec ではフェーズ 1 に置いたが、監視相手の factory.yml がフェーズ 2 で生まれるため、Task 9（フェーズ 2）に移す。
- 自治体の状態に `unknown` を加える。失敗レコードの無い失敗（タイムアウトやクラッシュ）を `ok` と区別するためで、scraper-repair の起動条件（structural または unknown）とは整合する。
- repo variable `FACTORY_STATIONS` は、起動するステーションが存在するフェーズ 3 で入れる。フェーズ 2 の停止スイッチは `FACTORY_MODE` と `factory:hold` の 2 つ。
- dependency の作業項目は Issue ではなく dependabot PR そのものとし、ラベルで状態を表す。PR ごとに Issue を立てると、同じものを 2 か所で追うことになるため。
- （2026-10-17）scraper-repair の作業項目のキーと run-summary の単位は、自治体ではなくスクレイパーのディレクトリ名とする（例 `tokyo-kita-cocokita`）。シャードのジョブ名 `Scrape <ディレクトリ名> (i/n)` をそのまま使えばよい。
- （2026-10-17）フェーズ 0 は、#1700 が #1721 に置き換わって閉じ、dependabot の滞留も 2026-10-17 に一括で処理した。残りは #1552、#1584 のクローズだけである。
- （2026-10-17）フェーズ 1 の終了後に 1 週間待たず、続けてフェーズ 2 に進む。Task 3 のフィクスチャには、2026-10 の実際の run（kawasaki の単発の structural、sumida の 3 回連続失敗、kawasaki の全シャード失敗）を含める。
- （2026-10-17）Task 2 では、`recordInfraFailure.ts` をサブシェルの `cd` 経由で呼ぶため knip が追えない。`knip.config.ts` の scraper の entry に `scripts/*.ts` を足す。
- （2026-10-17）進捗：Task 1〜9 は #1721、#1728〜#1732 で master に入った。各 Step のチェックボックスは更新していない。
- （2026-10-17）spec の「GitOps の見直し」を受けて、変更クラスの observe を Task 11 として足し、旧 Task 11 を Task 12 にする。spec の変更クラスのうち format は、base で整形を実行した結果との比較が要るので、このフェーズでは判定しない（フェーズ 3b の master-red で入れる）。デプロイ状態の収束判定（`deploy-drift`）はフェーズ 3a の前提なので、フェーズ 3 の計画の最初のタスクに置く。

---

## フェーズ 0：在庫一掃

フェーズ 0 はコード変更を伴わない運用作業である。
マージやクローズは外部に見える操作なので、各ステップで人間の確認を取ってから実行する。

### Task 1: master の CI を緑に戻し、滞留在庫を整理する

**Files:** なし（GitHub 上の操作のみ）

- [ ] **Step 1: #1700 を最新の master に追従させる**

```bash
gh pr view 1700 --json mergeable,statusCheckRollup --jq '.mergeable, (.statusCheckRollup[]|select(.name=="ci-success")|.conclusion)'
gh pr update-branch 1700
```

Expected: 数分後に `ci-success` が `SUCCESS` になる。`CONFLICTING` なら、ブランチを手元に取り、`npx oxfmt packages/viewer/vite.config.ts` をやり直して push する。

- [ ] **Step 2: 人間の確認を取って #1700 をマージする**

```bash
gh pr merge 1700 --squash
```

- [ ] **Step 3: 滞留 dependabot PR を分類する**

```bash
gh pr list --author app/dependabot --state open --json number,title --jq '.[]|"\(.number) \(.title)"'
```

各 PR について、本文の `Updates \`pkg\` from X to Y` 行を読み、次のどれかに分ける。

- patch または minor で、Cloudflare ツールチェイン（wrangler、miniflare、`@cloudflare/vitest-pool-workers`）を含まない：`gh pr comment <n> --body "@dependabot rebase"` で追従させ、`ci-success` が緑になったら人間の確認を取ってマージする。
- major（例 #1709 の vitest 4 → 5）、または Cloudflare ツールチェインを含む：開いたままにする。フェーズ 2 の reconcile が needs-human を付ける。

- [ ] **Step 4: 古い tracker Issue を整理する**

```bash
gh issue view 1552 --json title,body --jq .title
gh issue view 1584 --json title,body --jq .title
gh run list --workflow scraper.yml --event schedule --status completed --limit 1 --json databaseId --jq '.[0].databaseId'
gh run view <上の run id> --json jobs --jq '[.jobs[]|select(.conclusion=="failure")|.name]'
```

最新の定期実行で tokyo-arakawa（#1552）と tokyo-koutou（#1584）のシャードが失敗していなければ、人間の確認を取ってクローズする。

```bash
gh issue close 1552 --comment "最新の定期実行（run <id>）で再現しないためクローズする。今後は factory の作業項目（ラベル factory）で追跡する。"
gh issue close 1584 --comment "最新の定期実行（run <id>）で再現しないためクローズする。今後は factory の作業項目（ラベル factory）で追跡する。"
```

失敗が続いていれば開いたままにし、Task 10 の移行で扱う。

- [ ] **Step 5: 完了条件を確認する**

```bash
gh run list --workflow nodejs.yml --limit 3 --json headBranch,conclusion
```

Expected: master 由来の PR で `ci-success` が緑になる。

---

## フェーズ 1：信号の健全化

### Task 2: 失敗分類に infra を足し、proxy 断を記録する

**Files:**
- Modify: `packages/scraper/common/failureTypes.ts:3`
- Modify: `packages/scraper/common/classifyFailure.ts`
- Test: `packages/scraper/common/classifyFailure.test.ts`
- Create: `packages/scraper/common/infraFailure.ts`
- Test: `packages/scraper/common/infraFailure.test.ts`
- Create: `packages/scraper/scripts/recordInfraFailure.ts`
- Modify: `.github/actions/scrape/action.yml`（「Open JP proxy tunnel」ステップ）

**Interfaces:**
- Produces: `FailureClassification = "transient" | "structural" | "unknown" | "infra"`。失敗レコード JSON の `classification` に `"infra"` が現れる。Task 3 の `parseFailureRecord` がこれを受け付ける。
- Produces: `buildInfraFailureRecord(input: { municipality: string; reason: string; now: Date }): FailureRecord`

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/common/classifyFailure.test.ts` の末尾に追加する。

```ts
test("国内 proxy の接続失敗は infra", () => {
  assert.equal(
    classifyFailure("prepare", new Error("page.goto: net::ERR_PROXY_CONNECTION_FAILED at https://x/")),
    "infra"
  );
  assert.equal(
    classifyFailure("extract", new Error("net::ERR_TUNNEL_CONNECTION_FAILED")),
    "infra"
  );
});

test("proxy 以外の net::ERR_ は従来どおり transient", () => {
  assert.equal(classifyFailure("prepare", new Error("net::ERR_CONNECTION_RESET")), "transient");
});
```

`packages/scraper/common/infraFailure.test.ts` を作る。

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildInfraFailureRecord } from "./infraFailure.ts";

test("infra の失敗レコードを組み立てる", () => {
  const record = buildInfraFailureRecord({
    municipality: "tokyo-sumida",
    reason: "preflight HTTP 530",
    now: new Date("2026-10-04T00:00:00Z"),
  });
  assert.equal(record.municipality, "tokyo-sumida");
  assert.equal(record.classification, "infra");
  assert.equal(record.failedStep, "prepare");
  assert.equal(record.errorMessage, "preflight HTTP 530");
  assert.equal(record.capturedAt, "2026-10-04T00:00:00.000Z");
});
```

- [ ] **Step 2: テストが落ちることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`infra` が返らない、`./infraFailure.ts` が見つからない）

- [ ] **Step 3: 実装する**

`packages/scraper/common/failureTypes.ts` の 3 行目を置き換える。

```ts
export type FailureClassification = "transient" | "structural" | "unknown" | "infra";
```

`packages/scraper/common/classifyFailure.ts` の `TRANSIENT_PATTERNS` の直前に追加する。

```ts
// 国内 proxy の経路断。サイト構造ではなく経路（Mac、tinyproxy、Tunnel）の問題なので修復対象外。
// net::ERR_ 全般を transient とみなす正規表現より先に判定する。
const INFRA_PATTERNS: RegExp[] = [
  /net::ERR_PROXY_CONNECTION_FAILED/,
  /net::ERR_TUNNEL_CONNECTION_FAILED/,
];
```

同ファイルの `classifyFailure` で、`if (validationErrors.length > 0) { return "structural"; }` の直後に追加する。

```ts
  const infraMessage = error instanceof Error ? error.message : String(error);
  if (INFRA_PATTERNS.some((re) => re.test(infraMessage))) {
    return "infra";
  }
```

関数冒頭の JSDoc の判定順に「(1.5) 国内 proxy の経路断は infra」を足す。

`packages/scraper/common/infraFailure.ts` を作る。

```ts
import type { FailureRecord } from "./failureTypes.ts";

/**
 * Playwright に到達する前の経路断（国内 proxy の preflight 失敗など）を、
 * 通常の失敗レコードと同じ形で残す。run-summary はこれを見て infra と判定する。
 */
export function buildInfraFailureRecord(input: {
  municipality: string;
  reason: string;
  now: Date;
}): FailureRecord {
  return {
    municipality: input.municipality,
    facility: "(国内 proxy)",
    context: {},
    failedStep: "prepare",
    classification: "infra",
    errorMessage: input.reason,
    errorStack: null,
    validationErrors: [],
    domSnapshotPath: null,
    screenshotPath: null,
    sourceRef: "",
    capturedAt: input.now.toISOString(),
  };
}
```

`packages/scraper/scripts/recordInfraFailure.ts` を作る。

```ts
/**
 * 国内 proxy の経路断を失敗レコードとして test-results/<municipality>/_failures/ に書く。
 * scrape composite action の preflight 失敗時に呼ばれる。
 *
 * 使い方: node scripts/recordInfraFailure.ts <municipality> <reason>
 */
import fs from "node:fs";
import path from "node:path";

import { buildInfraFailureRecord } from "../common/infraFailure.ts";

const [municipality, reason] = process.argv.slice(2);
if (!municipality || !reason) {
  console.error("usage: node scripts/recordInfraFailure.ts <municipality> <reason>");
  process.exit(2);
}
const dir = path.join("test-results", municipality, "_failures");
fs.mkdirSync(dir, { recursive: true });
const record = buildInfraFailureRecord({ municipality, reason, now: new Date() });
fs.writeFileSync(path.join(dir, "_infra.json"), `${JSON.stringify(record, null, 2)}\n`);
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:unit -w @shisetsu-viewer/scraper && npm run typecheck -w @shisetsu-viewer/scraper`
Expected: PASS

- [ ] **Step 5: composite action から呼ぶ**

`.github/actions/scrape/action.yml` の「Open JP proxy tunnel」ステップの `env:` に追加する（`inputs` を `run:` に直接展開しないため）。

```yaml
        MUNICIPALITY: ${{ inputs.municipality }}
```

同ステップの preflight 失敗の `exit 1` の直前に追加する。

```bash
          (cd packages/scraper && node scripts/recordInfraFailure.ts "${MUNICIPALITY}" "preflight HTTP ${CODE}")
```

同ステップの最後（listener が起動しなかった場合）の `exit 1` の直前に追加する。

```bash
        (cd packages/scraper && node scripts/recordInfraFailure.ts "${MUNICIPALITY}" "cloudflared access listener did not start")
```

「Upload failure records」ステップは `if: always()` なので、この記録も artifact に載る。

- [ ] **Step 6: knip と lint を確認する**

Run: `npm run knip && npm run lint:all && npm run format:check:all`
Expected: PASS。knip が `scripts/recordInfraFailure.ts` を未使用ファイルと報告した場合は、`knip.config.ts` の `packages/scraper` の `entry` に `"scripts/*.ts"` を足す。

- [ ] **Step 7: commit する**

```bash
git add packages/scraper/common/failureTypes.ts packages/scraper/common/classifyFailure.ts packages/scraper/common/classifyFailure.test.ts packages/scraper/common/infraFailure.ts packages/scraper/common/infraFailure.test.ts packages/scraper/scripts/recordInfraFailure.ts .github/actions/scrape/action.yml knip.config.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): 国内 proxy の経路断を infra として分類し記録する"
```

### Task 3: packages/factory を作り、run summary を組み立てる

**Files:**
- Create: `packages/factory/package.json`
- Create: `packages/factory/tsconfig.json`
- Create: `packages/factory/src/types.ts`
- Create: `packages/factory/src/runSummary.ts`
- Test: `packages/factory/src/runSummary.test.ts`
- Modify: `knip.config.ts`
- Modify: `.github/workflows/nodejs.yml`（test ジョブ）

**Interfaces:**
- Produces（`src/types.ts`、後続の全タスクが使う）:

```ts
export type MunicipalityStatus = "ok" | "transient" | "structural" | "unknown" | "infra";
export interface MunicipalitySummary { readonly municipality: string; readonly status: MunicipalityStatus; readonly failedFacilities: readonly string[] }
export interface RunSummary { readonly runId: number; readonly runUrl: string; readonly createdAt: string; readonly municipalities: readonly MunicipalitySummary[] }
export interface JobInfo { readonly name: string; readonly conclusion: string | null }
export type RecordClassification = "transient" | "structural" | "unknown" | "infra";
export interface FailureRecordLite { readonly municipality: string; readonly facility: string; readonly classification: RecordClassification }
```

- Produces: `buildRunSummary(meta: { runId: number; runUrl: string; createdAt: string }, jobs: readonly JobInfo[], records: readonly FailureRecordLite[]): RunSummary`
- Produces: `parseFailureRecord(value: unknown): FailureRecordLite | null`

spec では自治体の状態を `ok`、`transient`、`structural`、`infra` の 4 つとしたが、失敗レコードの無い失敗を区別するため `unknown` を加える。scraper-repair の起動条件（structural または unknown）とは整合する。

- [ ] **Step 1: パッケージの骨組みを作る**

`packages/factory/package.json`:

```json
{
  "name": "@shisetsu-viewer/factory",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test 'src/*.test.ts'",
    "typecheck": "tsc"
  }
}
```

`packages/factory/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./",
    "lib": ["ESNext"],
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true
  },
  "include": ["./**/*.ts"]
}
```

`packages/factory/src/types.ts` に、上の Interfaces の型定義をそのまま書く（各 interface は 1 プロパティ 1 行に展開する）。

Run: `npm install`（workspace を lock に登録する。lock の他の行が大きく変わったら止めて原因を調べる）

- [ ] **Step 2: 失敗するテストを書く**

`packages/factory/src/runSummary.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRunSummary, parseFailureRecord } from "./runSummary.ts";
import type { FailureRecordLite, JobInfo } from "./types.ts";

const META = { runId: 100, runUrl: "https://example.test/runs/100", createdAt: "2026-10-03T08:23:00Z" };

const job = (name: string, conclusion: string | null): JobInfo => ({ name, conclusion });
const rec = (
  municipality: string,
  facility: string,
  classification: FailureRecordLite["classification"]
): FailureRecordLite => ({ municipality, facility, classification });

test("全シャード成功なら ok", () => {
  const s = buildRunSummary(META, [job("Scrape tokyo-kita (1/2)", "success"), job("Scrape tokyo-kita (2/2)", "success")], []);
  assert.deepEqual(s.municipalities, [{ municipality: "tokyo-kita", status: "ok", failedFacilities: [] }]);
});

test("scrape で落ちても retry で成功したシャードは ok", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-ota (3/5)", "failure"), job("Retry Scrape tokyo-ota (3/5)", "success")],
    []
  );
  assert.equal(s.municipalities[0]?.status, "ok");
});

test("retry 後も落ちて structural レコードがあれば structural", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-kita (3/3)", "failure"), job("Retry Scrape tokyo-kita (3/3)", "failure")],
    [rec("tokyo-kita", "つつじホール", "structural"), rec("tokyo-kita", "つつじホール", "structural")]
  );
  assert.deepEqual(s.municipalities[0], {
    municipality: "tokyo-kita",
    status: "structural",
    failedFacilities: ["つつじホール"],
  });
});

test("失敗シャードにレコードが無ければ unknown", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-chuo (1/1)", "failure"), job("Retry Scrape tokyo-chuo (1/1)", "failure")],
    []
  );
  assert.equal(s.municipalities[0]?.status, "unknown");
});

test("retry ジョブが無い失敗シャードも失敗として数える", () => {
  const s = buildRunSummary(META, [job("Scrape tokyo-chuo (1/1)", "cancelled")], []);
  assert.equal(s.municipalities[0]?.status, "unknown");
});

test("infra は structural より優先する", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-sumida (1/1)", "failure"), job("Retry Scrape tokyo-sumida (1/1)", "failure")],
    [rec("tokyo-sumida", "(国内 proxy)", "infra"), rec("tokyo-sumida", "A", "structural")]
  );
  assert.equal(s.municipalities[0]?.status, "infra");
});

test("transient レコードだけなら transient", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-ota (1/1)", "failure"), job("Retry Scrape tokyo-ota (1/1)", "failure")],
    [rec("tokyo-ota", "A", "transient")]
  );
  assert.equal(s.municipalities[0]?.status, "transient");
});

test("他自治体のレコードは混ざらない", () => {
  const s = buildRunSummary(
    META,
    [
      job("Scrape tokyo-kita (1/1)", "failure"),
      job("Retry Scrape tokyo-kita (1/1)", "failure"),
      job("Scrape tokyo-ota (1/1)", "success"),
    ],
    [rec("tokyo-kita", "A", "structural"), rec("tokyo-ota", "B", "structural")]
  );
  assert.deepEqual(
    s.municipalities.map((m) => [m.municipality, m.status]),
    [
      ["tokyo-kita", "structural"],
      ["tokyo-ota", "ok"],
    ]
  );
});

test("Scrape 以外のジョブ名は無視する", () => {
  const s = buildRunSummary(META, [job("prepare", "success"), job("Collect structural failures", null)], []);
  assert.deepEqual(s.municipalities, []);
});

test("parseFailureRecord は必須フィールドを検査する", () => {
  assert.deepEqual(
    parseFailureRecord({ municipality: "tokyo-kita", facility: "A", classification: "infra", extra: 1 }),
    { municipality: "tokyo-kita", facility: "A", classification: "infra" }
  );
  assert.equal(parseFailureRecord({ municipality: "tokyo-kita", facility: "A" }), null);
  assert.equal(parseFailureRecord({ municipality: "tokyo-kita", facility: "A", classification: "weird" }), null);
  assert.equal(parseFailureRecord(null), null);
});
```

- [ ] **Step 3: テストが落ちることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory`
Expected: FAIL（`./runSummary.ts` が見つからない）

- [ ] **Step 4: 実装する**

`packages/factory/src/runSummary.ts`:

```ts
import type {
  FailureRecordLite,
  JobInfo,
  MunicipalityStatus,
  MunicipalitySummary,
  RecordClassification,
  RunSummary,
} from "./types.ts";

// scraper.yml のジョブ名。prepare_retry も同じ形を前提にしている。
const SCRAPE_RE = /^Scrape (\S+) \((\d+)\/(\d+)\)$/;
const RETRY_RE = /^Retry Scrape (\S+) \((\d+)\/(\d+)\)$/;

const CLASSIFICATIONS: readonly RecordClassification[] = ["transient", "structural", "unknown", "infra"];

export function parseFailureRecord(value: unknown): FailureRecordLite | null {
  if (typeof value !== "object" || value === null) return null;
  const { municipality, facility, classification } = value as Record<string, unknown>;
  if (typeof municipality !== "string" || typeof facility !== "string") return null;
  if (!CLASSIFICATIONS.includes(classification as RecordClassification)) return null;
  return { municipality, facility, classification: classification as RecordClassification };
}

function statusFromRecords(records: readonly FailureRecordLite[]): MunicipalityStatus {
  if (records.some((r) => r.classification === "infra")) return "infra";
  if (records.some((r) => r.classification === "structural")) return "structural";
  // レコードの無い失敗（ジョブのタイムアウトやクラッシュ）は原因不明として扱い、ok にしない。
  if (records.length === 0 || records.some((r) => r.classification === "unknown")) return "unknown";
  return "transient";
}

/**
 * 1 回の Run Scraper のジョブ結果と retry 後の失敗レコードから、自治体別の状態を組み立てる。
 * scrape で落ちても retry で成功したシャードは成功とみなす。
 */
export function buildRunSummary(
  meta: { runId: number; runUrl: string; createdAt: string },
  jobs: readonly JobInfo[],
  records: readonly FailureRecordLite[]
): RunSummary {
  const retryConclusion = new Map<string, string | null>();
  for (const job of jobs) {
    const m = RETRY_RE.exec(job.name);
    if (m) retryConclusion.set(`${m[1]}#${m[2]}/${m[3]}`, job.conclusion);
  }

  const municipalities = new Set<string>();
  const failed = new Set<string>();
  for (const job of jobs) {
    const m = SCRAPE_RE.exec(job.name);
    if (!m) continue;
    const municipality = m[1] ?? "";
    municipalities.add(municipality);
    if (job.conclusion === "success" || job.conclusion === "skipped") continue;
    if (retryConclusion.get(`${municipality}#${m[2]}/${m[3]}`) === "success") continue;
    failed.add(municipality);
  }

  const summaries: MunicipalitySummary[] = [...municipalities].sort().map((municipality): MunicipalitySummary => {
    if (!failed.has(municipality)) return { municipality, status: "ok", failedFacilities: [] };
    const own = records.filter((r) => r.municipality === municipality);
    return {
      municipality,
      status: statusFromRecords(own),
      failedFacilities: [...new Set(own.map((r) => r.facility))].sort(),
    };
  });
  return { ...meta, municipalities: summaries };
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory && npm run typecheck -w @shisetsu-viewer/factory`
Expected: PASS

- [ ] **Step 6: CI と knip に登録する**

`.github/workflows/nodejs.yml` の test ジョブで、「Shared unit tests」の直後に追加する。

```yaml
      - name: Factory unit tests
        run: npm run test -w @shisetsu-viewer/factory
```

`knip.config.ts` の `workspaces` に追加する。

```ts
    "packages/factory": {
      entry: ["src/cli/*.ts"],
    },
```

Run: `npm run knip && npm run lint:all && npm run format:check:all`
Expected: PASS

- [ ] **Step 7: commit する**

```bash
git add packages/factory package-lock.json knip.config.ts .github/workflows/nodejs.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): 定期スクレイプの結果を自治体別の run summary にまとめる"
```

### Task 4: Run Scraper が run-summary を artifact として出す

**Files:**
- Create: `packages/factory/src/gh.ts`
- Create: `packages/factory/src/cli/summarize.ts`
- Modify: `.github/workflows/scraper.yml`（`collect_failures` ジョブ）

**Interfaces:**
- Consumes: `buildRunSummary`、`parseFailureRecord`（Task 3）
- Produces: artifact `run-summary`（中身は `run-summary.json`、型は `RunSummary`）。Task 8 が読む。
- Produces（`src/gh.ts`）: `gh(args: readonly string[], input?: string): string`、`ghJson<T>(args: readonly string[]): T`。Task 8 で関数を足す。

`gh.ts` と CLI は `gh` を呼ぶだけの薄い層なので単体テストを書かず、Step 4 の実走で確かめる。

- [ ] **Step 1: gh の薄いラッパを書く**

`packages/factory/src/gh.ts`:

```ts
import { execFileSync } from "node:child_process";

/** gh CLI を呼ぶ。{owner}/{repo} のプレースホルダは GH_REPO かカレントリポジトリで解決される。 */
export function gh(args: readonly string[], input?: string): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
}

export function ghJson<T>(args: readonly string[]): T {
  return JSON.parse(gh(args)) as T;
}
```

- [ ] **Step 2: summarize CLI を書く**

`packages/factory/src/cli/summarize.ts`:

```ts
/**
 * Run Scraper の最終ジョブから呼ばれ、run-summary.json を書く。
 *
 * 使い方: node packages/factory/src/cli/summarize.ts --run-id <id> --failures-dir <dir> --out <file>
 * 前提: GH_TOKEN と GH_REPO が設定されていること。
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { gh, ghJson } from "../gh.ts";
import { buildRunSummary, parseFailureRecord } from "../runSummary.ts";
import type { FailureRecordLite, JobInfo } from "../types.ts";

const { values } = parseArgs({
  options: {
    "run-id": { type: "string" },
    "failures-dir": { type: "string" },
    out: { type: "string" },
  },
});
const runId = values["run-id"];
const failuresDir = values["failures-dir"];
const out = values.out;
if (!runId || !failuresDir || !out) {
  console.error("usage: summarize.ts --run-id <id> --failures-dir <dir> --out <file>");
  process.exit(2);
}

function readRecords(dir: string): FailureRecordLite[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return readRecords(p);
    if (!entry.name.endsWith(".json")) return [];
    try {
      const record = parseFailureRecord(JSON.parse(fs.readFileSync(p, "utf8")));
      return record === null ? [] : [record];
    } catch {
      return [];
    }
  });
}

const run = ghJson<{ html_url: string; created_at: string }>([
  "api",
  `repos/{owner}/{repo}/actions/runs/${runId}`,
]);
const jobs = gh([
  "api",
  "--paginate",
  `repos/{owner}/{repo}/actions/runs/${runId}/jobs?per_page=100`,
  "--jq",
  ".jobs[] | {name, conclusion}",
])
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as JobInfo);

const summary = buildRunSummary(
  { runId: Number(runId), runUrl: run.html_url, createdAt: run.created_at },
  jobs,
  readRecords(failuresDir)
);
fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);

const stepSummary = process.env["GITHUB_STEP_SUMMARY"];
if (stepSummary) {
  const rows = summary.municipalities.map(
    (m) => `| ${m.municipality} | ${m.status} | ${m.failedFacilities.join("、")} |`
  );
  fs.appendFileSync(
    stepSummary,
    ["## 自治体別の結果", "", "| 自治体 | 状態 | 失敗施設 |", "|---|---|---|", ...rows, ""].join("\n")
  );
}
console.log(JSON.stringify(summary));
```

- [ ] **Step 3: scraper.yml の collect_failures を拡張する**

`.github/workflows/scraper.yml` の `collect_failures` ジョブの `permissions` に `actions: read` を足す。

```yaml
    permissions:
      contents: read
      issues: write
      actions: read
```

`steps:` の先頭（「Download failure artifacts」の前）に追加する。

```yaml
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: Set Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .node-version
```

「Download failure artifacts」の直後に追加する。既存の「Aggregate and upsert tracker issue」は Task 10 まで残す。

```yaml
      - name: Build run summary
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
        run: node packages/factory/src/cli/summarize.ts --run-id "${{ github.run_id }}" --failures-dir failures --out run-summary.json
      - name: Upload run summary
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: run-summary
          path: run-summary.json
          retention-days: 30
```

- [ ] **Step 4: ローカルで既存の run に対して実走する**

```bash
RUN=$(gh run list --workflow scraper.yml --event schedule --status completed --limit 1 --json databaseId --jq '.[0].databaseId')
mkdir -p "$TMPDIR/factory-failures" && gh run download "$RUN" -p 'failures-retry-*' -D "$TMPDIR/factory-failures" || true
node packages/factory/src/cli/summarize.ts --run-id "$RUN" --failures-dir "$TMPDIR/factory-failures" --out "$TMPDIR/run-summary.json"
cat "$TMPDIR/run-summary.json"
```

Expected: 全自治体が並び、その run で落ちていた自治体（例 tokyo-kita）が `structural` か `unknown` になる。

- [ ] **Step 5: lint と型を確認して commit する**

Run: `npm run typecheck -w @shisetsu-viewer/factory && npm run lint:all && npm run format:check:all && npm run knip`

```bash
git add packages/factory/src/gh.ts packages/factory/src/cli/summarize.ts .github/workflows/scraper.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(ci): Run Scraper が自治体別の run-summary を artifact に出す"
```

- [ ] **Step 6: PR を出し、PR ブランチで Run Scraper を 1 自治体だけ dispatch して確かめる**

```bash
git push -u origin HEAD
gh pr create --title "feat: 失敗分類に infra を足し、Run Scraper が自治体別 run-summary を出す" --body "software factory フェーズ 1（spec: docs/superpowers/specs/2026-10-04-software-factory-design.md）。Task 2〜4。

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh workflow run scraper.yml --ref "$(git branch --show-current)" -f municipality=tokyo-sumida
```

Expected: run の Summary に「自治体別の結果」の表が出て、artifact `run-summary` がある。Mac の proxy が止まっていれば sumida が `infra` になる。

---

## フェーズ 2：制御層（observe）

### Task 5: 作業項目 Issue の本文を読み書きする

**Files:**
- Create: `packages/factory/src/workItem.ts`
- Test: `packages/factory/src/workItem.test.ts`
- Modify: `packages/factory/src/types.ts`

**Interfaces:**
- Produces（`types.ts` に追加）:

```ts
export interface ItemState { readonly consecutive: number; readonly lastRunId: number | null }
export interface WorkItem { readonly number: number; readonly key: string; readonly labels: readonly string[]; readonly state: ItemState | null }
```

- Produces: `parseKey(body: string): string | null`、`parseState(body: string): ItemState | null`、`renderBody(key: string, state: ItemState, text: string): string`

- [ ] **Step 1: 型を足す**

`packages/factory/src/types.ts` の末尾に、上の `ItemState` と `WorkItem` を追加する。

- [ ] **Step 2: 失敗するテストを書く**

`packages/factory/src/workItem.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseKey, parseState, renderBody } from "./workItem.ts";

test("renderBody の出力から key と state を読み戻せる", () => {
  const body = renderBody("scraper-repair:tokyo-kita", { consecutive: 3, lastRunId: 42 }, "本文");
  assert.ok(body.startsWith("本文\n"));
  assert.equal(parseKey(body), "scraper-repair:tokyo-kita");
  assert.deepEqual(parseState(body), { consecutive: 3, lastRunId: 42 });
});

test("lastRunId は null を許す", () => {
  const body = renderBody("master-red", { consecutive: 1, lastRunId: null }, "x");
  assert.deepEqual(parseState(body), { consecutive: 1, lastRunId: null });
});

test("マーカーが無ければ null", () => {
  assert.equal(parseKey("普通の Issue"), null);
  assert.equal(parseState("普通の Issue"), null);
});

test("壊れた state は null になり、key は読める", () => {
  const body = "x\n<!-- factory:key infra:tokyo-sumida -->\n<!-- factory:state {consecutive: -->";
  assert.equal(parseKey(body), "infra:tokyo-sumida");
  assert.equal(parseState(body), null);
});

test("型の合わない state は null", () => {
  assert.equal(parseState('<!-- factory:state {"consecutive":"2","lastRunId":1} -->'), null);
});
```

- [ ] **Step 3: テストが落ちることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory`
Expected: FAIL（`./workItem.ts` が見つからない）

- [ ] **Step 4: 実装する**

`packages/factory/src/workItem.ts`:

```ts
import type { ItemState } from "./types.ts";

// key は重複排除に使うので、state とは別のマーカーに置く（state が壊れても key は読める）。
const KEY_RE = /<!-- factory:key (\S+) -->/;
const STATE_RE = /<!-- factory:state (\{.*?\}) -->/;

export function parseKey(body: string): string | null {
  return KEY_RE.exec(body)?.[1] ?? null;
}

export function parseState(body: string): ItemState | null {
  const raw = STATE_RE.exec(body)?.[1];
  if (raw === undefined) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { consecutive, lastRunId } = value as Record<string, unknown>;
    if (typeof consecutive !== "number") return null;
    if (typeof lastRunId !== "number" && lastRunId !== null) return null;
    return { consecutive, lastRunId };
  } catch {
    return null;
  }
}

export function renderBody(key: string, state: ItemState, text: string): string {
  return `${text}\n\n<!-- factory:key ${key} -->\n<!-- factory:state ${JSON.stringify(state)} -->\n`;
}
```

- [ ] **Step 5: テストが通ることを確認して commit する**

Run: `npm run test -w @shisetsu-viewer/factory && npm run typecheck -w @shisetsu-viewer/factory`
Expected: PASS

```bash
git add packages/factory/src/types.ts packages/factory/src/workItem.ts packages/factory/src/workItem.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): 作業項目 Issue の key と state を本文に埋め込む"
```

### Task 6: dependabot PR を分類する

**Files:**
- Create: `packages/factory/src/dependabot.ts`
- Test: `packages/factory/src/dependabot.test.ts`
- Modify: `packages/factory/src/types.ts`

**Interfaces:**
- Produces（`types.ts` に追加）:

```ts
export type CiConclusion = "success" | "failure" | "pending";
export interface DependabotPr { readonly number: number; readonly title: string; readonly body: string; readonly ci: CiConclusion; readonly labels: readonly string[] }
```

- Produces: `type DependabotDecision = "auto-merge" | "needs-human" | "investigate" | "wait"`、`classifyDependabotPr(pr: DependabotPr): DependabotDecision`、`ciFromRollup(rollup: readonly { name?: string; conclusion?: string | null }[]): CiConclusion`

- [ ] **Step 1: 型を足す**

`packages/factory/src/types.ts` の末尾に、上の `CiConclusion` と `DependabotPr` を追加する。

- [ ] **Step 2: 失敗するテストを書く**

`packages/factory/src/dependabot.test.ts`（本文は実際の #1709 と #1696 の形式に合わせている）:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { ciFromRollup, classifyDependabotPr } from "./dependabot.ts";
import type { CiConclusion, DependabotPr } from "./types.ts";

function pr(title: string, updates: string[], ci: CiConclusion): DependabotPr {
  const body = [
    "Bumps the testing group with 3 updates in the / directory: [x](https://example.test).",
    "",
    ...updates,
    "<details><summary>Release notes</summary>Migrating from 1.0.0 to 9.0.0</details>",
  ].join("\n");
  return { number: 1, title, body, ci, labels: [] };
}

test("minor 更新で CI 緑なら auto-merge", () => {
  const p = pr("chore(deps-dev): bump smol-toml from 1.7.0 to 1.9.0", ["Updates `smol-toml` from 1.7.0 to 1.9.0"], "success");
  assert.equal(classifyDependabotPr(p), "auto-merge");
});

test("リリースノート中の from A to B は判定に使わない", () => {
  // 本文の details 内に 1.0.0 → 9.0.0 があるが、Updates 行は patch なので auto-merge
  const p = pr("chore(deps): bump the g group", ["Updates `a` from 2.3.4 to 2.3.5"], "success");
  assert.equal(classifyDependabotPr(p), "auto-merge");
});

test("group 内に major が 1 つでもあれば needs-human", () => {
  const p = pr(
    "chore(deps-dev): bump the testing group across 1 directory with 3 updates",
    ["Updates `a` from 1.2.0 to 1.3.0", "Updates `vitest` from 4.1.10 to 5.0.1"],
    "success"
  );
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("0.x の minor 更新は破壊的とみなす", () => {
  const p = pr("chore(deps): bump x", ["Updates `x` from 0.5.2 to 0.6.0"], "success");
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("Cloudflare ツールチェインを含めば CI 緑でも needs-human", () => {
  const p = pr("chore(deps-dev): bump the build group", ["Updates `wrangler` from 4.40.0 to 4.41.0"], "success");
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("バージョンが読めなければ needs-human", () => {
  const p = pr("chore(deps): bump something", [], "success");
  assert.equal(classifyDependabotPr(p), "needs-human");
});

test("非破壊で CI 赤なら investigate、未完了なら wait", () => {
  const updates = ["Updates `a` from 1.2.0 to 1.2.1"];
  assert.equal(classifyDependabotPr(pr("chore: bump a", updates, "failure")), "investigate");
  assert.equal(classifyDependabotPr(pr("chore: bump a", updates, "pending")), "wait");
});

test("ciFromRollup は ci-success だけを見る", () => {
  assert.equal(ciFromRollup([{ name: "lint", conclusion: "FAILURE" }, { name: "ci-success", conclusion: "SUCCESS" }]), "success");
  assert.equal(ciFromRollup([{ name: "ci-success", conclusion: "FAILURE" }]), "failure");
  assert.equal(ciFromRollup([{ name: "ci-success", conclusion: null }]), "pending");
  assert.equal(ciFromRollup([{ name: "ci-success", conclusion: "CANCELLED" }]), "pending");
  assert.equal(ciFromRollup([]), "pending");
});
```

- [ ] **Step 3: テストが落ちることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory`
Expected: FAIL（`./dependabot.ts` が見つからない）

- [ ] **Step 4: 実装する**

`packages/factory/src/dependabot.ts`:

```ts
import type { CiConclusion, DependabotPr } from "./types.ts";

export type DependabotDecision = "auto-merge" | "needs-human" | "investigate" | "wait";

// 同日公開の組で揃える必要があり、単独で上げると workerd が多重化する（npm-lockfile の罠）。
const CF_TOOLCHAIN = ["wrangler", "miniflare", "@cloudflare/vitest-pool-workers"];
const VERSION_RE = /from v?(\d+)\.(\d+)\S* to v?(\d+)\.(\d+)/g;

/** タイトルと、本文の Updates/Bumps 行だけを判定対象にする（リリースノートの誤検知を避ける）。 */
function relevantText(pr: DependabotPr): string {
  const lines = pr.body.split("\n").filter((line) => /^(Updates|Bumps) /.test(line.trim()));
  return [pr.title, ...lines].join("\n");
}

/** 破壊的更新を含めば true、含まなければ false、バージョンが読めなければ null。 */
function hasBreakingBump(text: string): boolean | null {
  const matches = [...text.matchAll(VERSION_RE)];
  if (matches.length === 0) return null;
  return matches.some((m) => {
    const fromMajor = Number(m[1]);
    const fromMinor = Number(m[2]);
    const toMajor = Number(m[3]);
    const toMinor = Number(m[4]);
    // semver では 0.x の minor 更新も破壊的でありうる。
    return toMajor !== fromMajor || (fromMajor === 0 && toMinor !== fromMinor);
  });
}

export function classifyDependabotPr(pr: DependabotPr): DependabotDecision {
  const text = relevantText(pr);
  if (CF_TOOLCHAIN.some((name) => text.includes(name))) return "needs-human";
  if (hasBreakingBump(text) !== false) return "needs-human";
  if (pr.ci === "failure") return "investigate";
  if (pr.ci === "pending") return "wait";
  return "auto-merge";
}

/** Node CI の集約ジョブ ci-success の結果だけを見る（必須チェックと同じ基準）。 */
export function ciFromRollup(
  rollup: readonly { name?: string; conclusion?: string | null }[]
): CiConclusion {
  const check = rollup.find((c) => c.name === "ci-success");
  if (check?.conclusion === "SUCCESS") return "success";
  if (check?.conclusion === "FAILURE") return "failure";
  return "pending";
}
```

- [ ] **Step 5: テストが通ることを確認して commit する**

Run: `npm run test -w @shisetsu-viewer/factory && npm run typecheck -w @shisetsu-viewer/factory`
Expected: PASS

```bash
git add packages/factory/src/types.ts packages/factory/src/dependabot.ts packages/factory/src/dependabot.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): dependabot PR を自動マージ可否で分類する"
```

### Task 7: reconcile の判定を純関数で書く

**Files:**
- Create: `packages/factory/src/reconcile.ts`
- Test: `packages/factory/src/reconcile.test.ts`
- Modify: `packages/factory/src/types.ts`

**Interfaces:**
- Consumes: `RunSummary`（Task 3）、`WorkItem`、`ItemState`、`renderBody`（Task 5）、`DependabotPr`、`classifyDependabotPr`（Task 6）
- Produces（`types.ts` に追加）:

```ts
export interface MasterCi { readonly conclusion: string; readonly url: string }
export type Op =
  | { readonly type: "create"; readonly key: string; readonly title: string; readonly body: string; readonly labels: readonly string[]; readonly assignOwner: boolean }
  | { readonly type: "edit"; readonly number: number; readonly body: string | null; readonly addLabels: readonly string[]; readonly removeLabels: readonly string[]; readonly assignOwner: boolean; readonly comment: string | null }
  | { readonly type: "close"; readonly number: number; readonly comment: string };
```

- Produces（`reconcile.ts`）: `LABELS`（6 ラベルの定数）、`THRESHOLD = 2`、`interface ReconcileInput { summaries: readonly RunSummary[]; masterCi: MasterCi | null; dependabotPrs: readonly DependabotPr[]; items: readonly WorkItem[] }`、`reconcile(input: ReconcileInput): Op[]`

判定の規則は次のとおり。

- `summaries` は新しい順。最新サマリで `ok` の自治体は、`scraper-repair:<自治体>` と `infra:<自治体>` の項目をクローズする。
- 最新から数えて `structural` または `unknown` が 2 回以上連続すれば、`scraper-repair:<自治体>` を `factory:queued` で作る。`infra` が 2 回以上連続すれば、`infra:<自治体>` を `factory:needs-human` で作り、所有者を assign する。
- 最新サマリに載っていない自治体と、`transient` の自治体には何もしない。
- master の Node CI が `failure` なら `master-red` を queued で作り、`success` ならクローズする。
- 既存項目に `factory:needs-human` が付いていれば、それを外さない（人間への引き渡しは一方向）。
- `factory:hold` の項目には一切の操作をしない。
- state もラベルも変わらなければ操作を出さない（冪等）。

- [ ] **Step 1: 型を足す**

`packages/factory/src/types.ts` の末尾に、上の `MasterCi` と `Op` を追加する（各プロパティを 1 行に展開する）。

- [ ] **Step 2: 失敗するテストを書く**

`packages/factory/src/reconcile.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { LABELS, reconcile, type ReconcileInput } from "./reconcile.ts";
import type { DependabotPr, MunicipalityStatus, RunSummary, WorkItem } from "./types.ts";
import { renderBody } from "./workItem.ts";

function summary(runId: number, entries: Record<string, MunicipalityStatus>): RunSummary {
  return {
    runId,
    runUrl: `https://example.test/runs/${runId}`,
    createdAt: "2026-10-03T08:23:00Z",
    municipalities: Object.entries(entries).map(([municipality, status]) => ({
      municipality,
      status,
      failedFacilities: status === "ok" ? [] : ["つつじホール"],
    })),
  };
}

function input(partial: Partial<ReconcileInput>): ReconcileInput {
  return { summaries: [], masterCi: null, dependabotPrs: [], items: [], ...partial };
}

function item(number: number, key: string, labels: string[], state = { consecutive: 2, lastRunId: 300 }): WorkItem {
  return { number, key, labels, state };
}

test("2026-09 の停止の再現：kita が 3 回連続 structural なら修復項目を queued で作る", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(300, { "tokyo-kita": "structural", "tokyo-ota": "ok" }),
        summary(299, { "tokyo-kita": "structural", "tokyo-ota": "transient" }),
        summary(298, { "tokyo-kita": "structural", "tokyo-ota": "ok" }),
      ],
    })
  );
  assert.equal(ops.length, 1);
  const op = ops[0];
  assert.ok(op?.type === "create");
  assert.equal(op.key, "scraper-repair:tokyo-kita");
  assert.deepEqual(op.labels, [LABELS.base, LABELS.queued]);
  assert.equal(op.assignOwner, false);
  assert.ok(op.body.includes('"consecutive":3'));
  assert.ok(op.body.includes("つつじホール"));
});

test("1 回だけの structural では作らない", () => {
  const ops = reconcile(input({ summaries: [summary(300, { "tokyo-kita": "structural" }), summary(299, { "tokyo-kita": "ok" })] }));
  assert.deepEqual(ops, []);
});

test("unknown も修復の連続に数える", () => {
  const ops = reconcile(input({ summaries: [summary(300, { "tokyo-chuo": "unknown" }), summary(299, { "tokyo-chuo": "structural" })] }));
  assert.equal(ops[0]?.type, "create");
});

test("infra が 2 回続けば needs-human で作り、所有者を assign する", () => {
  const ops = reconcile(input({ summaries: [summary(300, { "tokyo-sumida": "infra" }), summary(299, { "tokyo-sumida": "infra" })] }));
  const op = ops[0];
  assert.ok(op?.type === "create");
  assert.equal(op.key, "infra:tokyo-sumida");
  assert.deepEqual(op.labels, [LABELS.base, LABELS.needsHuman]);
  assert.equal(op.assignOwner, true);
});

test("最新で ok に戻れば既存項目をクローズする", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.equal(ops.length, 1);
  assert.ok(ops[0]?.type === "close");
  assert.equal(ops[0].number, 10);
});

test("hold は解消してもクローズしない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued, LABELS.hold])],
    })
  );
  assert.deepEqual(ops, []);
});

test("hold は失敗が続いても編集しない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "structural" }), summary(300, { "tokyo-kita": "structural" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.hold], { consecutive: 9, lastRunId: 1 })],
    })
  );
  assert.deepEqual(ops, []);
});

test("最新サマリに自治体が無ければ触らない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-ota": "ok" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.deepEqual(ops, []);
});

test("サマリが 1 件も無ければ scraper 系の項目に触らない", () => {
  const ops = reconcile(input({ items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])] }));
  assert.deepEqual(ops, []);
});

test("transient では既存項目を閉じも更新もしない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "transient" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued])],
    })
  );
  assert.deepEqual(ops, []);
});

test("state もラベルも同じなら何もしない（冪等）", () => {
  const ops = reconcile(
    input({
      summaries: [summary(300, { "tokyo-kita": "structural" }), summary(299, { "tokyo-kita": "structural" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued], { consecutive: 2, lastRunId: 300 })],
    })
  );
  assert.deepEqual(ops, []);
});

test("連続回数が増えれば本文だけ更新する", () => {
  const ops = reconcile(
    input({
      summaries: [
        summary(301, { "tokyo-kita": "structural" }),
        summary(300, { "tokyo-kita": "structural" }),
        summary(299, { "tokyo-kita": "structural" }),
      ],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.queued], { consecutive: 2, lastRunId: 300 })],
    })
  );
  const op = ops[0];
  assert.ok(op?.type === "edit");
  assert.ok(op.body?.includes('"consecutive":3'));
  assert.deepEqual(op.addLabels, []);
  assert.deepEqual(op.removeLabels, []);
});

test("needs-human は queued に戻さない", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "structural" }), summary(300, { "tokyo-kita": "structural" })],
      items: [item(10, "scraper-repair:tokyo-kita", [LABELS.base, LABELS.needsHuman], { consecutive: 2, lastRunId: 300 })],
    })
  );
  const op = ops[0];
  assert.ok(op?.type === "edit");
  assert.deepEqual(op.addLabels, []);
  assert.deepEqual(op.removeLabels, []);
});

test("state が壊れた既存項目は作り直さず edit する", () => {
  const ops = reconcile(
    input({
      summaries: [summary(301, { "tokyo-kita": "structural" }), summary(300, { "tokyo-kita": "structural" })],
      items: [{ number: 10, key: "scraper-repair:tokyo-kita", labels: [LABELS.base, LABELS.queued], state: null }],
    })
  );
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.type, "edit");
});

test("master の CI が赤なら master-red を作り、緑に戻ればクローズする", () => {
  const red = reconcile(input({ masterCi: { conclusion: "failure", url: "https://example.test/ci/1" } }));
  assert.ok(red[0]?.type === "create");
  assert.equal(red[0].key, "master-red");

  const green = reconcile(
    input({
      masterCi: { conclusion: "success", url: "https://example.test/ci/2" },
      items: [item(20, "master-red", [LABELS.base, LABELS.queued], { consecutive: 1, lastRunId: null })],
    })
  );
  assert.ok(green[0]?.type === "close");
  assert.equal(green[0].number, 20);
});

test("dependabot：自動マージ可なら factory と queued を付けてコメントする", () => {
  const pr: DependabotPr = {
    number: 1696,
    title: "chore(deps-dev): bump smol-toml from 1.7.0 to 1.9.0",
    body: "Updates `smol-toml` from 1.7.0 to 1.9.0",
    ci: "success",
    labels: ["dependencies"],
  };
  const op = reconcile(input({ dependabotPrs: [pr] }))[0];
  assert.ok(op?.type === "edit");
  assert.equal(op.number, 1696);
  assert.equal(op.body, null);
  assert.deepEqual(op.addLabels, [LABELS.base, LABELS.queued]);
  assert.ok(op.comment?.includes("auto-merge"));
});

test("dependabot：既に同じラベルなら何もしない、CI 待ちなら何もしない", () => {
  const base = { number: 1, title: "bump a from 1.0.0 to 1.0.1", body: "", ci: "success" as const };
  assert.deepEqual(reconcile(input({ dependabotPrs: [{ ...base, labels: [LABELS.base, LABELS.queued] }] })), []);
  assert.deepEqual(reconcile(input({ dependabotPrs: [{ ...base, ci: "pending", labels: [] }] })), []);
});

test("dependabot：major は needs-human にして assign する", () => {
  const pr: DependabotPr = {
    number: 1709,
    title: "chore(deps-dev): bump the testing group across 1 directory with 3 updates",
    body: "Updates `vitest` from 4.1.10 to 5.0.1",
    ci: "failure",
    labels: [],
  };
  const op = reconcile(input({ dependabotPrs: [pr] }))[0];
  assert.ok(op?.type === "edit");
  assert.deepEqual(op.addLabels, [LABELS.base, LABELS.needsHuman]);
  assert.equal(op.assignOwner, true);
});

test("renderBody と組み合わせても key がずれない", () => {
  assert.ok(renderBody("master-red", { consecutive: 1, lastRunId: null }, "x").includes("factory:key master-red"));
});
```

- [ ] **Step 3: テストが落ちることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory`
Expected: FAIL（`./reconcile.ts` が見つからない）

- [ ] **Step 4: 実装する**

`packages/factory/src/reconcile.ts`:

```ts
import { classifyDependabotPr } from "./dependabot.ts";
import type {
  DependabotPr,
  ItemState,
  MasterCi,
  MunicipalityStatus,
  Op,
  RunSummary,
  WorkItem,
} from "./types.ts";
import { renderBody } from "./workItem.ts";

export const LABELS = {
  base: "factory",
  queued: "factory:queued",
  running: "factory:running",
  prOpen: "factory:pr-open",
  needsHuman: "factory:needs-human",
  hold: "factory:hold",
} as const;

// 状態ラベルは同時に 1 つだけ付く。
const STATE_LABELS: readonly string[] = [
  LABELS.queued,
  LABELS.running,
  LABELS.prOpen,
  LABELS.needsHuman,
];

/** 単発の失敗は retry と次回の実行に任せ、この回数続いたものだけを作業にする。 */
export const THRESHOLD = 2;

const OBSERVE_NOTE = "_observe モード：factory が on なら、ここでステーションを起動していた。_";

export interface ReconcileInput {
  readonly summaries: readonly RunSummary[];
  readonly masterCi: MasterCi | null;
  readonly dependabotPrs: readonly DependabotPr[];
  readonly items: readonly WorkItem[];
}

interface Desired {
  readonly key: string;
  readonly title: string;
  readonly text: string;
  readonly state: ItemState;
  readonly stateLabel: string;
  readonly assignOwner: boolean;
}

interface Resolved {
  readonly key: string;
  readonly reason: string;
}

function consecutive(
  summaries: readonly RunSummary[],
  municipality: string,
  statuses: readonly MunicipalityStatus[]
): number {
  let n = 0;
  for (const s of summaries) {
    const m = s.municipalities.find((x) => x.municipality === municipality);
    if (m === undefined || !statuses.includes(m.status)) break;
    n++;
  }
  return n;
}

function scraperDesired(summaries: readonly RunSummary[]): {
  desired: Desired[];
  resolved: Resolved[];
} {
  const desired: Desired[] = [];
  const resolved: Resolved[] = [];
  const latest = summaries[0];
  if (latest === undefined) return { desired, resolved };

  for (const m of latest.municipalities) {
    if (m.status === "ok") {
      const reason = `run ${latest.runId}（${latest.runUrl}）で ${m.municipality} は全シャード成功したためクローズする。`;
      resolved.push({ key: `scraper-repair:${m.municipality}`, reason });
      resolved.push({ key: `infra:${m.municipality}`, reason });
      continue;
    }
    const facilities = m.failedFacilities.length > 0 ? m.failedFacilities.join("、") : "（レコードなし）";
    const repairN = consecutive(summaries, m.municipality, ["structural", "unknown"]);
    if (repairN >= THRESHOLD) {
      desired.push({
        key: `scraper-repair:${m.municipality}`,
        title: `[factory] スクレイパー修復: ${m.municipality}`,
        text: [
          `${m.municipality} の定期実行が ${repairN} 回連続で構造系の失敗（${m.status}）になっている。`,
          "",
          `- 失敗施設: ${facilities}`,
          `- 最新 run: ${latest.runUrl}`,
          `- 手動で直す場合: \`/repair-scraper ${m.municipality}\``,
          "",
          OBSERVE_NOTE,
        ].join("\n"),
        state: { consecutive: repairN, lastRunId: latest.runId },
        stateLabel: LABELS.queued,
        assignOwner: false,
      });
    }
    const infraN = consecutive(summaries, m.municipality, ["infra"]);
    if (infraN >= THRESHOLD) {
      desired.push({
        key: `infra:${m.municipality}`,
        title: `[factory] 国内 proxy の経路断: ${m.municipality}`,
        text: [
          `${m.municipality} の定期実行が ${infraN} 回連続で国内 proxy の経路断になっている。`,
          "エージェントでは直せない。Mac のスリープ、cloudflared、tinyproxy を確認する（packages/scraper/tools/jp-proxy/README.md）。",
          "",
          `- 最新 run: ${latest.runUrl}`,
        ].join("\n"),
        state: { consecutive: infraN, lastRunId: latest.runId },
        stateLabel: LABELS.needsHuman,
        assignOwner: true,
      });
    }
  }
  return { desired, resolved };
}

function masterDesired(masterCi: MasterCi | null): { desired: Desired[]; resolved: Resolved[] } {
  if (masterCi?.conclusion === "failure") {
    return {
      desired: [
        {
          key: "master-red",
          title: "[factory] master の CI が赤い",
          text: [`master の Node CI が失敗している: ${masterCi.url}`, "", OBSERVE_NOTE].join("\n"),
          state: { consecutive: 1, lastRunId: null },
          stateLabel: LABELS.queued,
          assignOwner: false,
        },
      ],
      resolved: [],
    };
  }
  if (masterCi?.conclusion === "success") {
    return {
      desired: [],
      resolved: [{ key: "master-red", reason: `master の Node CI が緑に戻った: ${masterCi.url}` }],
    };
  }
  return { desired: [], resolved: [] };
}

function itemOp(d: Desired, existing: WorkItem | undefined): Op | null {
  const body = renderBody(d.key, d.state, d.text);
  if (existing === undefined) {
    return {
      type: "create",
      key: d.key,
      title: d.title,
      body,
      labels: [LABELS.base, d.stateLabel],
      assignOwner: d.assignOwner,
    };
  }
  if (existing.labels.includes(LABELS.hold)) return null;
  const current = STATE_LABELS.find((l) => existing.labels.includes(l));
  // 人間への引き渡しは一方向。reconcile が needs-human を外すことはない。
  const target = current === LABELS.needsHuman ? LABELS.needsHuman : d.stateLabel;
  const stateChanged =
    existing.state?.consecutive !== d.state.consecutive ||
    existing.state?.lastRunId !== d.state.lastRunId;
  if (!stateChanged && current === target) return null;
  return {
    type: "edit",
    number: existing.number,
    body,
    addLabels: current === target ? [] : [target],
    removeLabels: STATE_LABELS.filter((l) => l !== target && existing.labels.includes(l)),
    assignOwner: target === LABELS.needsHuman && current !== LABELS.needsHuman,
    comment: null,
  };
}

const DEPENDABOT_COMMENT = {
  "auto-merge": "observe モード：factory が on なら auto-merge を有効にしていた（CI 緑、patch または minor）。",
  investigate: "observe モード：factory が on なら CI 失敗の原因調査を起動していた。",
  "needs-human": "major 更新、Cloudflare ツールチェイン、またはバージョンを読めない更新を含むため、人間の判断が要る。",
} as const;

function dependabotOp(pr: DependabotPr): Op | null {
  if (pr.labels.includes(LABELS.hold)) return null;
  const decision = classifyDependabotPr(pr);
  if (decision === "wait") return null;
  const target = decision === "needs-human" ? LABELS.needsHuman : LABELS.queued;
  const hasBase = pr.labels.includes(LABELS.base);
  const current = STATE_LABELS.find((l) => pr.labels.includes(l));
  if (hasBase && current === target) return null;
  return {
    type: "edit",
    number: pr.number,
    body: null,
    addLabels: [...(hasBase ? [] : [LABELS.base]), ...(current === target ? [] : [target])],
    removeLabels: STATE_LABELS.filter((l) => l !== target && pr.labels.includes(l)),
    assignOwner: target === LABELS.needsHuman,
    comment: DEPENDABOT_COMMENT[decision],
  };
}

/**
 * 現在の状態（サマリ、CI、PR、既存の作業項目）から、作業項目 Issue への操作を計算する。
 * 副作用を持たず、同じ入力には同じ操作を返す。
 */
export function reconcile(input: ReconcileInput): Op[] {
  const byKey = new Map(input.items.map((i) => [i.key, i]));
  const scraper = scraperDesired(input.summaries);
  const master = masterDesired(input.masterCi);
  const ops: Op[] = [];

  for (const d of [...scraper.desired, ...master.desired]) {
    const op = itemOp(d, byKey.get(d.key));
    if (op !== null) ops.push(op);
  }
  for (const r of [...scraper.resolved, ...master.resolved]) {
    const existing = byKey.get(r.key);
    if (existing === undefined || existing.labels.includes(LABELS.hold)) continue;
    ops.push({ type: "close", number: existing.number, comment: r.reason });
  }
  for (const pr of input.dependabotPrs) {
    const op = dependabotOp(pr);
    if (op !== null) ops.push(op);
  }
  return ops;
}
```

- [ ] **Step 5: テストが通ることを確認して commit する**

Run: `npm run test -w @shisetsu-viewer/factory && npm run typecheck -w @shisetsu-viewer/factory && npm run lint:all && npm run format:check:all`
Expected: PASS

```bash
git add packages/factory/src/types.ts packages/factory/src/reconcile.ts packages/factory/src/reconcile.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): 状態から作業項目への操作を計算する reconcile を追加する"
```

### Task 8: reconcile を GitHub に接続し、factory.yml で observe 運用する

**Files:**
- Modify: `packages/factory/src/gh.ts`
- Create: `packages/factory/src/applyOps.ts`
- Create: `packages/factory/src/cli/reconcile.ts`
- Create: `.github/workflows/factory.yml`
- Modify: `.github/workflows/nodejs.yml`（`on:` に master への push を足す）

**Interfaces:**
- Consumes: `reconcile`、`LABELS`（Task 7）、`parseKey`、`parseState`（Task 5）、`ciFromRollup`（Task 6）、`gh`、`ghJson`（Task 4）
- Produces（`gh.ts`）: `listScheduledScraperRuns(limit: number): { databaseId: number; url: string; createdAt: string }[]`、`downloadRunSummary(runId: number): RunSummary | null`、`latestMasterCi(): MasterCi | null`、`listFactoryItems(): WorkItem[]`、`listDependabotPrs(): DependabotPr[]`、`latestRunCreatedAt(workflow: string, event: string | null): string | null`
- Produces（`applyOps.ts`）: `ensureLabels(): void`、`applyOps(ops: readonly Op[], owner: string): void`

この層は `gh` を呼ぶだけなので単体テストを書かない。Step 5 の dry-run と Step 8 の実走で確かめる。

- [ ] **Step 1: master への push で Node CI を走らせる**

master-red の判定には master 上の CI 結果が要るが、現在の Node CI は pull_request でしか走らない。
`.github/workflows/nodejs.yml` の `on:` に追加する。

```yaml
  push:
    branches: [master]
```

- [ ] **Step 2: gh.ts に読み取り関数を足す**

`packages/factory/src/gh.ts` の import を次に置き換え、末尾に関数を追加する。

```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ciFromRollup } from "./dependabot.ts";
import type { DependabotPr, MasterCi, RunSummary, WorkItem } from "./types.ts";
import { parseKey, parseState } from "./workItem.ts";
```

```ts
/** 定期実行の Run Scraper を新しい順に返す。 */
export function listScheduledScraperRuns(
  limit: number
): { databaseId: number; url: string; createdAt: string }[] {
  return ghJson([
    "run", "list", "--workflow", "scraper.yml", "--branch", "master", "--event", "schedule",
    "--status", "completed", "--limit", String(limit), "--json", "databaseId,url,createdAt",
  ]);
}

/** artifact run-summary を読む。フェーズ 1 以前の run や cancel された run では null。 */
export function downloadRunSummary(runId: number): RunSummary | null {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "run-summary-"));
  try {
    gh(["run", "download", String(runId), "-n", "run-summary", "-D", dir]);
    return JSON.parse(fs.readFileSync(path.join(dir, "run-summary.json"), "utf8")) as RunSummary;
  } catch {
    return null;
  }
}

export function latestMasterCi(): MasterCi | null {
  const runs = ghJson<MasterCi[]>([
    "run", "list", "--workflow", "nodejs.yml", "--branch", "master", "--event", "push",
    "--status", "completed", "--limit", "1", "--json", "conclusion,url",
  ]);
  return runs[0] ?? null;
}

/** ラベル factory の開いた Issue のうち、key マーカーを持つものを返す（PR は含まない）。 */
export function listFactoryItems(): WorkItem[] {
  const issues = ghJson<{ number: number; body: string; labels: { name: string }[] }[]>([
    "issue", "list", "--label", "factory", "--state", "open", "--limit", "200",
    "--json", "number,body,labels",
  ]);
  return issues.flatMap((i) => {
    const key = parseKey(i.body);
    if (key === null) return [];
    return [{ number: i.number, key, labels: i.labels.map((l) => l.name), state: parseState(i.body) }];
  });
}

export function listDependabotPrs(): DependabotPr[] {
  const prs = ghJson<
    {
      number: number;
      title: string;
      body: string;
      labels: { name: string }[];
      statusCheckRollup: { name?: string; conclusion?: string | null }[];
    }[]
  >([
    "pr", "list", "--author", "app/dependabot", "--state", "open", "--limit", "100",
    "--json", "number,title,body,labels,statusCheckRollup",
  ]);
  return prs.map((p) => ({
    number: p.number,
    title: p.title,
    body: p.body,
    ci: ciFromRollup(p.statusCheckRollup),
    labels: p.labels.map((l) => l.name),
  }));
}

/** master 上の最新 run の作成時刻。event を指定すればその種類に絞る。 */
export function latestRunCreatedAt(workflow: string, event: string | null): string | null {
  const runs = ghJson<{ createdAt: string }[]>([
    "run", "list", "--workflow", workflow, "--branch", "master",
    ...(event === null ? [] : ["--event", event]),
    "--limit", "1", "--json", "createdAt",
  ]);
  return runs[0]?.createdAt ?? null;
}
```

oxfmt が配列を 1 要素 1 行に展開するので、Step 6 で `npm run format:fix:all` をかける。

- [ ] **Step 3: 操作を適用する層を書く**

`packages/factory/src/applyOps.ts`:

```ts
import { gh } from "./gh.ts";
import { LABELS } from "./reconcile.ts";
import type { Op } from "./types.ts";

const LABEL_SPECS: readonly { name: string; color: string; description: string }[] = [
  { name: LABELS.base, color: "5319e7", description: "software factory の作業項目" },
  { name: LABELS.queued, color: "c5def5", description: "factory: 起動待ち" },
  { name: LABELS.running, color: "0e8a16", description: "factory: ステーション実行中" },
  { name: LABELS.prOpen, color: "1d76db", description: "factory: PR を出してゲート待ち" },
  { name: LABELS.needsHuman, color: "d93f0b", description: "factory: 人間の判断が要る" },
  { name: LABELS.hold, color: "000000", description: "factory: この項目に手を出さない" },
];

function api(method: string, endpoint: string, payload: unknown): string {
  return gh(["api", "-X", method, endpoint, "--input", "-"], JSON.stringify(payload));
}

export function ensureLabels(): void {
  for (const l of LABEL_SPECS) {
    gh(["label", "create", l.name, "--color", l.color, "--description", l.description, "--force"]);
  }
}

/** Issue と PR は同じ issues API で扱える（ラベル、コメント、assign）。 */
export function applyOps(ops: readonly Op[], owner: string): void {
  for (const op of ops) {
    switch (op.type) {
      case "create": {
        const created = JSON.parse(
          api("POST", "repos/{owner}/{repo}/issues", {
            title: op.title,
            body: op.body,
            labels: op.labels,
            assignees: op.assignOwner ? [owner] : [],
          })
        ) as { number: number };
        console.log(`created #${created.number} (${op.key})`);
        break;
      }
      case "edit": {
        const issue = `repos/{owner}/{repo}/issues/${op.number}`;
        if (op.body !== null) api("PATCH", issue, { body: op.body });
        if (op.addLabels.length > 0) api("POST", `${issue}/labels`, { labels: op.addLabels });
        for (const label of op.removeLabels) {
          gh(["api", "-X", "DELETE", `${issue}/labels/${encodeURIComponent(label)}`]);
        }
        if (op.assignOwner) api("POST", `${issue}/assignees`, { assignees: [owner] });
        if (op.comment !== null) api("POST", `${issue}/comments`, { body: op.comment });
        console.log(`edited #${op.number}`);
        break;
      }
      case "close": {
        const issue = `repos/{owner}/{repo}/issues/${op.number}`;
        api("POST", `${issue}/comments`, { body: op.comment });
        api("PATCH", issue, { state: "closed", state_reason: "completed" });
        console.log(`closed #${op.number}`);
        break;
      }
    }
  }
}
```

- [ ] **Step 4: reconcile CLI を書く**

`packages/factory/src/cli/reconcile.ts`:

```ts
/**
 * factory の制御層。状態を読み、作業項目 Issue への操作を計算して適用する。
 *
 * 使い方: node packages/factory/src/cli/reconcile.ts [--dry-run]
 * 環境変数: FACTORY_MODE（off | observe | on、既定 observe）、FACTORY_OWNER（needs-human の assign 先）、
 *           GH_TOKEN、GH_REPO
 */
import { applyOps, ensureLabels } from "../applyOps.ts";
import {
  downloadRunSummary,
  latestMasterCi,
  listDependabotPrs,
  listFactoryItems,
  listScheduledScraperRuns,
} from "../gh.ts";
import { reconcile, THRESHOLD } from "../reconcile.ts";
import type { RunSummary } from "../types.ts";

// 連続回数を閾値より少し長く数えられるだけの run を読む。
const SUMMARY_WINDOW = THRESHOLD + 4;

const mode = process.env["FACTORY_MODE"] || "observe";
const owner = process.env["FACTORY_OWNER"];
const dryRun = process.argv.includes("--dry-run");

if (mode === "off") {
  console.log("FACTORY_MODE=off のため何もしない");
  process.exit(0);
}
if (mode !== "observe") {
  console.warn(`FACTORY_MODE=${mode} はフェーズ 2 では observe として扱う`);
}
if (!owner) {
  console.error("FACTORY_OWNER が未設定");
  process.exit(2);
}

const summaries = listScheduledScraperRuns(SUMMARY_WINDOW)
  .map((run) => downloadRunSummary(run.databaseId))
  .filter((s): s is RunSummary => s !== null);

const ops = reconcile({
  summaries,
  masterCi: latestMasterCi(),
  dependabotPrs: listDependabotPrs(),
  items: listFactoryItems(),
});

console.log(`summaries=${summaries.length} ops=${ops.length}`);
console.log(JSON.stringify(ops, null, 2));
if (!dryRun) {
  ensureLabels();
  applyOps(ops, owner);
}
```

- [ ] **Step 5: 手元で dry-run する**

Run: `FACTORY_OWNER=trfv node packages/factory/src/cli/reconcile.ts --dry-run`
Expected: `summaries=0`（フェーズ 1 のマージ前なら）または 1 以上。dependabot PR への edit 操作が並び、#1709 は `factory:needs-human` になる。GitHub には何も書かれない。

- [ ] **Step 6: factory.yml を書く**

`.github/workflows/factory.yml`:

```yaml
name: Factory

on:
  workflow_run:
    workflows: ["Run Scraper"]
    types: [completed]
    branches: [master]
  schedule:
    # Run Scraper が止まっても巡回と watchdog が回るようにする保険（JST 09:41）
    - cron: "41 0 * * *"
  workflow_dispatch:

permissions:
  contents: read
  actions: read
  issues: write
  pull-requests: write

concurrency:
  group: factory-reconcile
  cancel-in-progress: false

jobs:
  reconcile:
    # PR ブランチでの dispatch 実行には反応しない（定期実行の結果だけを信号にする）
    if: github.event_name != 'workflow_run' || github.event.workflow_run.event == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      GH_TOKEN: ${{ github.token }}
      GH_REPO: ${{ github.repository }}
      FACTORY_MODE: ${{ vars.FACTORY_MODE || 'observe' }}
      FACTORY_OWNER: ${{ github.repository_owner }}
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: Set Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .node-version
      - name: Reconcile
        run: node packages/factory/src/cli/reconcile.ts
```

- [ ] **Step 7: 確認して commit し、PR を出す**

Run: `npm run format:fix:all && npm run typecheck -w @shisetsu-viewer/factory && npm run lint:all && npm run knip`
Expected: PASS

```bash
git add packages/factory .github/workflows/factory.yml .github/workflows/nodejs.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): reconcile を GitHub に接続し observe モードで定期実行する"
git push -u origin HEAD
gh pr create --title "feat(factory): 制御層 reconcile を observe モードで動かす" --body "software factory フェーズ 2（spec: docs/superpowers/specs/2026-10-04-software-factory-design.md）。Task 5〜8。エージェントは起動しない。

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 8: マージ後に手動で 1 回実走する**

人間の確認を取ってマージした後、次を実行する。

```bash
gh variable set FACTORY_MODE --body observe
gh workflow run factory.yml --ref master
gh run watch "$(gh run list --workflow factory.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh issue list --label factory --state open
gh pr list --label factory
```

Expected: 6 つのラベルが作られ、dependabot PR に `factory` と状態ラベルが付く。2 回連続で失敗している自治体があれば、`[factory] スクレイパー修復: <自治体>` が作られる。

### Task 9: 相互監視（デッドマンスイッチ）

**Files:**
- Create: `packages/factory/src/watchdog.ts`
- Test: `packages/factory/src/watchdog.test.ts`
- Create: `packages/factory/src/cli/watchdog.ts`
- Modify: `.github/workflows/factory.yml`
- Modify: `.github/workflows/scraper.yml`（`collect_failures` ジョブ）

**Interfaces:**
- Consumes: `LABELS`（Task 7）、`renderBody`（Task 5）、`latestRunCreatedAt`、`listFactoryItems`（Task 8）、`applyOps`、`ensureLabels`（Task 8）
- Produces: `isStale(lastRunAt: string | null, now: Date, maxAgeHours: number): boolean`、`watchdogOps(input: { key: string; workflow: string; lastRunAt: string | null; now: Date; maxAgeHours: number; existing: WorkItem | null }): Op[]`

このタスクは、Task 8 の factory.yml が master で 1 回以上走った後に着手する。
`lastRunAt` が null（一度も走っていない）を「止まっている」とみなすため、先に入れると初回に誤報が出る。

- [ ] **Step 1: 失敗するテストを書く**

`packages/factory/src/watchdog.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { LABELS } from "./reconcile.ts";
import { isStale, watchdogOps } from "./watchdog.ts";

const NOW = new Date("2026-10-04T12:00:00Z");

test("26 時間以内なら新鮮、超えれば止まっている", () => {
  assert.equal(isStale("2026-10-03T11:00:00Z", NOW, 26), false);
  assert.equal(isStale("2026-10-03T09:00:00Z", NOW, 26), true);
});

test("一度も走っていなければ止まっているとみなす", () => {
  assert.equal(isStale(null, NOW, 26), true);
});

const base = { key: "watchdog:scraper", workflow: "scraper.yml", now: NOW, maxAgeHours: 26 };

test("止まっていて項目が無ければ needs-human で作る", () => {
  const ops = watchdogOps({ ...base, lastRunAt: "2026-10-01T00:00:00Z", existing: null });
  const op = ops[0];
  assert.ok(op?.type === "create");
  assert.equal(op.key, "watchdog:scraper");
  assert.deepEqual(op.labels, [LABELS.base, LABELS.needsHuman]);
  assert.equal(op.assignOwner, true);
});

test("止まっていて項目が既にあれば何もしない", () => {
  const existing = { number: 5, key: "watchdog:scraper", labels: [LABELS.base, LABELS.needsHuman], state: null };
  assert.deepEqual(watchdogOps({ ...base, lastRunAt: null, existing }), []);
});

test("動いていれば既存項目をクローズする。hold なら残す", () => {
  const existing = { number: 5, key: "watchdog:scraper", labels: [LABELS.base, LABELS.needsHuman], state: null };
  assert.equal(watchdogOps({ ...base, lastRunAt: "2026-10-04T08:00:00Z", existing })[0]?.type, "close");
  assert.deepEqual(
    watchdogOps({
      ...base,
      lastRunAt: "2026-10-04T08:00:00Z",
      existing: { ...existing, labels: [...existing.labels, LABELS.hold] },
    }),
    []
  );
});
```

- [ ] **Step 2: テストが落ちることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory`
Expected: FAIL（`./watchdog.ts` が見つからない）

- [ ] **Step 3: 実装する**

`packages/factory/src/watchdog.ts`:

```ts
import { LABELS } from "./reconcile.ts";
import type { Op, WorkItem } from "./types.ts";
import { renderBody } from "./workItem.ts";

export function isStale(lastRunAt: string | null, now: Date, maxAgeHours: number): boolean {
  if (lastRunAt === null) return true;
  return now.getTime() - Date.parse(lastRunAt) > maxAgeHours * 60 * 60 * 1000;
}

export function watchdogOps(input: {
  key: string;
  workflow: string;
  lastRunAt: string | null;
  now: Date;
  maxAgeHours: number;
  existing: WorkItem | null;
}): Op[] {
  const stale = isStale(input.lastRunAt, input.now, input.maxAgeHours);
  if (stale) {
    if (input.existing !== null) return [];
    const text = [
      `${input.workflow} の最終実行が ${input.maxAgeHours} 時間以上前（${input.lastRunAt ?? "記録なし"}）。`,
      "workflow が無効化されていないか（60 日無活動の自動無効化を含む）、Actions の画面で確認する。",
    ].join("\n");
    return [
      {
        type: "create",
        key: input.key,
        title: `[factory] 定期実行が止まっている: ${input.workflow}`,
        body: renderBody(input.key, { consecutive: 1, lastRunId: null }, text),
        labels: [LABELS.base, LABELS.needsHuman],
        assignOwner: true,
      },
    ];
  }
  if (input.existing === null || input.existing.labels.includes(LABELS.hold)) return [];
  return [
    {
      type: "close",
      number: input.existing.number,
      comment: `${input.workflow} が ${input.lastRunAt ?? ""} に実行されたためクローズする。`,
    },
  ];
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test -w @shisetsu-viewer/factory && npm run typecheck -w @shisetsu-viewer/factory`
Expected: PASS

- [ ] **Step 5: CLI を書く**

`packages/factory/src/cli/watchdog.ts`:

```ts
/**
 * 相手の workflow が止まっていないかを見る。
 *
 * 使い方: node packages/factory/src/cli/watchdog.ts --workflow <file> [--event <event>] --key <key> [--max-age-hours 26]
 * 環境変数: FACTORY_MODE、FACTORY_OWNER、GH_TOKEN、GH_REPO
 */
import { parseArgs } from "node:util";

import { applyOps, ensureLabels } from "../applyOps.ts";
import { latestRunCreatedAt, listFactoryItems } from "../gh.ts";
import { watchdogOps } from "../watchdog.ts";

const { values } = parseArgs({
  options: {
    workflow: { type: "string" },
    event: { type: "string" },
    key: { type: "string" },
    "max-age-hours": { type: "string", default: "26" },
  },
});
const workflow = values.workflow;
const key = values.key;
const owner = process.env["FACTORY_OWNER"];
if (!workflow || !key || !owner) {
  console.error("usage: watchdog.ts --workflow <file> [--event <event>] --key <key>（FACTORY_OWNER 必須）");
  process.exit(2);
}
if ((process.env["FACTORY_MODE"] || "observe") === "off") {
  console.log("FACTORY_MODE=off のため何もしない");
  process.exit(0);
}

const ops = watchdogOps({
  key,
  workflow,
  lastRunAt: latestRunCreatedAt(workflow, values.event ?? null),
  now: new Date(),
  maxAgeHours: Number(values["max-age-hours"]),
  existing: listFactoryItems().find((i) => i.key === key) ?? null,
});
console.log(JSON.stringify(ops, null, 2));
if (ops.length > 0) {
  ensureLabels();
  applyOps(ops, owner);
}
```

- [ ] **Step 6: 両方の workflow に組み込む**

`.github/workflows/factory.yml` の「Reconcile」の直前に追加する。

```yaml
      - name: Watchdog (Run Scraper)
        run: node packages/factory/src/cli/watchdog.ts --workflow scraper.yml --event schedule --key watchdog:scraper
```

`.github/workflows/scraper.yml` の `collect_failures` ジョブの末尾に追加する。

```yaml
      - name: Watchdog (Factory)
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
          FACTORY_MODE: ${{ vars.FACTORY_MODE || 'observe' }}
          FACTORY_OWNER: ${{ github.repository_owner }}
        run: node packages/factory/src/cli/watchdog.ts --workflow factory.yml --key watchdog:factory
```

- [ ] **Step 7: dry-run の代わりに読み取りだけ確かめ、commit する**

```bash
gh run list --workflow factory.yml --branch master --limit 1 --json createdAt
gh run list --workflow scraper.yml --branch master --event schedule --limit 1 --json createdAt
```

Expected: どちらも 26 時間以内の時刻が出る（出なければ着手条件を満たしていないので待つ）。

Run: `npm run format:fix:all && npm run lint:all && npm run knip`

```bash
git add packages/factory/src/watchdog.ts packages/factory/src/watchdog.test.ts packages/factory/src/cli/watchdog.ts .github/workflows/factory.yml .github/workflows/scraper.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): Run Scraper と factory を相互に監視する"
```

### Task 10: 旧 tracker を撤去し、運用文書を更新する

**Files:**
- Modify: `.github/workflows/scraper.yml`（「Aggregate and upsert tracker issue」ステップを削除）
- Modify: `.claude/commands/repair-scraper.md`（フェーズ 1 とフェーズ 5 の tracker 参照）
- Modify: `CLAUDE.md`（Cross-Package Architecture に 1 行）

このタスクは、Task 8 の reconcile が observe で 2 回以上実走し、`scraper-repair:*` 項目が期待どおり作られることを確かめた後に行う。
先に撤去すると、構造系失敗の通知が途切れる期間ができる。

- [ ] **Step 1: tracker の upsert を消す**

`.github/workflows/scraper.yml` の `collect_failures` から「Aggregate and upsert tracker issue」ステップを丸ごと削除する。
ジョブ名 `Collect structural failures` は、prepare_retry の正規表現に影響しないのでそのまま残す。
ジョブの `permissions` の `issues: write` は、Task 9 の watchdog が使うので残す。

- [ ] **Step 2: 開いている旧 tracker を閉じる**

```bash
gh issue list --search '"[scraper-repair] 構造変化の疑い" in:title' --state open --json number,title
```

各 Issue に、対応する factory 項目の番号を書いてクローズする（人間の確認を取ってから）。

```bash
gh issue close <n> --comment "factory の作業項目（#<新しい番号>）に移行した。今後の追跡はラベル factory で行う。"
```

- [ ] **Step 3: /repair-scraper の案内を factory 項目に合わせる**

`.claude/commands/repair-scraper.md` のフェーズ 5 手順 3 を次に置き換える。

```markdown
3. 作業項目 Issue（タイトル `[factory] スクレイパー修復: <municipality>`）に `gh issue comment` でエスカレーション要約を追記し、ラベル `factory:needs-human` を付けて人間に引き継ぐ:

   ```bash
   gh issue list --label factory --search '"スクレイパー修復: <municipality>" in:title' --state open
   gh issue comment <issue-number> --body "<エスカレーション要約>"
   gh issue edit <issue-number> --add-label factory:needs-human --remove-label factory:queued
   ```
```

フェーズ 1 手順 1 の案内文は、artifact 名が変わらない（`failures-retry-*`）のでそのまま残す。

- [ ] **Step 4: CLAUDE.md に 1 行足す**

`CLAUDE.md` の「Cross-Package Architecture」の末尾に追加する。

```markdown
- software factory: `packages/factory` の reconcile が定期スクレイプの run-summary、master の CI、dependabot PR から作業項目 Issue（ラベル `factory`）を維持する。repo variable `FACTORY_MODE`（off / observe / on）で止められる。設計は `docs/superpowers/specs/2026-10-04-software-factory-design.md`。
```

- [ ] **Step 5: commit して PR を出す**

```bash
git add .github/workflows/scraper.yml .claude/commands/repair-scraper.md CLAUDE.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "refactor(ci): 単一 tracker Issue を factory の作業項目に置き換える"
git push -u origin HEAD
gh pr create --title "feat(factory): 相互監視を入れ、単一 tracker を factory の作業項目に置き換える" --body "software factory フェーズ 2 の仕上げ（Task 9〜10）。

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

### Task 11: PR の変更クラスを observe でラベル付けする

**Files:**
- Create: `packages/factory/src/changeClass.ts`
- Test: `packages/factory/src/changeClass.test.ts`
- Modify: `packages/factory/src/types.ts`、`packages/factory/src/gh.ts`、`packages/factory/src/applyOps.ts`、`packages/factory/src/cli/reconcile.ts`

spec の「変更クラスによる承認条件」を、承認には使わずラベルとして付けるだけの形で入れる。
人間の PR も含む開いている全 PR に `change:<クラス>` を付け、Task 12 の 2 週間で人間の判断と比べる。
ラベルは PR の承認にもマージにも影響しないので、このフェーズで入れても副作用は無い。

**Interfaces:**
- Produces（`types.ts` に追加）:

```ts
export type ChangeClass =
  | "deps"
  | "scraper"
  | "engine"
  | "institutions"
  | "contract"
  | "migration"
  | "workflow"
  | "other";
export interface OpenPr {
  readonly number: number;
  readonly files: readonly string[];
  readonly labels: readonly string[];
}
```

- Produces: `CHANGE_CLASSES`（重い順の配列）、`classOfPath(path: string): ChangeClass`、`classifyChange(pr: OpenPr, dependabot: DependabotDecision | null): ChangeClass`、`changeLabelOps(prs: readonly OpenPr[], decisions: ReadonlyMap<number, DependabotDecision>): Op[]`
- Consumes: Task 6 の `DependabotDecision`（`dependabot.ts`）、`classifyDependabotPr`

- [ ] **Step 1: 失敗するテストを書く**

`packages/factory/src/changeClass.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { changeLabelOps, classifyChange, classOfPath } from "./changeClass.ts";
import type { OpenPr } from "./types.ts";

function pr(files: string[], labels: string[] = []): OpenPr {
  return { number: 1, files, labels };
}

test("パスごとのクラス", () => {
  assert.equal(classOfPath("packages/scraper/tokyo-kita-cocokita/index.ts"), "scraper");
  assert.equal(classOfPath("packages/scraper/engines/webrGrand.ts"), "engine");
  assert.equal(classOfPath("packages/scraper/data/institutions/tokyo-kita.json"), "institutions");
  assert.equal(classOfPath("packages/api/migrations/0003_auth.sql"), "migration");
  assert.equal(classOfPath("packages/api/src/worker.ts"), "contract");
  assert.equal(classOfPath("packages/shared/src/registry.ts"), "contract");
  assert.equal(classOfPath(".github/workflows/scraper.yml"), "workflow");
  assert.equal(classOfPath("packages/factory/src/reconcile.ts"), "workflow");
  assert.equal(classOfPath("packages/scraper/tools/spotcheck/plan.ts"), "workflow");
  assert.equal(classOfPath("packages/scraper/common/classifyFailure.ts"), "workflow");
  assert.equal(classOfPath("packages/scraper/common/browser.ts"), "other");
  assert.equal(classOfPath("docs/superpowers/specs/x.md"), "other");
});

test("重いクラスが勝つ", () => {
  // 実際の #1674 の形（migration と workflow と viewer を同時に変える）
  const p = pr([
    ".github/workflows/nodejs.yml",
    "packages/api/migrations/0003_auth.sql",
    "packages/viewer/App.tsx",
  ]);
  assert.equal(classifyChange(p, null), "workflow");
});

test("同じスクレイパーだけなら scraper、エンジンを含めば engine", () => {
  assert.equal(classifyChange(pr(["packages/scraper/tokyo-ota/index.ts"]), null), "scraper");
  assert.equal(
    classifyChange(
      pr(["packages/scraper/tokyo-ota/index.ts", "packages/scraper/engines/webrGrand.ts"]),
      null
    ),
    "engine"
  );
});

test("dependabot の auto-merge で依存ファイルだけなら deps", () => {
  const p = pr(["package.json", "package-lock.json", "packages/viewer/package.json"]);
  assert.equal(classifyChange(p, "auto-merge"), "deps");
  assert.equal(classifyChange(p, "needs-human"), "other");
});

test("dependabot でも workflow を含めば workflow", () => {
  const p = pr([".github/workflows/nodejs.yml"]);
  assert.equal(classifyChange(p, "auto-merge"), "workflow");
});

test("ファイルが無いか、一覧が上限で切れていれば other より軽くしない", () => {
  assert.equal(classifyChange(pr([]), null), "other");
  const truncated = Array.from({ length: 100 }, (_, i) => `packages/scraper/tokyo-ota/f${i}.ts`);
  assert.equal(classifyChange(pr(truncated), null), "other");
});

test("ラベルが正しければ何もしない、違えば付け替える、hold は触らない", () => {
  assert.deepEqual(changeLabelOps([pr(["docs/a.md"], ["change:other"])], new Map()), []);
  assert.deepEqual(changeLabelOps([pr(["docs/a.md"], ["change:scraper"])], new Map()), [
    {
      type: "edit",
      number: 1,
      body: null,
      addLabels: ["change:other"],
      removeLabels: ["change:scraper"],
      assignOwner: false,
      comment: null,
    },
  ]);
  assert.deepEqual(
    changeLabelOps([pr(["docs/a.md"], ["factory:hold"])], new Map()),
    []
  );
});
```

- [ ] **Step 2: テストが落ちることを確かめる**

```bash
npm run test -w @shisetsu-viewer/factory
```

Expected: `changeClass.ts` が無いため FAIL。

- [ ] **Step 3: 実装する**

`packages/factory/src/changeClass.ts`:

```ts
import type { DependabotDecision } from "./dependabot.ts";
import { LABELS } from "./reconcile.ts";
import type { ChangeClass, OpenPr, Op } from "./types.ts";

/** 承認が重い順。PR は含むパスのうちいちばん重いクラスになる。 */
export const CHANGE_CLASSES: readonly ChangeClass[] = [
  "workflow",
  "migration",
  "contract",
  "institutions",
  "other",
  "engine",
  "scraper",
  "deps",
];

const LABEL_PREFIX = "change:";

/** ゲートが証拠を取るためのコード。エージェントに触らせない（spec「自動マージのゲート」の禁止パス）。 */
const WORKFLOW_PATHS = [
  /^\.github\//,
  /^packages\/factory\//,
  /^packages\/scraper\/tools\/(repair|spotcheck)\//,
  /^packages\/scraper\/common\/classifyFailure\.ts$/,
];
const DEPENDENCY_FILE = /(^|\/)(package\.json|package-lock\.json)$/;
// gh pr list --json files は 1 PR あたり 100 ファイルで切れる
const FILES_LIMIT = 100;

export function classOfPath(path: string): ChangeClass {
  if (WORKFLOW_PATHS.some((re) => re.test(path))) return "workflow";
  if (path.startsWith("packages/api/migrations/")) return "migration";
  if (path.startsWith("packages/api/") || path.startsWith("packages/shared/")) return "contract";
  if (path.startsWith("packages/scraper/data/institutions/")) return "institutions";
  if (/^packages\/scraper\/engines\/[^/]+\.ts$/.test(path)) return "engine";
  if (/^packages\/scraper\/(tokyo|kanagawa)-[a-z-]+\//.test(path)) return "scraper";
  return "other";
}

export function classifyChange(pr: OpenPr, dependabot: DependabotDecision | null): ChangeClass {
  if (pr.files.length === 0) return "other";
  const classes = pr.files.map((f) =>
    dependabot === "auto-merge" && DEPENDENCY_FILE.test(f) ? "deps" : classOfPath(f)
  );
  const heaviest = CHANGE_CLASSES.find((c) => classes.includes(c)) ?? "other";
  if (pr.files.length >= FILES_LIMIT && CHANGE_CLASSES.indexOf(heaviest) > CHANGE_CLASSES.indexOf("other")) {
    return "other";
  }
  return heaviest;
}

export function changeLabelOps(
  prs: readonly OpenPr[],
  decisions: ReadonlyMap<number, DependabotDecision>
): Op[] {
  return prs.flatMap((pr): Op[] => {
    if (pr.labels.includes(LABELS.hold)) return [];
    const want = LABEL_PREFIX + classifyChange(pr, decisions.get(pr.number) ?? null);
    const stale = pr.labels.filter((l) => l.startsWith(LABEL_PREFIX) && l !== want);
    if (pr.labels.includes(want) && stale.length === 0) return [];
    return [
      {
        type: "edit",
        number: pr.number,
        body: null,
        addLabels: pr.labels.includes(want) ? [] : [want],
        removeLabels: stale,
        assignOwner: false,
        comment: null,
      },
    ];
  });
}
```

package.json と lockfile の扱いを dependabot の auto-merge 判定に依存させるのは、同じファイルの変更でも、人間が依存を足す PR は承認を要するためである。

- [ ] **Step 4: gh と CLI につなぐ**

`packages/factory/src/gh.ts` に追加する。

```ts
export function listOpenPrs(): OpenPr[] {
  const prs = ghJson<
    { number: number; files: { path: string }[]; labels: { name: string }[] }[]
  >(["pr", "list", "--state", "open", "--limit", "100", "--json", "number,files,labels"]);
  return prs.map((p) => ({
    number: p.number,
    files: p.files.map((f) => f.path),
    labels: p.labels.map((l) => l.name),
  }));
}
```

`packages/factory/src/applyOps.ts` の `LABEL_SPECS` に、`CHANGE_CLASSES` の各クラスを `change:<クラス>`（色 `ededed`、説明「factory: 変更クラス（observe）」）として足す。

`packages/factory/src/cli/reconcile.ts` で、dependabot PR の分類を作ってから `changeLabelOps` の結果を `ops` の後ろに足す。

```ts
const dependabotPrs = listDependabotPrs();
const decisions = new Map(dependabotPrs.map((p) => [p.number, classifyDependabotPr(p)]));
const ops = [
  ...reconcile({ summaries, masterCi: latestMasterCi(), dependabotPrs, items: listFactoryItems() }),
  ...changeLabelOps(listOpenPrs(), decisions),
];
```

dry-run で、開いている PR のクラスが手で付けた判断と一致することを確かめる。

```bash
FACTORY_OWNER=trfv node packages/factory/src/cli/reconcile.ts --dry-run
```

- [ ] **Step 5: テスト、型、lint を通して PR を出す**

```bash
npm run test -w @shisetsu-viewer/factory
npm run typecheck -w @shisetsu-viewer/factory
git add packages/factory
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(factory): PR の変更クラスを observe でラベル付けする"
git push -u origin HEAD
gh pr create --title "feat(factory): PR の変更クラスを observe でラベル付けする" --body "software factory 2-C（spec「GitOps の見直し」）。承認には使わず、change:<クラス> ラベルを付けるだけ。

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

### Task 12: observe 運用の 2 週間と、フェーズ 3 に進む判断

**Files:** なし（運用と記録のみ）

- [ ] **Step 1: 毎回の判断を確かめる**

2 週間、定期実行のたびに（または数日おきにまとめて）次を見る。

```bash
gh run list --workflow factory.yml --limit 6 --json conclusion,createdAt
gh issue list --label factory --state all --limit 50 --json number,title,state,labels,createdAt,closedAt
```

```bash
gh pr list --state all --limit 50 --json number,title,labels,mergedBy --jq '.[]|"\(.number) \([.labels[].name|select(startswith("change:"))]) \(.title)"'
```

確かめる観点は次の 5 つ。

- 2 回連続の構造系失敗が、漏れなく `scraper-repair:*` になっている。
- 単発の失敗や transient で項目が作られていない（誤報がない）。
- 復旧した自治体の項目が、次の巡回でクローズされている。
- dependabot PR の分類（queued か needs-human か）が、人間の判断と一致している。
- `change:<クラス>` が、人間がその PR に求めた確認の重さと一致している（例：人間が差分を読まずにマージした PR が、人間承認のクラスになっていない）。

- [ ] **Step 2: 判断を spec に記録する**

2 週間の結果（作られた項目の数、誤報の有無、判断が人間と食い違った例）を、`docs/superpowers/specs/2026-10-04-software-factory-design.md` の末尾に「フェーズ 2 の observe 結果」として追記し、PR にする。
食い違いがあれば、`reconcile.ts` か `changeClass.ts` を直す PR を先に出し、2 週間を数え直す。
食い違いが無ければ、フェーズ 3 の計画に進む。
その計画は、`deploy-drift` の判定（api の `/v1/health` の version、viewer と mcp-server のビルド、Database ワークフローの結論）を observe で入れるタスクから始め、1 週間誤報が無いことを確かめてから 3a（dependency の自動マージ、reconcile 1 回で 1 本）に進む。
