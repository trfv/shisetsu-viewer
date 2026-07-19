# tokyo-sumida 国内 proxy 経由スクレイプ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Actions から L4 遮断されている tokyo-sumida を、CI ランナーから Tailscale で Mac（住宅 IP）の proxy を経由してスクレイプし、定期実行に復帰させる。

**Architecture:** registry の `scraperViaJpProxy` フラグを単一ソースとし、scrape composite action が対象自治体のジョブでのみ Tailscale join と `SCRAPER_PROXY` 設定を行う。playwright.config.ts が `SCRAPER_PROXY` を browser proxy に適用する。Mac 側は tailscaled + tinyproxy（Tailscale インターフェースのみ bind）。

**Tech Stack:** Playwright / tailscale/github-action v4（SHA pin: `780049a30b6ff5c378a9e7b389d15ece7a204888`）/ tinyproxy（brew）/ Tailscale 無料プラン

**Spec:** `docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md`

## Global Constraints

- scraper パッケージの依存は `@playwright/test` と `date-fns` のみ。新規 npm 依存を追加しない
- GitHub Actions の外部 action は SHA pin する（既存 workflow の慣例）
- Node が TS を直接実行する（ビルドなし）。ユニットテストは `node --test`（`common/*.test.ts`）
- コミットは `PATH="$PWD/node_modules/.bin:$PATH" git commit ...` で pre-commit を通す（`--no-verify` 禁止）
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 実装はこの worktree（ブランチ `worktree-docs-sumida-local-scrape`、spec コミット済み）で続ける

## 進行上の注意

- Task 4 はユーザーとの協働タスク（Tailscale 管理画面と Mac の設定）。エージェント単独では完了できない
- `scraperCiExcluded` の解除は Task 7（E2E 検証後）まで行わない。それまで CI 検証は workflow_dispatch の `SCRAPER_FORCE_INCLUDE` 経路で行う

---

### Task 1: registry に scraperViaJpProxy フラグを追加し、spec の CI 節を実装方式に合わせる

**Files:**
- Modify: `packages/shared/registry.ts`（interface と sumida エントリ）
- Modify: `docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md`（CI 側の変更 節）

**Interfaces:**
- Produces: `MunicipalityConfig.scraperViaJpProxy?: boolean`（Task 2 の `isViaJpProxy()` が参照）

**背景:** spec は「shardMatrix.ts が matrix エントリにフラグを載せる」としていたが、retry ジョブの matrix は `prepare_retry` がジョブ名の正規表現から再構成するため（`scraper.yml` の `Collect failed shards` 参照）、matrix 経由のフラグは retry で失われる。scrape アクションが municipality から registry を引いて判定する方式に変更する。

- [ ] **Step 1: interface にフィールドを追加**

`packages/shared/registry.ts` の `MunicipalityConfig` に、`scraperCiExcluded` の直後に追加：

```ts
  /**
   * true = サイトが GitHub Actions からの接続を遮断しているため、CI では
   * 国内 proxy 経由でスクレイプする。scrape アクションが Tailscale join と
   * SCRAPER_PROXY 設定を行う（判定は scripts/viaJpProxy.ts）。
   */
  readonly scraperViaJpProxy?: boolean;
```

- [ ] **Step 2: sumida エントリを更新**

`MUNICIPALITY_SUMIDA` の該当部分（現在 233-234 行付近）を：

```ts
    // 2026-07-10 からサイト構造変化で故障中。userHome エンジン統合（再構築 PR 1-5b）で解除予定
    scraperCiExcluded: true,
```

から次に変更（`scraperCiExcluded: true` は E2E 検証が通る Task 7 まで維持）：

```ts
    // サイト側が GitHub Actions（Azure レンジ）からの TCP SYN を L4 で silent drop している
    // （2026-07-19 に層別診断で確定。構造変化ではない）。国内 proxy 経由で運用する。
    // 除外は proxy 経路の E2E 検証後に解除する。
    scraperCiExcluded: true,
    scraperViaJpProxy: true,
```

