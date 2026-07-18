# Hasura/D1 パリティ突合の定期実行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** scraper の定期実行（`cron: 23 8,20 * * *`）の末尾で Hasura と D1 の予約データを突合し、乖離をトラッカー Issue として自動 upsert する。

**Architecture:** 突合の集計を純関数 `tools/backend/parityReport.ts` に切り出し、`parity.ts` は I/O とオーケストレーションに専念する（既存の `updateReservations.ts` ↔ `transform.ts` と同じ分離）。`parity.ts` は最後に `PARITY_REPORT <json>` を 1 行 stdout に出し、`scraper.yml` の新 job がそれを読んで Issue を upsert する（既存の `tools/repair/verify.ts` の `REPAIR_VERIFY_RESULT <json>` と同じ流儀）。

**Tech Stack:** Node 24（`node --test`）、TypeScript 7（`node ../../node_modules/typescript7/bin/tsc`）、GitHub Actions（`actions/github-script`）

設計: `docs/superpowers/specs/2026-07-17-parity-scheduled-ci-design.md`

## Global Constraints

- PR は **master ベース**で作る（Phase 3 の各 PR は独立 revert 可能であること）。現ブランチ `fix/rebuild-wrangler-db-id` にある `parity.ts` の未コミット変更（`fetchAllHasura`）は、この PR に取り込む。
- 新しい GitHub secret は追加しない。Hasura は `secrets.GRAPHQL_ENDPOINT` + `secrets.M2M_TOKEN`（role `machine` で `reservations` / `institutions` を読めることは実測確認済み）、D1 は OIDC（`id-token: write`）。
- 型チェックは `npm run typecheck:all`。素の `tsc` は使わない。
- コミットは `PATH="$PWD/node_modules/.bin:$PATH" git commit ...`（`--no-verify` 禁止）。メッセージ末尾に `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。
- Prettier: printWidth 100、ダブルクォート、trailing comma es5。
- `.ts` の相対 import は拡張子付き（`./parityReport.ts`）。`erasableSyntaxOnly` + `allowImportingTsExtensions` のため `enum` / `namespace` / パラメータプロパティは使えない。
- コード中のコメントと Issue 本文は日本語。

---

### Task 1: 突合の集計を純関数として切り出す

`parity.ts` の中でインラインに書かれている突合ロジックを、テスト可能な純関数に出す。この Task では `parity.ts` はまだ触らない。

**Files:**
- Create: `packages/scraper/tools/backend/parityReport.ts`
- Test: `packages/scraper/tools/backend/parityReport.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `interface MunicipalityReport { target: string; hasuraRows: number; d1Rows: number; missing: number; extra: number; diff: number; samples: string[] }`
  - `function compareMunicipality(target: string, hasura: Map<string, string>, d1: Map<string, string>): MunicipalityReport`
  - `function totalMismatches(reports: MunicipalityReport[]): number`
  - `function reservationWindow(now: Date): { from: string; to: string }` — 突合対象の日付窓 `[from, to]`（ともに `"YYYY-MM-DD"`）。`from` = 今日、`to` = `addMonths(endOfMonth(今日), 5)`。上限 5 は全自治体の `horizon.monthsAhead` の最小値。
  - `function resolveParityTargets(opts: { allTargets: string[]; ciExcludedTargets: string[]; forceInclude: string[]; filterArg?: string | undefined }): string[]` — 突合対象を決める。filterArg 指定時はその 1 件のみ。未指定時は CI 除外自治体（`scraperCiExcluded`）を外す（`forceInclude` で個別解除）。CI 除外自治体は dual-write されず D1 に届かないため、含めると恒久 MISSING でゲートが壊れる。`playwright.config.ts` の `testIgnore` と同じ registry 駆動。

引数の `Map` は「行キー（`` `${institution_id} ${date}` ``）→ canonicalize 済み reservation 文字列」である。