- [ ] **Step 3: spec の「CI 側の変更」節を実装方式に合わせる**

`docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md` の

```
- `shardMatrix.ts` が matrix エントリにこのフラグを載せる
```

を次に置き換える：

```
- scrape アクションが municipality 名から registry を引いて proxy の要否を判定する（`scripts/viaJpProxy.ts`）。retry ジョブの matrix はジョブ名から再構成されるため、matrix にフラグを載せる方式では retry で失われる。判定をアクション内に置くことで scrape と retry が同じ経路を通る
```

- [ ] **Step 4: 型検査と既存テスト**

```bash
npm run typecheck -w @shisetsu-viewer/shared && npm run test:unit -w @shisetsu-viewer/scraper
```

Expected: どちらも PASS（フィールド追加は optional のため既存に影響しない）

- [ ] **Step 5: Commit**

```bash
git add packages/shared/registry.ts docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(shared): scraperViaJpProxy フラグを追加し sumida の除外理由を実態に修正

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: proxy 要否の判定関数とスクリプト

**Files:**
- Create: `packages/scraper/common/jpProxy.ts`
- Create: `packages/scraper/common/jpProxy.test.ts`
- Create: `packages/scraper/scripts/viaJpProxy.ts`

**Interfaces:**
- Consumes: `MunicipalityConfig.scraperViaJpProxy`（Task 1）
- Produces: `isViaJpProxy(target: string): boolean`／`node scripts/viaJpProxy.ts <target>` が stdout に `true` または `false` を出力（Task 5 の action が使用）

- [ ] **Step 1: 失敗するテストを書く**

`packages/scraper/common/jpProxy.test.ts`：

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { isViaJpProxy } from "./jpProxy.ts";

test("tokyo-sumida は JP proxy 経由", () => {
  assert.equal(isViaJpProxy("tokyo-sumida"), true);
});

test("tokyo-bunkyo は直接続", () => {
  assert.equal(isViaJpProxy("tokyo-bunkyo"), false);
});

test("未知の target は false", () => {
  assert.equal(isViaJpProxy("tokyo-nonexistent"), false);
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd packages/scraper && node --test common/jpProxy.test.ts
```

Expected: FAIL（`Cannot find module './jpProxy.ts'`）

- [ ] **Step 3: 実装**

`packages/scraper/common/jpProxy.ts`：

```ts
import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";

/** target 名（例 "tokyo-sumida"）が国内 proxy 経由の対象かを registry から引く。 */
export function isViaJpProxy(target: string): boolean {
  return Object.values<MunicipalityConfig>(MUNICIPALITIES).some(
    (m) => m.scraperViaJpProxy === true && `${m.prefecture}-${m.slug}` === target
  );
}
```

`packages/scraper/scripts/viaJpProxy.ts`：

```ts
/**
 * scrape アクションから呼ばれ、対象自治体が国内 proxy 経由かを stdout に出力する。
 * 使い方: node scripts/viaJpProxy.ts <municipality>   → "true" | "false"
 */
import { isViaJpProxy } from "../common/jpProxy.ts";

process.stdout.write(isViaJpProxy(process.argv[2] ?? "") ? "true" : "false");
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd packages/scraper && node --test common/jpProxy.test.ts && node scripts/viaJpProxy.ts tokyo-sumida && echo && node scripts/viaJpProxy.ts tokyo-kita
```

Expected: テスト 3 件 PASS、続いて `true` と `false` が出力される

- [ ] **Step 5: 型検査と全ユニットテスト**

```bash
npm run typecheck -w @shisetsu-viewer/scraper && npm run test:unit -w @shisetsu-viewer/scraper
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/scraper/common/jpProxy.ts packages/scraper/common/jpProxy.test.ts packages/scraper/scripts/viaJpProxy.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): 国内 proxy 要否を registry から判定する isViaJpProxy を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: playwright.config.ts の SCRAPER_PROXY 対応

**Files:**
- Modify: `packages/scraper/playwright.config.ts`

**Interfaces:**
- Consumes: 環境変数 `SCRAPER_PROXY`（Task 5 の action が設定。手元検証では手で設定）
- Produces: `SCRAPER_PROXY` 設定時に browser が proxy 経由になる挙動

**背景:** 現在の `launchOptions.args` は `--proxy-server="direct://"` と `--proxy-bypass-list=*` で直接続を強制している。proxy 利用時はこの 2 つを外し、Playwright の `use.proxy` に切り替える。

- [ ] **Step 1: config を変更**

`packages/scraper/playwright.config.ts` の `const isCI = !!process.env.CI;` の直後に追加：

```ts
// GitHub Actions から遮断されている自治体（registry の scraperViaJpProxy）向けに、
// scrape アクションが対象ジョブでのみ設定する。未設定なら従来どおり直接続。
const scraperProxy = process.env["SCRAPER_PROXY"];
```

`use` ブロックを次のように変更（`proxy` の追加と、args 末尾 2 項の条件化）：

```ts
  use: {
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
    ...(scraperProxy ? { proxy: { server: scraperProxy } } : {}),
    launchOptions: {
      args: [
        "--disable-application-cache",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-images",
        "--disable-sync",
        "--disable-translate",
        "--ignore-certificate-errors",
        "--no-first-run",
        "--start-maximized",
        // SCRAPER_PROXY 未設定時は直接続を強制する（proxy 利用時は use.proxy に任せる）
        ...(scraperProxy ? [] : ["--proxy-bypass-list=*", '--proxy-server="direct://"']),
      ],
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 100,
    },
    trace: process.env.CI ? "off" : "on-first-retry",
  },
```

- [ ] **Step 2: proxy が適用されることを挙動で確認（到達不能 proxy で失敗する）**

```bash
cd packages/scraper && SCRAPER_PROXY=http://127.0.0.1:9 npx playwright test tokyo-sumida --grep 社会福祉会館
```

Expected: FAIL（`net::ERR_PROXY_CONNECTION_FAILED` など、proxy 接続起因のエラー）。これが直接続のまま成功したら proxy が効いていない

- [ ] **Step 3: 未設定時は従来どおり成功することを確認**

```bash
cd packages/scraper && npx playwright test tokyo-sumida --grep 社会福祉会館
```

Expected: PASS（1 件成功）

- [ ] **Step 4: 型検査**

```bash
npm run typecheck -w @shisetsu-viewer/scraper
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/scraper/playwright.config.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): SCRAPER_PROXY で browser proxy を切り替えられるようにする

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Mac 側の構成と README（ユーザー協働）

**Files:**
- Create: `packages/scraper/tools/jp-proxy/README.md`

**Interfaces:**
- Produces: 稼働中の tinyproxy（Tailscale IF:8888）、GitHub secrets `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET`、repository variable `JP_PROXY_URL`（Task 5-6 が使用）

**注意:** Tailscale 管理画面の操作（OAuth client 作成、ACL 編集）と Mac へのインストールはユーザーの承認・操作を伴う。エージェントは手順提示と検証を担当する。

- [ ] **Step 1: README を作成**

`packages/scraper/tools/jp-proxy/README.md`：

````markdown
# 国内 proxy（Tailscale + tinyproxy）のセットアップ

tokyo-sumida はサイト側が GitHub Actions からの接続を L4 で遮断しているため、
CI は Tailscale で Mac の tinyproxy に接続し、住宅 IP からスクレイプする。
設計: `docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md`

## Mac 側

1. Tailscale をインストールしてログインする（App 版または `brew install tailscale`）
2. Tailscale の IPv4 を確認する: `tailscale ip -4`（以下 `<TS_IP>`）
3. tinyproxy を入れて設定する:

   ```bash
   brew install tinyproxy
   ```

   `$(brew --prefix)/etc/tinyproxy/tinyproxy.conf` を次の内容にする
   （Tailscale IF にのみ bind し、tailnet からのみ許可）:

   ```
   Port 8888
   Listen <TS_IP>
   Timeout 600
   MaxClients 20
   Allow 100.64.0.0/10
   ```