**なぜ窓が要るか（実装者向け）:** Hasura は `date >= 今日` で引く一方、D1 の `exportReservations()` は全期間を dump する。両側の母集団がずれると、過去日の D1 行が `EXTRA`、遠い未来の Hasura 遺物が `MISSING` として偽陽性になる。両側を同じ窓に絞ることでこれを消す。ISO 日付文字列は辞書順 = 時系列順なので、フィルタは素の文字列比較でよい。

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/tools/backend/parityReport.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareMunicipality, reservationWindow, totalMismatches } from "./parityReport.ts";

test("reservationWindow は今日を from、その 5 ヶ月後の月末を to にする", () => {
  // 2026-07-18 → to = addMonths(endOfMonth(2026-07-18)=2026-07-31, 5) = 2026-12-31
  const w = reservationWindow(new Date("2026-07-18T09:00:00+09:00"));
  assert.equal(w.from, "2026-07-18");
  assert.equal(w.to, "2026-12-31");
});

test("一致していれば乖離ゼロのレポートを返す", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", '{"M":"VACANT"}'],
    ["id-a 2026-08-02", '{"M":"OCCUPIED"}'],
  ]);
  const d1 = new Map(hasura);
  const report = compareMunicipality("tokyo-kita", hasura, d1);
  assert.deepEqual(report, {
    target: "tokyo-kita",
    hasuraRows: 2,
    d1Rows: 2,
    missing: 0,
    extra: 0,
    diff: 0,
    samples: [],
  });
});

test("MISSING / EXTRA / DIFF をそれぞれ数え、サンプルに載せる", () => {
  const hasura = new Map([
    ["id-a 2026-08-01", '{"M":"VACANT"}'],
    ["id-a 2026-08-02", '{"M":"VACANT"}'],
  ]);
  const d1 = new Map([
    ["id-a 2026-08-02", '{"M":"OCCUPIED"}'],
    ["id-b 2026-08-03", '{"M":"VACANT"}'],
  ]);
  const report = compareMunicipality("tokyo-kita", hasura, d1);
  assert.equal(report.missing, 1);
  assert.equal(report.diff, 1);
  assert.equal(report.extra, 1);
  assert.deepEqual(report.samples, [
    "MISSING in D1: id-a 2026-08-01",
    "DIFF: id-a 2026-08-02",
    "EXTRA in D1: id-b 2026-08-03",
  ]);
});

test("サンプルは 5 件までに切り詰めるが、件数は全件を数える", () => {
  const hasura = new Map(
    Array.from({ length: 8 }, (_, i) => [`id-a 2026-08-0${i + 1}`, '{"M":"VACANT"}'] as const)
  );
  const report = compareMunicipality("tokyo-kita", hasura, new Map());
  assert.equal(report.missing, 8);
  assert.equal(report.samples.length, 5);
});