4. 常駐させる: `brew services start tinyproxy`
5. 動作確認（Mac 自身から Tailscale IF 経由で）:

   ```bash
   curl -x http://<TS_IP>:8888 -s -o /dev/null -w "%{http_code}\n" \
     https://yoyaku03.city.sumida.lg.jp/user/Home
   ```

   → `200`

## Tailscale 管理画面

1. **タグ定義と ACL**（Access Controls）: 既存ルールを残したまま追記する

   ```jsonc
   "tagOwners": { "tag:ci": ["autogroup:admin"] },
   // CI ノードは Mac の proxy ポートにのみ到達できる
   "acls": [
     { "action": "accept", "src": ["tag:ci"], "dst": ["<TS_IP>:8888"] },
     // 既存の許可ルール（例: 自分のデバイス同士の all allow）はここに残す
   ]
   ```

2. **OAuth client**（Settings → OAuth clients → Generate）:
   scope は `auth_keys`、タグは `tag:ci` を割り当てる

## GitHub 側

```bash
gh secret set TS_OAUTH_CLIENT_ID --repo trfv/shisetsu-viewer
gh secret set TS_OAUTH_SECRET --repo trfv/shisetsu-viewer
gh variable set JP_PROXY_URL --repo trfv/shisetsu-viewer --body "http://<TS_IP>:8888"
```

`JP_PROXY_URL` は MagicDNS 名ではなく Tailscale IP を使う
（ephemeral ノードの DNS 解決に依存しないため）。

## 運用

- Mac は常時稼働・AC 接続とする
- proxy 停止時は sumida のジョブが transient 失敗し、retry 込みで落ちると run が赤くなる
- 停止・再開: `brew services stop|start tinyproxy`
````

- [ ] **Step 2: ユーザーと Mac 側・Tailscale 側を設定**

README の手順をユーザーと実施する。エージェントが実行できるもの（brew、設定ファイル、`gh secret set` 等）は承認を得て実行し、Tailscale 管理画面の操作はユーザーに依頼する。

- [ ] **Step 3: proxy 単体の検証**

```bash
curl -x http://<TS_IP>:8888 -s -o /dev/null -w "%{http_code}\n" https://yoyaku03.city.sumida.lg.jp/user/Home
```

Expected: `200`

- [ ] **Step 4: Playwright からの proxy 経由スクレイプを手元で検証（spec テスト計画 1）**

```bash
cd packages/scraper && SCRAPER_PROXY=http://<TS_IP>:8888 npx playwright test tokyo-sumida --grep 社会福祉会館
```

Expected: PASS（Mac 自身の proxy 経由でスクレイプ成功）

- [ ] **Step 5: secrets / variable が設定されたことを確認**

```bash
gh secret list --repo trfv/shisetsu-viewer | grep TS_OAUTH && gh variable list --repo trfv/shisetsu-viewer | grep JP_PROXY_URL
```

Expected: `TS_OAUTH_CLIENT_ID`、`TS_OAUTH_SECRET`、`JP_PROXY_URL` が表示される

- [ ] **Step 6: Commit**

```bash
git add packages/scraper/tools/jp-proxy/README.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "docs(scraper): 国内 proxy（Tailscale + tinyproxy）のセットアップ手順を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: scrape アクションと workflow の変更

**Files:**
- Modify: `.github/actions/scrape/action.yml`
- Modify: `.github/workflows/scraper.yml`（`scrape` と `retry_scrape` の `Start Scraper` ステップ）

**Interfaces:**
- Consumes: `scripts/viaJpProxy.ts`（Task 2）、secrets/vars（Task 4）
- Produces: 対象ジョブでの Tailscale join と `SCRAPER_PROXY` 設定

- [ ] **Step 1: action.yml に入力を追加**

`inputs` の末尾（`phase` の後）に追加：

```yaml
  jpProxyUrl:
    description: "JP proxy URL (repository variable JP_PROXY_URL)。scraperViaJpProxy の自治体で必須"
    required: false
    default: ""
```

- [ ] **Step 2: action.yml にステップを追加**

`Restore Playwright browsers` ステップの直後、`Run Playwright tests` の前に追加：

```yaml
    - name: Check JP proxy requirement
      id: jp-proxy
      shell: bash
      working-directory: packages/scraper
      run: |
        VIA=$(node scripts/viaJpProxy.ts "${{ inputs.municipality }}")
        if [ "${VIA}" = "true" ] && [ -z "${{ inputs.jpProxyUrl }}" ]; then
          echo "::error::${{ inputs.municipality }} は国内 proxy が必要ですが jpProxyUrl が空です（repository variable JP_PROXY_URL を確認）"
          exit 1
        fi
        echo "viaJpProxy=${VIA}" >> "$GITHUB_OUTPUT"
    - name: Connect to Tailscale
      if: steps.jp-proxy.outputs.viaJpProxy == 'true'
      uses: tailscale/github-action@780049a30b6ff5c378a9e7b389d15ece7a204888 # v4.1.3
      with:
        oauth-client-id: ${{ env.TS_OAUTH_CLIENT_ID }}
        oauth-secret: ${{ env.TS_OAUTH_SECRET }}
        tags: tag:ci
```

- [ ] **Step 3: Run Playwright tests ステップに SCRAPER_PROXY を渡す**

`Run Playwright tests` の `env:` に追加：

```yaml
        SCRAPER_PROXY: ${{ steps.jp-proxy.outputs.viaJpProxy == 'true' && inputs.jpProxyUrl || '' }}
```

- [ ] **Step 4: scraper.yml の 2 箇所の Start Scraper を更新**

`scrape` ジョブと `retry_scrape` ジョブの両方で、`Start Scraper` ステップに追記：

`env:` に追加：

```yaml
          TS_OAUTH_CLIENT_ID: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          TS_OAUTH_SECRET: ${{ secrets.TS_OAUTH_SECRET }}
```

`with:` に追加：

```yaml
          jpProxyUrl: ${{ vars.JP_PROXY_URL }}
```

- [ ] **Step 5: ローカルで判定スクリプトの入出力を再確認**

```bash
cd packages/scraper && node scripts/viaJpProxy.ts tokyo-sumida && echo && node scripts/viaJpProxy.ts kanagawa-kawasaki
```

Expected: `true` と `false`

- [ ] **Step 6: Commit**

```bash
git add .github/actions/scrape/action.yml .github/workflows/scraper.yml
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "ci(scraper): scraperViaJpProxy の自治体を Tailscale + 国内 proxy 経由で実行する

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: ブランチ dispatch での E2E 検証（spec テスト計画 2, 4）

**Files:** なし（検証のみ）

**Interfaces:**
- Consumes: Task 1-5 の全成果、稼働中の proxy（Task 4）

- [ ] **Step 1: ブランチを push**

```bash
git push -u origin worktree-docs-sumida-local-scrape
```

- [ ] **Step 2: sumida を dispatch**

```bash
gh workflow run scraper.yml --repo trfv/shisetsu-viewer --ref worktree-docs-sumida-local-scrape -f municipality=tokyo-sumida
```

`scraperCiExcluded` は未解除だが、dispatch は `SCRAPER_FORCE_INCLUDE` で除外を上書きする（既存機構）。

- [ ] **Step 3: run を監視し、結果を確認**

```bash
gh run list --repo trfv/shisetsu-viewer --workflow "Run Scraper" --limit 1
gh run watch <run-id> --repo trfv/shisetsu-viewer --exit-status
```

Expected: `Scrape tokyo-sumida (1/1)` が success。ジョブログに `Connect to Tailscale` ステップの実行と、4 施設のテスト成功、`Save scraped data` のアップロード成功が出る

- [ ] **Step 4: 他自治体に影響がないことを確認**

```bash
gh run view <run-id> --repo trfv/shisetsu-viewer --job <scrape-job-id> --log | grep -A2 "Check JP proxy requirement"
```