test("totalMismatches は全自治体の missing/extra/diff を合算する", () => {
  const reports = [
    { target: "a", hasuraRows: 1, d1Rows: 1, missing: 1, extra: 2, diff: 3, samples: [] },
    { target: "b", hasuraRows: 0, d1Rows: 0, missing: 0, extra: 0, diff: 0, samples: [] },
  ];
  assert.equal(totalMismatches(reports), 6);
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`Cannot find module './parityReport.ts'`）

- [ ] **Step 3: 最小の実装を書く**

`packages/scraper/tools/backend/parityReport.ts`:

```typescript
/**
 * JSON レポートに載せる乖離サンプルの上限（Issue 本文が肥大しないように絞る）。
 * export しないのは knip が未使用 export として検出するため。
 */
const SAMPLE_LIMIT = 5;

/** 突合窓の上限に足す月数。全自治体の horizon.monthsAhead の最小値。 */
const WINDOW_MONTHS_AHEAD = 5;

/**
 * 突合対象の日付窓 [from, to]（ともに "YYYY-MM-DD"）を返す。
 * from = 今日、to = 今日の月末 + WINDOW_MONTHS_AHEAD ヶ月の月末。
 * 既存 parity.ts が from を toISOString()（UTC）で作っているため、
 * date-fns（ローカル時刻）ではなく UTC 演算で揃える。月境界の TZ ずれを避ける。
 */
export function reservationWindow(now: Date): { from: string; to: string } {
  const from = now.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // Date.UTC(y, monthIndex, 0) は「その monthIndex の前月の末日」。
  // m + WINDOW_MONTHS_AHEAD + 1 を渡すと (m + WINDOW_MONTHS_AHEAD) 月の末日になる。
  const to = new Date(Date.UTC(y, m + WINDOW_MONTHS_AHEAD + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export interface MunicipalityReport {
  target: string;
  hasuraRows: number;
  d1Rows: number;
  /** Hasura にあり D1 に無い */
  missing: number;
  /** D1 にあり Hasura に無い */
  extra: number;
  /** 両方にあるが reservation が異なる */
  diff: number;
  samples: string[];
}

/**
 * 1 自治体分の Hasura / D1 を突合する。
 * 引数の Map は「行キー → canonicalize 済み reservation 文字列」。
 * 値は canonicalize 済みである前提なので、比較は素の文字列比較でよい。
 */
export function compareMunicipality(
  target: string,
  hasura: Map<string, string>,
  d1: Map<string, string>
): MunicipalityReport {
  const samples: string[] = [];
  let missing = 0;
  let extra = 0;
  let diff = 0;

  const addSample = (line: string): void => {
    if (samples.length < SAMPLE_LIMIT) samples.push(line);
  };

  for (const [k, hval] of hasura) {
    const dval = d1.get(k);
    if (dval === undefined) {
      missing++;
      addSample(`MISSING in D1: ${k}`);
    } else if (dval !== hval) {
      diff++;
      addSample(`DIFF: ${k}`);
    }
  }
  for (const k of d1.keys()) {
    if (!hasura.has(k)) {
      extra++;
      addSample(`EXTRA in D1: ${k}`);
    }
  }

  return { target, hasuraRows: hasura.size, d1Rows: d1.size, missing, extra, diff, samples };
}

export function totalMismatches(reports: MunicipalityReport[]): number {
  return reports.reduce((sum, r) => sum + r.missing + r.extra + r.diff, 0);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（既存の transform.test.ts / common の分も含めて全部緑）

- [ ] **Step 5: 型チェック**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: エラーなし（終了コード 0）

- [ ] **Step 6: コミット**

```bash
cd /Users/yushi/src/shisetsu-viewer
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tools/backend/parityReport.ts packages/scraper/tools/backend/parityReport.test.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "$(cat <<'EOF'
feat(scraper): パリティ突合の集計を純関数に切り出す

parity.ts のインライン突合を parityReport.ts に出し、node --test で
固定する。updateReservations.ts ↔ transform.ts と同じ分離。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: parity.ts を新関数に載せ替え、JSON レポートを出力する

`parity.ts` を Task 1 の関数に載せ替え、`PARITY_REPORT <json>` を出力する。あわせて NUL バイトを除去する。

**Files:**
- Modify: `packages/scraper/tools/backend/parity.ts`

**Interfaces:**
- Consumes: `compareMunicipality`, `totalMismatches`, `MunicipalityReport`（Task 1）
- Produces: stdout の最終行 `PARITY_REPORT <json>`。`<json>` は `MunicipalityReport[]` の JSON 配列。Task 3 の workflow がこの行を正規表現で拾う。

**背景（実装者向け）:**
現在の `key()` は `` `${r.institution_id}\0${r.date}` `` と NUL バイト（0x00）で区切っており、この 1 バイトのために git が parity.ts をバイナリ判定して差分がレビューできない。コミット `fe5e480` から入っている既存の問題である。`institution_id` は UUID、`date` は ISO 日付なので、区切りをスペースにしても一意性は保たれる。
`fetchAllHasura`（Hasura を 1 回で全件取得してクライアント側で自治体に振り分ける版）は作業ツリーに既にあるので、それをベースに突合窓の上限（`_lte`）を足す。D1 側は `exportReservations()` が全期間を返すのでクライアントフィルタで同じ窓に絞る。

- [ ] **Step 1: NUL バイトを除去し、バイナリ判定が解けることを確認**

`key()` を書き換える（`\0` をスペースに）:

```typescript
function key(r: { institution_id: string; date: string }): string {
  return `${r.institution_id} ${r.date}`;
}
```

エディタ上は見た目が変わらないので、必ず次で確認する。
zsh では `$'\000'` が空文字列に展開され `grep -c` が全行マッチする（偽の 0/全件）ので使わない。`tr` で実バイトを数える:

Run: `cd packages/scraper && tr -cd '\000' < tools/backend/parity.ts | wc -c`
Expected: `0`（NUL バイトが 1 つも無い）。`file tools/backend/parity.ts` が `data` ではなく `UTF-8 text` を返すことも確認

- [ ] **Step 2: import を足す**

`packages/scraper/tools/backend/parity.ts` の import に足す:

```typescript
import { compareMunicipality, reservationWindow, totalMismatches } from "./parityReport.ts";
import type { MunicipalityReport } from "./parityReport.ts";
```

- [ ] **Step 3: `fetchAllHasura` に窓の上限（`_lte`）を足す**

`fetchAllHasura` は現在シグネチャが `fetchAllHasura(): Promise<...>` で、内部で `const from = new Date().toISOString().slice(0, 10);` を計算している。これを引数で窓を受け取る形に変える。

シグネチャと `from` の行を次のように変える:

```typescript
async function fetchAllHasura(
  window: { from: string; to: string }
): Promise<Map<string, Map<string, string>>> {
  // ...instRes 取得はそのまま...
  const byMunicipality = new Map<string, Map<string, string>>();
  const { from, to } = window;
  let offset = 0;
```

GraphQL クエリに `$to` と `_lte` を足す（`where` と変数宣言と呼び出しの 3 箇所）:

```typescript
    const response = await graphqlRequest<{
      reservations: { institution_id: string; date: string; reservation: Record<string, string> }[];
    }>(
      `query parity($from: date!, $to: date!, $limit: Int!, $offset: Int!) {
        reservations(
          where: { date: { _gte: $from, _lte: $to } }
          order_by: { id: asc }
          limit: $limit
          offset: $offset
        ) { institution_id date reservation }
      }`,
      { from, to, limit: HASURA_PAGE, offset }
    );
```

- [ ] **Step 4: 呼び出し側で窓を計算し、D1 をクライアントフィルタし、突合ループを載せ替える**

`const hasuraByMunicipality = await fetchAllHasura();` を次に変える:

```typescript
const window = reservationWindow(new Date());
const hasuraByMunicipality = await fetchAllHasura(window);
```

ファイル末尾の突合ループ（`let mismatches = 0;` から `if (mismatches > 0) process.exit(1);` まで）を、まるごと次で置き換える:

```typescript
const reports: MunicipalityReport[] = [];

for (const target of targets) {
  const [, m] = target.split("-");
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const hasura = hasuraByMunicipality.get(municipality) ?? new Map<string, string>();
  const d1Rows = await exportReservations(municipality);
  // D1 は全期間を返すので Hasura と同じ窓に絞る（ISO 日付は辞書順 = 時系列順）。
  const d1 = new Map(
    d1Rows
      .filter((r) => r.date >= window.from && r.date <= window.to)
      .map((r) => [key(r), canonicalizeReservation(r.reservation)])
  );

  const report = compareMunicipality(target, hasura, d1);
  reports.push(report);

  const localMismatch = report.missing + report.extra + report.diff;
  if (localMismatch === 0) {
    console.log(`PARITY OK ${target} rows=${report.hasuraRows}`);
  } else {
    console.error(`PARITY FAIL ${target}: ${localMismatch} mismatches`);
    for (const line of report.samples) console.error(`  ${line}`);
    if (localMismatch > report.samples.length) {
      console.error(`  ... and ${localMismatch - report.samples.length} more`);
    }
  }
}

// CI の parity job がこの 1 行を拾って Issue 本文を組み立てる。
// この行が出ていない = 突合に到達していない（インフラ障害）と CI 側で判定される。
console.log(`PARITY_REPORT ${JSON.stringify(reports)}`);

if (totalMismatches(reports) > 0) process.exit(1);
```

ファイル冒頭の使い方コメント（`* 乖離 0 なら "PARITY OK"、あれば行キーと差分を列挙して exit 1。`）の後ろに 2 行足す:

```typescript
 * 突合対象は [今日, 今日の月末 + 5 ヶ月] の窓に両側そろえる（母集団ずれの偽陽性を防ぐ）。
 * 併せて最終行に `PARITY_REPORT <json>`（MunicipalityReport[]）を出す。CI がこれを読む。
```

- [ ] **Step 5: git がテキストとして差分を出せることを確認**

Run: `cd /Users/yushi/src/shisetsu-viewer && git diff --numstat packages/scraper/tools/backend/parity.ts`
Expected: `-	-	packages/...`（バイナリ）ではなく、`45	27	packages/scraper/tools/backend/parity.ts` のように**数字**の増減が出る

- [ ] **Step 6: 型チェックと lint**

Run: `npm run typecheck -w @shisetsu-viewer/scraper && npm run lint:all && npm run format:check:all`
Expected: すべてエラーなし

- [ ] **Step 7: 実プロダクションに対して 1 回実行し、出力の形と偽陽性の消失を確認**

`.env` に `M2M_TOKEN` は無い（`scripts/run.ts` が Auth0 から都度取得する設計のため）。Hasura を admin secret 無しで叩くには、トークンを注入して実行する:

```bash
cd /Users/yushi/src/shisetsu-viewer/packages/scraper
cat > /tmp/runParity.ts <<'EOF'
import { fetchM2MToken } from "./tools/m2mAuth.ts";
process.env["M2M_TOKEN"] = await fetchM2MToken();
await import("./tools/backend/parity.ts");
EOF
node --env-file=.env /tmp/runParity.ts 2>&1 | tee /tmp/parity.log
grep -o '^PARITY_REPORT .*' /tmp/parity.log | head -c 400
```

Expected: `PARITY_REPORT [{"target":"tokyo-koutou","hasuraRows":...,"d1Rows":...,"missing":...,...}]` が 1 行出る。
窓を入れる前に見えていた偽陽性（`EXTRA in D1: ... 2026-07-15` のような過去日、`MISSING in D1: ... 2027-09-10` のような遠い未来日）が消えていることを確認する。
所要時間を控えておく（Hasura のページングが支配的。Task 3 の `timeout-minutes` の妥当性確認に使う）。窓内に残る乖離の有無自体はこの Task の合否と無関係である（充填直後は乖離が出うる）。

- [ ] **Step 8: コミット**

```bash
cd /Users/yushi/src/shisetsu-viewer
PATH="$PWD/node_modules/.bin:$PATH" git add packages/scraper/tools/backend/parity.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "$(cat <<'EOF'
feat(scraper): parity.ts が PARITY_REPORT の JSON を出力する

CI が突合結果を Issue 本文に組み立てられるよう、自治体別の集計を 1 行の
JSON で stdout に出す。人間向けログと exit 1 は据え置き。

あわせて突合窓を [今日, 今日の月末 + 5 ヶ月] に両側そろえた。従来は
Hasura だけ date>=今日 で絞り D1 は全期間 dump だったため、過去日が
EXTRA、遠い未来の Hasura 遺物が MISSING という偽陽性が出ていた。

key() の区切りに紛れていた NUL バイトも除去した。この 1 バイトのために
git が parity.ts をバイナリ判定し、差分がレビューできなかった。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: scraper.yml に parity job を追加する

**Files:**
- Modify: `.github/workflows/scraper.yml`（`collect_failures` job の後ろ、ファイル末尾に追記）

**Interfaces:**
- Consumes: `parity.ts` の `PARITY_REPORT <json>` 行（Task 2）、`prepare` job の `nodeModulesCacheKey` output（既存）
- Produces: トラッカー Issue（マーカー `<!-- parity-tracker -->`、タイトル `[parity] Hasura と D1 の乖離`）

**背景（実装者向け）:**
- `needs` と `if: !cancelled()` は既存の `collect_failures` job と同じ条件にする。retry の後に 1 回だけ走らせ、retry で直った分を乖離と誤検出しないため。
- `vars.D1_API_ENDPOINT` は dual-write のキルスイッチ。**Secret ではなく Variable** である。空なら job ごとスキップする。
- D1 の認証は `tools/backend/d1Api.ts` の `getAuthHeaders()` が `ACTIONS_ID_TOKEN_REQUEST_URL` の有無で自動判定するので、job に `id-token: write` を付けるだけでよい。`ADMIN_API_KEY` は渡さない。
- Hasura の認証は `tools/request.ts` の `getAuthHeaders()` が `HASURA_ADMIN_SECRET` → M2M Bearer の順にフォールバックする。**`HASURA_ADMIN_SECRET` は渡さない**（渡さないことで M2M 経路に乗る）。
- Playwright ブラウザは不要（parity は fetch のみ）。`npm ci --ignore-scripts` で足りる。

- [ ] **Step 1: parity job を追記**

`.github/workflows/scraper.yml` の末尾に追記する:

```yaml
  parity:
    name: Hasura/D1 parity
    runs-on: ubuntu-latest
    needs:
      - prepare
      - scrape
      - prepare_retry
      - retry_scrape
    # collect_failures と同条件: retry まで終わった最終状態を 1 回だけ突合する。
    # D1_API_ENDPOINT（dual-write キルスイッチ）が空なら D1 に書いていないので突合しない。
    if: ${{ !cancelled() && vars.D1_API_ENDPOINT != '' }}
    timeout-minutes: 30
    permissions:
      contents: read
      id-token: write # D1 API への GitHub OIDC 認証
      issues: write
    steps:
      - name: Checkout
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - name: Set Node.js
        uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          cache: "npm"
          cache-dependency-path: "**/package-lock.json"
          node-version-file: .node-version
      - name: Cache node_modules
        uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        id: node-modules-cache
        with:
          path: "**/node_modules"
          key: ${{ needs.prepare.outputs.nodeModulesCacheKey }}
      - name: Run npm ci
        if: steps.node-modules-cache.outputs.cache-hit != 'true'
        run: npm ci --ignore-scripts
      - name: Run parity
        id: parity
        continue-on-error: true
        working-directory: packages/scraper
        env:
          GRAPHQL_ENDPOINT: ${{ secrets.GRAPHQL_ENDPOINT }}
          # HASURA_ADMIN_SECRET は渡さない: 未設定なら request.ts が M2M Bearer に
          # フォールバックする。role machine で reservations/institutions は読める。
          M2M_TOKEN: ${{ secrets.M2M_TOKEN }}
          D1_API_ENDPOINT: ${{ vars.D1_API_ENDPOINT }}
        run: |
          set -o pipefail
          # Hasura の全件ページングは単一リクエストが 5 分ストリームタイムアウト
          # （UND_ERR_INFO: fetch failed）を踏むことがある。request.ts のリトライは
          # HTTP 5xx のみ対象で fetch タイムアウトを拾わないので、実行ごとリトライする。
          for attempt in 1 2 3; do
            echo "::group::parity (attempt ${attempt})"
            if node tools/backend/parity.ts 2>&1 | tee parity.log; then
              echo "::endgroup::"
              exit 0
            fi
            # exit 1 は「乖離あり」で PARITY_REPORT は出ている。リトライ不要。
            if grep -q '^PARITY_REPORT ' parity.log; then
              echo "::endgroup::"
              exit 0
            fi
            echo "::endgroup::"
            echo "parity attempt ${attempt} failed before emitting PARITY_REPORT; retrying" >&2
          done
          echo "parity failed after 3 attempts" >&2
      - name: Upsert parity tracker issue
        uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const MARKER = '<!-- parity-tracker -->';
            const TITLE = '[parity] Hasura と D1 の乖離';

            let log = '';
            try { log = fs.readFileSync('packages/scraper/parity.log', 'utf8'); } catch (_) { /* 下で失敗扱い */ }
            const line = log.split('\n').find((l) => l.startsWith('PARITY_REPORT '));
            if (!line) {
              // 突合そのものに到達していない = Hasura/D1 への接続障害。
              // 乖離（緑 + Issue）とは区別して job を赤にする。
              core.setFailed('PARITY_REPORT が出力されていません。突合が完遂していない可能性があります。');
              return;
            }

            let reports;
            try {
              reports = JSON.parse(line.slice('PARITY_REPORT '.length));
            } catch (error) {
              core.setFailed(`PARITY_REPORT の JSON を解析できません: ${error.message}`);
              return;
            }

            const total = reports.reduce((s, r) => s + r.missing + r.extra + r.diff, 0);

            const open = await github.paginate(github.rest.issues.listForRepo, {
              owner: context.repo.owner, repo: context.repo.repo, state: 'open', per_page: 100,
            });
            const tracker = open.find(
              (i) => i.title === TITLE && (i.body || '').includes(MARKER)
            );

            if (total === 0) {
              core.info(`パリティ OK（${reports.length} 自治体）`);
              if (tracker) {
                await github.rest.issues.createComment({
                  owner: context.repo.owner, repo: context.repo.repo, issue_number: tracker.number,
                  body: '直近の定期実行で Hasura と D1 の乖離は検出されませんでした。自動クローズします。',
                });
                await github.rest.issues.update({
                  owner: context.repo.owner, repo: context.repo.repo, issue_number: tracker.number,
                  state: 'closed',
                });
              }
              return;
            }

            const runUrl =
              `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            let body = `${MARKER}\n\n`;
            body += `定期実行で Hasura と D1 の予約データに **${total} 件の乖離** を検出しました。\n\n`;
            body += `- MISSING: Hasura にあり D1 に無い / EXTRA: D1 にあり Hasura に無い / DIFF: 両方にあるが reservation が異なる\n`;
            body += `- 突合対象は本日以降の予約のみ。行キーは \`<institution_id> <date>\`\n\n`;
            body += `| 自治体 | Hasura | D1 | MISSING | EXTRA | DIFF |\n|---|---|---|---|---|---|\n`;
            for (const r of reports) {
              body += `| ${r.target} | ${r.hasuraRows} | ${r.d1Rows} | ${r.missing} | ${r.extra} | ${r.diff} |\n`;
            }
            // Issue body は最大 65,536 文字。サンプルは自治体あたり 5 件だが、念のため上限を設ける。
            const MAX_SAMPLE_LINES = 100;
            const sampleLines = [];
            for (const r of reports) {
              for (const s of r.samples) sampleLines.push(`${r.target}: ${s}`);
            }
            if (sampleLines.length > 0) {
              body += `\n<details><summary>サンプル（自治体あたり最大 5 件）</summary>\n\n\`\`\`\n`;
              body += sampleLines.slice(0, MAX_SAMPLE_LINES).join('\n');
              if (sampleLines.length > MAX_SAMPLE_LINES) {
                body += `\n... 他 ${sampleLines.length - MAX_SAMPLE_LINES} 件`;
              }
              body += `\n\`\`\`\n</details>\n`;
            }
            body += `\n[実行ログ](${runUrl})\n\n`;
            body += `_最終更新: run ${context.runId}_`;

            if (tracker) {
              await github.rest.issues.update({
                owner: context.repo.owner, repo: context.repo.repo, issue_number: tracker.number,
                body, state: 'open',
              });
            } else {
              await github.rest.issues.create({
                owner: context.repo.owner, repo: context.repo.repo, title: TITLE, body,
              });
            }
```

- [ ] **Step 2: YAML の構文を確認**

`yaml` パッケージは node_modules に解決可能であることを確認済み。

Run:
```bash
cd /Users/yushi/src/shisetsu-viewer && node -e "
const fs = require('fs');
const yaml = require('yaml');
const doc = yaml.parse(fs.readFileSync('.github/workflows/scraper.yml', 'utf8'));
console.log(Object.keys(doc.jobs).join(' '));
console.log('parity needs:', doc.jobs.parity.needs.join(','));
console.log('parity perms:', JSON.stringify(doc.jobs.parity.permissions));
"
```
Expected:
```
prepare scrape prepare_retry retry_scrape collect_failures parity
parity needs: prepare,scrape,prepare_retry,retry_scrape
parity perms: {"contents":"read","id-token":"write","issues":"write"}
```

- [ ] **Step 2b: Prettier の整形を通す**

Run: `cd /Users/yushi/src/shisetsu-viewer && npm run format:check:all`
Expected: エラーなし（落ちたら `npm run format:fix:all` で直してから再確認）

- [ ] **Step 3: コミットして PR を作る**

```bash
cd /Users/yushi/src/shisetsu-viewer
PATH="$PWD/node_modules/.bin:$PATH" git add .github/workflows/scraper.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "$(cat <<'EOF'
feat(ci): scraper の定期実行に Hasura/D1 パリティ突合を追加

retry まで終わった最終状態を 1 回突合し、乖離があればトラッカー Issue を
upsert する（解消すれば自動クローズ）。job 自体は緑を保ち、突合に到達
できなかった場合だけ赤にする。

Hasura は既存の M2M_TOKEN、D1 は OIDC を使うため新規 secret は不要。
D1_API_ENDPOINT（dual-write キルスイッチ）が空なら job ごとスキップする。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
gh pr create --base master --title "feat(ci): Hasura/D1 パリティ突合を定期実行する" --body "$(cat <<'EOF'
## 概要

2 週間パリティゲートの観察を自動化する。scraper の定期実行（`cron: 23 8,20 * * *`）の末尾で Hasura と D1 の予約データを突合し、乖離をトラッカー Issue として upsert する。

設計: `docs/superpowers/specs/2026-07-17-parity-scheduled-ci-design.md`

## 変更

- `tools/backend/parityReport.ts`（新規）— 突合の集計を純関数に切り出し、`node --test` で固定
- `tools/backend/parity.ts` — 上記に載せ替え、`PARITY_REPORT <json>` を出力。あわせて `key()` の NUL バイトを除去（git がバイナリ判定して差分がレビューできなかった）
- `.github/workflows/scraper.yml` — `parity` job を追加

## 認証（新規 secret 不要）

- Hasura: 既存の `secrets.M2M_TOKEN`。role `machine` で `reservations` / `institutions` を読めることを本番で実測確認
- D1: GitHub OIDC（`id-token: write`）

## 検証

- `npm run test:unit -w @shisetsu-viewer/scraper`
- 実プロダクションに対して parity をローカル実行し、`PARITY_REPORT` の形を確認
- `workflow_dispatch` で 1 回まわし、Issue の作成とクローズを確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: 実 dispatch で end-to-end 検証**

PR ブランチで、既に緑になりやすい単一自治体を指定して 1 回まわす:

```bash
cd /Users/yushi/src/shisetsu-viewer
gh workflow run scraper.yml --ref "$(git branch --show-current)" -f municipality=tokyo-chuo
sleep 30 && gh run list --workflow=scraper.yml --limit 1
```

`gh run watch <run-id>` で完了まで待ち、次を確認する:

1. `parity` job が実行されている（スキップされていない = `vars.D1_API_ENDPOINT` が効いている）
2. `parity` job のログに `PARITY_REPORT [...]` が出ている
3. job が緑である（乖離があっても `continue-on-error` で吸収されている）
4. 乖離があれば Issue `[parity] Hasura と D1 の乖離` が立っている／無ければ立たない

Expected: 上記 4 点すべて。`gh issue list --search "parity in:title"` で確認する。

- [ ] **Step 5: 検証結果を PR にコメント**

```bash
gh pr comment --body "実 dispatch で検証: parity job 緑、PARITY_REPORT 出力あり、Issue の挙動を確認（run: <URL>）"
```