また同ブランチで `-f municipality=tokyo-chuo` を dispatch し、`Connect to Tailscale` ステップが **skipped** になり success することを確認する

- [ ] **Step 5: 異常系（spec テスト計画 4）**

Mac で `brew services stop tinyproxy` してから再度 sumida を dispatch：

Expected: scrape 失敗（接続タイムアウト）→ retry も失敗 → run が failure。失敗アーティファクトの分類が `transient` であること

確認後 `brew services start tinyproxy` で復旧し、もう一度 dispatch して success を確認する

---

### Task 7: CI 除外の解除と PR

**Files:**
- Modify: `packages/shared/registry.ts`（sumida の `scraperCiExcluded` を削除）
- Modify: `packages/scraper/CLAUDE.md`（Playwright Config 節）

**Interfaces:**
- Consumes: Task 6 の E2E 成功

- [ ] **Step 1: scraperCiExcluded を解除**

`MUNICIPALITY_SUMIDA` から `scraperCiExcluded: true,` の行と「除外は proxy 経路の E2E 検証後に解除する。」のコメント行を削除する。`scraperViaJpProxy: true` と遮断理由コメントは残す。

- [ ] **Step 2: CLAUDE.md に proxy 経路を追記**

`packages/scraper/CLAUDE.md` の Playwright Config 節の末尾に追加：

```markdown
- 国内 proxy: registry の `scraperViaJpProxy` の自治体は、CI で Tailscale + Mac の tinyproxy 経由（`SCRAPER_PROXY`）。セットアップは `tools/jp-proxy/README.md`。
```

- [ ] **Step 3: 全体チェック**

```bash
npm run typecheck:all && npm run lint:all && npm run test:unit -w @shisetsu-viewer/scraper && npm run format:check:all
```

Expected: すべて PASS

- [ ] **Step 4: Commit と push**

```bash
git add packages/shared/registry.ts packages/scraper/CLAUDE.md
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): tokyo-sumida を国内 proxy 経由で定期実行に復帰させる

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 5: PR 作成**

```bash
gh pr create --repo trfv/shisetsu-viewer --base master \
  --title "feat(scraper): tokyo-sumida を Tailscale 国内 proxy 経由で定期実行に復帰" \
  --body "$(cat <<'EOF'
## 概要
tokyo-sumida のサイトは GitHub Actions（Azure レンジ）からの TCP SYN を L4 で silent drop している（2026-07-19 層別診断で確定。構造変化ではない）。CI ランナーを Tailscale で Mac の tinyproxy につなぎ、住宅 IP 経由でスクレイプして定期実行に復帰させる。

- 設計: docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md
- registry の `scraperViaJpProxy` を単一ソースに、scrape アクションが Tailscale join と `SCRAPER_PROXY` 設定を行う（retry も同経路）
- ブランチ dispatch で E2E 検証済み（proxy 経由成功・他自治体スキップ・proxy 停止時 transient 失敗）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: マージ後の観察（spec テスト計画 3）**

マージ後、次の定期実行 1 スロットで sumida のジョブが success すること、parity job の対象に sumida が含まれること（`parity.ts` は `scraperCiExcluded` でない自治体を自動対象化）を確認する。

---

## Self-Review 済み事項

- spec の全要件と task の対応: 背景修正=Task 1、CI 側=Task 1/2/3/5、Mac 側=Task 4、セキュリティ（SHA pin、ACL、ephemeral）=Task 4/5、テスト計画 1=Task 4、2/4=Task 6、3=Task 7
- spec からの意図的変更: matrix フラグ方式 → アクション内判定（retry の matrix 再構成でフラグが失われるため）。Task 1 Step 3 で spec 本文も更新する
- 型・名前の整合: `scraperViaJpProxy`（registry）、`isViaJpProxy(target)`（common/jpProxy.ts）、`scripts/viaJpProxy.ts`、action input `jpProxyUrl`、env `SCRAPER_PROXY`、secrets `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET`、variable `JP_PROXY_URL` で全 task 一致
