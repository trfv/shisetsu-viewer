# Phase 3: バックエンド刷新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 実行開始時にこのファイルを `docs/superpowers/plans/2026-07-12-backend-rebuild.md` としてリポジトリにコミットすること（リポジトリ規約）。

**Goal:** Hasura + Postgres + Auth0 M2M を Cloudflare Workers（新パッケージ `packages/api`）+ D1 + GitHub OIDC に置き換え、月額 $0（Free tier）・静的シークレットほぼゼロの構成にする。

**Architecture:** 6 PR 構成（3-0〜3-5、各 PR は master ベース・独立 revert 可能）。PR 3-0 で scraper のアップロード境界を関数インターフェースに分離（Hasura のまま）→ 3-1 で `packages/api`（読み取り）+ D1 スキーマ → 3-2 で書き込み + dual-write 開始 → **2 週間のパリティ検証ゲート** → 3-3 viewer 切り替え → 3-4 mcp-server 切り替え → 3-5 Hasura 撤去。

テーブル設計の核（詳細は「テーブル設計の核心」節）: Postgres の `jsonb` は D1 に無いので `reservation` は **TEXT(JSON)**。空き 3 フラグは **STORED 生成列**にして SQL を単一の真実にし、差分 upsert の変化判定を `reservation` 1 列の比較に畳む。`is_holiday` は **列に持たずクエリ時に導出**（土日は date から、祝日はバインドした配列から）ので、祝日表を更新しても 7.3 万行を書き直さない。D1 Free の書き込み枠（10 万行/日）には、この差分 upsert + 書き込み予算ガード + シード 2 日分割で収める。

**Tech Stack:** Cloudflare Workers + D1（SQLite）、`jose`（Auth0 / GitHub OIDC の JWKS 検証）、`@cloudflare/vitest-pool-workers`（実 D1 エミュレーションでのテスト）、TypeScript 7（typescript7 alias）、既存: React 19 viewer / Playwright scraper / MCP SDK。

参照スペック: `docs/superpowers/specs/2026-07-11-repository-rebuild-design.md`（Phase 3 節）

## Global Constraints

- 型チェックは各パッケージの `typecheck` スクリプト経由（`node ../../node_modules/typescript7/bin/tsc`）。**素の `tsc` を叩かない**。ルート `npm run typecheck:all` は `npm run typecheck --workspaces` なので、新パッケージは `typecheck` スクリプトを持てば自動的に対象になる。
- コミットは `PATH="$PWD/node_modules/.bin:$PATH" git commit ...`（pre-commit の lint-staged 対策。`--no-verify` は使わない）。
- Prettier: printWidth 100 / tabWidth 2 / double quotes / trailing commas es5。ESLint は `--max-warnings=0`。
- Node >= 24、ES Modules、npm workspaces。依存は最小限（新規は `jose` と `@cloudflare/vitest-pool-workers` 系のみ）。
- D1 Free 枠（公式ドキュメント確認済み）: **書き込み 10 万行/日（UTC 00:00 リセット）**・読み取り 500 万行/日・ストレージはアカウント計 5GB / **1 DB あたり 500MB**（本設計は ~30MB）。バインドは 1 クエリ 100 個まで（→ json_each 1 パラメータ方式）、クエリ 30 秒、インデックス列を含む書き込みは +1 行カウント。Workers Free: 10 万リクエスト/日・CPU 10ms/呼び出し。日次書き込みは試算 ~0.9 万行（churn 5%）。
- institutions の ID は **非 RFC UUID を 17 件含む**。ID 検証は常に緩い 8-4-4-4-12 hex（`z.string().uuid()` や RFC 検証を導入しない）。
- タイムゾーンは Asia/Tokyo。日付は `YYYY-MM-DD` 文字列。
- 破壊的操作（secret 削除・Hasura 停止・シード投入先の作り直し）は実行直前に一覧提示してユーザー確認。

## Context

### なぜやるか

- 現行: scraper (GitHub Actions) → Auth0 M2M トークン（失効性・ローテ運用が必要）→ Hasura v2 + Postgres（別リポ shisetsu-database 管轄、ホスティング費あり）。viewer/mcp-server は手書き GraphQL クライアントで接続。
- GraphQL の柔軟性は使っていない（viewer は固定 4 クエリ）。そのために全権 admin secret・M2M ローテーション workflow・別リポを維持している。
- 実データ計測（2026-07-11、MCP 経由）: 前方向きデータ約 7.3 万行、318 行/日 × 2 run。**差分書き込みなら D1 Free 枠の約 9% で収まる**。

### 探索で確定した事実（この計画の前提）

1. **`searchable_reservations` のセマンティクスは実測で裏取り済み**（Go/No-Go ゲートの主要項目は解消）:
   - `is_morning_vacant` = `reservation->>'RESERVATION_DIVISION_MORNING' = 'RESERVATION_STATUS_VACANT'` **または**（`_MORNING_ONE` と `_MORNING_TWO` が両方 VACANT）。afternoon / evening も同形（shisetsu-database README.md L43-72 の pg_ivm IMMV 定義）。
   - `is_holiday` = **土日または祝日**。実測: 2026-07-15(水) は `isHoliday=true` で 0 件、2026-07-18(土)・2026-07-20(海の日) は該当行あり、かつ現行スクレイプで維持されている（updated_at が最新）。`holidays` テーブル（date, name）が祝日ソース。
   - 注意: README の IMMV 定義には `is_holiday` 列が無いが、本番ビューには存在する（クエリが通る）。Hasura metadata にビューは track されていない（out-of-band 作成）。D1 では**書き込み時導出**に置き換えるので、ビュー定義の完全な持ち出しは不要。
2. **Hasura のロールは `anonymous` / `user` の 2 つだけ**。institutions は両ロールに全列公開、reservations は `user` のみ（filter は `{}` = 全行）。**trial はデータ層のロールではなく viewer の ID トークンのカスタムクレーム**（`https://app.shisetsudb.com/token/claims` の `role`/`trial`）で UI ゲートしているだけ。→ API の認可は「reservations 系 = 検証済み JWT かつ anonymous/trial でない」を Worker 内で判定する。
3. **Auth0 JWT**: RS512、テナント `trfv.jp.auth0.com`。Hasura は既定 namespace `https://hasura.io/jwt/claims`（claims_map なし）。**access token に role/trial クレームが入っているかは未確認** → PR 3-1 の Task 0 で実トークン確認（残存ゲート項目）。
4. **アップロード境界の現状**（PR 3-0 の対象）:
   - `tools/updateReservations.ts`: `test-results/<muni>/*.json`（FileData）を読み、Hasura から institutions を引いて `${building_system_name}-${institution_system_name}` → id のキーマップを作り、`{institution_id, date, reservation}` を 2000 行チャンクで upsert（`on_conflict: reservations_institution_id_date_key, update_columns: [reservation]`）。
   - FileData 形状: `{ facility_name: string; data: { room_name: string; date: string; reservation: Record<string,string> }[] }`。キー対応は `facility_name` ↔ `building_system_name`、`room_name` ↔ `institution_system_name`。
   - `scripts/run.ts` L22-48 に Auth0 Client Credentials のインライン実装が重複（`tools/m2mToken.ts` と二重）。
   - `tools/updateInstitutions.ts`: `data/institutions/*.json`（計 **594 件**、ローカル JSON が真）を全 25 列 upsert。`tools/exportInstitutions.ts` は逆方向。
   - workflow 側: `scraper.yml` / `database.yml` が `secrets.GRAPHQL_ENDPOINT` + `secrets.M2M_TOKEN` を env 供給。`permissions: contents: read` のみ（`id-token` なし → PR 3-2 で追加）。
5. **viewer のデータ層**（PR 3-3 の対象）: `api/queries.ts`（手書き 4 クエリ 303 行）+ `api/graphqlClient.ts`（19 行、リトライなし）+ `utils/relay.ts`（Hasura Relay ID の atob ハック）+ `hooks/useGraphQLQuery.ts` / `hooks/usePaginatedQuery.ts`（Relay connection 前提、`getConnection` セレクタ）。無限スクロール sentinel は **PR #1605 で共通フック化・修正済み**（spec 記載の「このタイミングで修正」は不要になった）。MSW は operation name マッチの graphql ハンドラ。Auth0 は `contexts/Auth0.tsx`（`getTokenSilently`、1 時間毎更新）。
6. **mcp-server**（PR 3-4 の対象): `graphqlClient.ts` L6-12 のモジュールレベル可変シングルトンを `worker.ts` L167 が**リクエスト毎に mutate**（混線バグの根源）。読み取り 4 ツール + admin 限定 write 2 ツール。`authMode: "admin" | "auth0"` の二値。`paramHelpers.ts` の緩い hex ID 検証は維持。wrangler binding は OAUTH_KV のみ。
7. **CI/CD**: viewer は CF Workers Builds で CD 済み（master → deploy）。mcp-server は未接続（手動 deploy、要フォローアップ）。`packages/api` も Workers Builds に接続する（deploy.yml は作らない — 確定済み設計判断）。
8. CF アカウント: account_id `07d5a70dae76bffab27859320549b810`。

### ユーザー決定（2026-07-12 確認）

- 計画書は **1 本に全 6 PR**。dual-write 2 週間はタスク間ゲート（チェックポイント）として明記。
- 初期シードは **自治体 2 グループ × 2 日**（課金ゼロ。Paid 一時昇格はしない）。

---

## PR 構成と依存関係

```
PR 3-0 (scraper 境界分離, Hasura のまま)          … いつでも着手可
   ↓
PR 3-1 (packages/api 新設: D1 スキーマ + 読み取り)  … Task 0 = Auth0 クレーム実トークン確認
   ↓
PR 3-2 (書き込み + GitHub OIDC + dual-write 開始)  … マージ後にシード 2 日分割投入
   ↓
== ゲート: dual-write 2 週間パリティ検証 + rows_written 実測 ==
   ↓
PR 3-3 (viewer 切り替え)     PR 3-4 (mcp-server 切り替え)   … 3-3 と 3-4 は並行可
   ↓
PR 3-5 (Hasura 撤去)         … 3-3 と 3-4 の両方の後
```

## File Structure（全 PR 俯瞰）

新規作成:
- `packages/scraper/tools/backend/types.ts` — アップロード境界の型（FileData / ReservationRow / backend インターフェース）
- `packages/scraper/tools/backend/transform.ts` — FileData → ReservationRow 変換の純関数（テスト対象）
- `packages/scraper/tools/backend/transform.test.ts` — 上記の node:test
- `packages/scraper/tools/backend/hasura.ts` — Hasura 実装（3-5 で削除される運命。GraphQL をここに集約）
- `packages/scraper/tools/backend/d1Api.ts` — D1 API 実装（チャンク PUT + OIDC/API-key 認証）〔PR 3-2〕
- `packages/scraper/tools/backend/parity.ts` — Hasura vs D1 突合スクリプト〔PR 3-2〕
- `packages/scraper/tools/backend/seed.ts` — Hasura → D1 初期シード（自治体グループ指定）〔PR 3-2〕
- `packages/api/` — 新パッケージ（Worker 本体）〔PR 3-1/3-2〕
  - `wrangler.jsonc` / `package.json` / `tsconfig.json` / `vitest.config.ts`
  - `migrations/0001_init.sql` — D1 スキーマ
  - `src/worker.ts` — fetch エントリ + ルーティング（依存注入の起点）
  - `src/auth/auth0.ts` — Auth0 JWKS 検証 + ロール解決（純関数 + fetch）
  - `src/auth/githubOidc.ts` — GitHub Actions OIDC 検証〔PR 3-2〕
  - `src/db/queries.ts` — `(db: D1Database, params) => Promise<DTO>` の純関数（mcp-server が直接 import）
  - `src/db/upsert.ts` — 差分 upsert + 書き込み予算ガード〔PR 3-2〕
  - `src/db/cursor.ts` — keyset カーソルの encode/decode
  - `test/*.test.ts` — vitest-pool-workers（実 D1 エミュレーション）
- `packages/shared/apiTypes.ts` — API の DTO 型（viewer / mcp-server / scraper が共用）〔PR 3-1〕
- `packages/viewer/api/client.ts` + `packages/viewer/api/endpoints.ts` — fetch ラッパ + 型付き 4 関数〔PR 3-3〕

削除（置き換え完了後）:
- viewer: `api/queries.ts` / `api/graphqlClient.ts` / `utils/relay.ts`〔PR 3-3〕
- mcp-server: `graphqlClient.ts` / `m2mToken.ts` / `buildFieldSelection.ts`〔PR 3-4〕
- scraper: `tools/backend/hasura.ts` / `tools/request.ts` / `tools/m2mToken.ts`〔PR 3-5〕
- `.github/workflows/rotate-m2m-token.yml`〔PR 3-5〕

---

# PR 3-0: アップロード境界の分離（Hasura のまま実施可能な準備）

ブランチ: `feat/rebuild-backend-boundary`（master ベース）

**狙い:** updateReservations / updateInstitutions / exportInstitutions を「読む・変換する・書く」の 3 層に分け、「書く」を backend インターフェースに隔離する。PR 3-2 で d1Api.ts を並べて dual-write するとき、オーケストレーション側の変更をゼロにする。

### Task 3-0-1: 境界の型と純関数変換（TDD）

**Files:**
- Create: `packages/scraper/tools/backend/types.ts`
- Create: `packages/scraper/tools/backend/transform.ts`
- Test: `packages/scraper/tools/backend/transform.test.ts`
- Modify: `packages/scraper/package.json`（test:unit の glob 拡張）

**Interfaces:**
- Produces: `FileData` / `ReservationRow` / `InstitutionKeyMap` 型、`buildReservationRows(files, keyMap)` — 後続タスク全部がこれを使う。

- [ ] **Step 1: 型定義ファイルを作成**

`packages/scraper/tools/backend/types.ts`:

```typescript
import type { Institution } from "@shisetsu-viewer/shared";

/**
 * test-results/<municipality>/*.json の 1 ファイル分。スクレイパー出力とアップロードの境界契約。
 * キー対応: facility_name ↔ institutions.building_system_name、
 *           data[].room_name ↔ institutions.institution_system_name
 */
export interface FileData {
  facility_name: string;
  data: { room_name: string; date: string; reservation: Record<string, string> }[];
}

/** reservations upsert の 1 行 */
export interface ReservationRow {
  institution_id: string;
  date: string; // YYYY-MM-DD
  reservation: Record<string, string>;
}

/** `${building_system_name}-${institution_system_name}` → institutions.id */
export type InstitutionKeyMap = Record<string, string>;

/** 予約データの書き込み先バックエンド（Hasura 実装 → PR 3-2 で D1 実装が並ぶ） */
export interface ReservationBackend {
  fetchInstitutionKeyMap(prefecture: string, municipality: string): Promise<InstitutionKeyMap>;
  /** 戻り値は書き込み行数（affected_rows 相当） */
  upsertReservations(rows: ReservationRow[]): Promise<number>;
}

export interface InstitutionBackend {
  upsertInstitutions(rows: Institution[]): Promise<number>;
  listInstitutions(prefecture: string, municipality: string): Promise<Institution[]>;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`packages/scraper/tools/backend/transform.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReservationRows } from "./transform.ts";
import type { FileData, InstitutionKeyMap } from "./types.ts";

const keyMap: InstitutionKeyMap = {
  "会館A-音楽室": "id-a-music",
  "会館A-ホール": "id-a-hall",
};

test("キーマップに一致する行だけを institution_id 解決して返す", () => {
  const files: FileData[] = [
    {
      facility_name: "会館A",
      data: [
        { room_name: "音楽室", date: "2026-08-01", reservation: { M: "VACANT" } },
        { room_name: "未知の部屋", date: "2026-08-01", reservation: { M: "VACANT" } },
      ],
    },
  ];
  const { rows, unmatchedKeys } = buildReservationRows(files, keyMap);
  assert.deepEqual(rows, [
    { institution_id: "id-a-music", date: "2026-08-01", reservation: { M: "VACANT" } },
  ]);
  assert.deepEqual(unmatchedKeys, ["会館A-未知の部屋"]);
});

test("(institution_id, date) の重複は先勝ちで 1 行にする", () => {
  const files: FileData[] = [
    {
      facility_name: "会館A",
      data: [
        { room_name: "音楽室", date: "2026-08-01", reservation: { M: "FIRST" } },
        { room_name: "音楽室", date: "2026-08-01", reservation: { M: "SECOND" } },
        { room_name: "音楽室", date: "2026-08-02", reservation: { M: "OTHER_DAY" } },
      ],
    },
  ];
  const { rows } = buildReservationRows(files, keyMap);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0]?.reservation, { M: "FIRST" });
});

test("複数ファイルを 1 つの行リストに統合する", () => {
  const files: FileData[] = [
    { facility_name: "会館A", data: [{ room_name: "音楽室", date: "2026-08-01", reservation: {} }] },
    { facility_name: "会館A", data: [{ room_name: "ホール", date: "2026-08-01", reservation: {} }] },
  ];
  const { rows } = buildReservationRows(files, keyMap);
  assert.deepEqual(
    rows.map((r) => r.institution_id),
    ["id-a-music", "id-a-hall"]
  );
});
```

- [ ] **Step 3: test:unit の glob を広げてテストが失敗することを確認**

`packages/scraper/package.json` の `test:unit` を変更:

```json
    "test:unit": "node --test --test-isolation=none 'common/*.test.ts' 'tools/backend/*.test.ts'",
```

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: FAIL（`transform.ts` が存在しない）

- [ ] **Step 4: 実装**

`packages/scraper/tools/backend/transform.ts`:

```typescript
import type { FileData, InstitutionKeyMap, ReservationRow } from "./types.ts";

/**
 * FileData 群を institution_id 解決済みの upsert 行に変換する。
 * キーマップに無い施設はスキップして unmatchedKeys に集約（従来は silent drop だったものを可観測化）。
 * (institution_id, date) の重複は先勝ち（Hasura の同一コマンド内重複制約対応。従来ロジック踏襲）。
 */
export function buildReservationRows(
  files: FileData[],
  keyMap: InstitutionKeyMap
): { rows: ReservationRow[]; unmatchedKeys: string[] } {
  const rows: ReservationRow[] = [];
  const seen = new Set<string>();
  const unmatched = new Set<string>();
  for (const { facility_name, data } of files) {
    for (const { room_name, date, reservation } of data) {
      const key = `${facility_name}-${room_name}`;
      const institutionId = keyMap[key];
      if (!institutionId) {
        unmatched.add(key);
        continue;
      }
      const dedupeKey = `${institutionId} ${date}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({ institution_id: institutionId, date, reservation });
    }
  }
  return { rows, unmatchedKeys: [...unmatched] };
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm run test:unit -w @shisetsu-viewer/scraper`
Expected: PASS（既存 common テスト含め全緑）

- [ ] **Step 6: Commit**

```bash
git add packages/scraper/tools/backend/ packages/scraper/package.json
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(scraper): PR3-0 アップロード境界の型と変換純関数を追加"
```

### Task 3-0-2: hasura.ts への GraphQL 集約とオーケストレーション薄化

**Files:**
- Create: `packages/scraper/tools/backend/hasura.ts`
- Modify: `packages/scraper/tools/updateReservations.ts`（全面書き換え）
- Modify: `packages/scraper/tools/updateInstitutions.ts`
- Modify: `packages/scraper/tools/exportInstitutions.ts`

**Interfaces:**
- Consumes: Task 3-0-1 の型と `buildReservationRows`。既存 `tools/request.ts` の `graphqlRequest<T>(query, variables)`。
- Produces: `hasuraBackend`（`fetchInstitutionKeyMap` / `upsertReservations` / `upsertInstitutions` / `listInstitutions`）— PR 3-2 の dual-write がこの横に d1 実装を並べる。

- [ ] **Step 1: hasura.ts を作成**

`packages/scraper/tools/backend/hasura.ts`（GraphQL は既存 3 ファイルからの逐語移設）:

```typescript
import type { Institution } from "@shisetsu-viewer/shared";
import { graphqlRequest } from "../request.ts";
import type { InstitutionKeyMap, ReservationRow } from "./types.ts";

const RESERVATION_CHUNK = 2000;

const INSTITUTION_COLUMNS = [
  "prefecture",
  "municipality",
  "building",
  "institution",
  "building_kana",
  "institution_kana",
  "building_system_name",
  "institution_system_name",
  "capacity",
  "area",
  "institution_size",
  "fee_divisions",
  "weekday_usage_fee",
  "holiday_usage_fee",
  "address",
  "is_available_strings",
  "is_available_woodwind",
  "is_available_brass",
  "is_available_percussion",
  "is_equipped_music_stand",
  "is_equipped_piano",
  "website_url",
  "layout_image_url",
  "lottery_period",
  "note",
];

export async function fetchInstitutionKeyMap(
  prefecture: string,
  municipality: string
): Promise<InstitutionKeyMap> {
  const response = await graphqlRequest<{
    institutions: { id: string; building_system_name: string; institution_system_name: string }[];
  }>(
    `
      query list_institutions($prefecture: prefecture, $municipality: String!) {
        institutions(
          where: { prefecture: { _eq: $prefecture }, municipality: { _eq: $municipality } }
        ) {
          id
          building_system_name
          institution_system_name
        }
      }
    `,
    { prefecture, municipality }
  );
  const map: InstitutionKeyMap = {};
  for (const i of response.institutions) {
    map[`${i.building_system_name}-${i.institution_system_name}`] = i.id;
  }
  return map;
}

export async function upsertReservations(rows: ReservationRow[]): Promise<number> {
  let affected = 0;
  for (let i = 0; i < rows.length; i += RESERVATION_CHUNK) {
    const chunk = rows.slice(i, i + RESERVATION_CHUNK);
    const response = await graphqlRequest<{ insert_reservations: { affected_rows: number } }>(
      `
        mutation update_reservations($data: [reservations_insert_input!]!) {
          insert_reservations(
            objects: $data
            on_conflict: {
              constraint: reservations_institution_id_date_key
              update_columns: [reservation]
            }
          ) {
            affected_rows
          }
        }
      `,
      { data: chunk }
    );
    affected += response.insert_reservations.affected_rows;
    console.log(
      `hasura: ${i + 1} ~ ${i + chunk.length}, affected_rows: ${response.insert_reservations.affected_rows}`
    );
  }
  return affected;
}

export async function upsertInstitutions(rows: Institution[]): Promise<number> {
  const response = await graphqlRequest<{ insert_institutions: { affected_rows: number } }>(
    `
      mutation update_institutions(
        $data: [institutions_insert_input!]!
        $columns: [institutions_update_column!]!
      ) {
        insert_institutions(
          objects: $data
          on_conflict: { constraint: institutions_id_key, update_columns: $columns }
        ) {
          affected_rows
        }
      }
    `,
    { data: rows, columns: INSTITUTION_COLUMNS }
  );
  return response.insert_institutions.affected_rows;
}

export async function listInstitutions(
  prefecture: string,
  municipality: string
): Promise<Institution[]> {
  const response = await graphqlRequest<{ institutions: Institution[] }>(
    `
      query list_institutions($prefecture: prefecture!, $municipality: String!) {
        institutions(
          where: { prefecture: { _eq: $prefecture }, municipality: { _eq: $municipality } }
          order_by: [{ building_kana: asc }, { institution_kana: asc }]
        ) {
          id
          ${INSTITUTION_COLUMNS.join("\n          ")}
        }
      }
    `,
    { prefecture, municipality }
  );
  return response.institutions;
}
```

注意: `listInstitutions` の selection set は `id` + INSTITUTION_COLUMNS（= 既存 exportInstitutions.ts の列と同一）。

- [ ] **Step 2: updateReservations.ts を薄いオーケストレーションに書き換え**

`packages/scraper/tools/updateReservations.ts` 全文:

```typescript
import fs from "fs/promises";
import { getReservationTargets } from "@shisetsu-viewer/shared";
import { fetchInstitutionKeyMap, upsertReservations } from "./backend/hasura.ts";
import { buildReservationRows } from "./backend/transform.ts";
import type { FileData } from "./backend/types.ts";

const allTargets = getReservationTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;
const title = `update reservations`;

console.time(title);

for (const target of targets) {
  const dir = `test-results/${target}`;
  let files: string[];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    files = entries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name);
  } catch {
    console.warn(`Directory ${dir} does not exist.`);
    continue;
  }
  const fileData = await Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(`${dir}/${file}`, "utf-8");
      return JSON.parse(contents) as FileData;
    })
  );

  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${(p as string).toUpperCase()}`;
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const keyMap = await fetchInstitutionKeyMap(prefecture, municipality);
  const { rows, unmatchedKeys } = buildReservationRows(fileData, keyMap);
  if (unmatchedKeys.length > 0) {
    console.warn(`${target}: unmatched facility keys: ${unmatchedKeys.join(", ")}`);
  }
  console.log(`${target}: total: ${rows.length}`);
  const affected = await upsertReservations(rows);
  console.log(`${target}: affected_rows: ${affected}`);
}

console.timeEnd(title);
```

- [ ] **Step 3: updateInstitutions.ts / exportInstitutions.ts を書き換え**

`packages/scraper/tools/updateInstitutions.ts` 全文:

```typescript
import fs from "fs/promises";
import path from "path";
import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import type { Institution } from "@shisetsu-viewer/shared";
import { upsertInstitutions } from "./backend/hasura.ts";

const DATA_DIR = path.resolve(import.meta.dirname, "../data/institutions");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

console.time("update institutions");

for (const target of targets) {
  const filePath = path.join(DATA_DIR, `${target}.json`);
  const contents = await fs.readFile(filePath, "utf-8");
  const data: Institution[] = JSON.parse(contents);

  if (data.length === 0) {
    console.log(`${target}: skipped (no data)`);
    continue;
  }

  const affected = await upsertInstitutions(data);
  console.log(`${target}: data: ${data.length}, affected_rows: ${affected}`);
}

console.timeEnd("update institutions");
```

`packages/scraper/tools/exportInstitutions.ts` 全文:

```typescript
import fs from "fs/promises";
import path from "path";
import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import { listInstitutions } from "./backend/hasura.ts";

const DATA_DIR = path.resolve(import.meta.dirname, "../data/institutions");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

console.time("export institutions");

await fs.mkdir(DATA_DIR, { recursive: true });

for (const target of targets) {
  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${(p as string).toUpperCase()}`;
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const institutions = await listInstitutions(prefecture, municipality);

  const filePath = path.join(DATA_DIR, `${target}.json`);
  await fs.writeFile(filePath, JSON.stringify(institutions, null, 2) + "\n");
  console.log(`${target}: ${institutions.length} institutions -> ${filePath}`);
}

console.timeEnd("export institutions");
```

- [ ] **Step 4: typecheck とユニットテスト**

Run: `npm run typecheck -w @shisetsu-viewer/scraper && npm run test:unit -w @shisetsu-viewer/scraper`
Expected: 両方 PASS

- [ ] **Step 5: Commit**

```bash
git add packages/scraper/tools/
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "refactor(scraper): PR3-0 GraphQL を tools/backend/hasura.ts に集約しオーケストレーションを薄化"
```

### Task 3-0-3: run.ts のインライン M2M 実装を m2mToken.ts に一本化

**Files:**
- Modify: `packages/scraper/tools/m2mToken.ts`
- Modify: `packages/scraper/scripts/run.ts:21-48`

**前提:** `tools/m2mToken.ts` は計画セッションでは権限制限で読めなかった（secret 系ファイルガード）。**実装前に必ず現物を読み**、既存の `getM2MToken()`（`tools/request.ts:18` が同期呼び出ししている）を壊さないこと。

- [ ] **Step 1: m2mToken.ts に非同期フェッチを追加**

`tools/m2mToken.ts` に、`scripts/run.ts:31-47` にあるインライン実装を移設した以下の関数を追加する（既存 export はそのまま）:

```typescript
/**
 * Auth0 Client Credentials Flow でトークンを取得する。
 * scripts/run.ts が子プロセス起動前に M2M_TOKEN 環境変数を埋めるために使う。
 */
export async function fetchM2MToken(): Promise<string> {
  const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE } = process.env;
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET || !AUTH0_AUDIENCE) {
    throw new Error(
      "Missing required environment variables: set M2M_TOKEN, or AUTH0_DOMAIN + AUTH0_CLIENT_ID + AUTH0_CLIENT_SECRET + AUTH0_AUDIENCE"
    );
  }
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`Auth0 token fetch failed: ${res.status} ${res.statusText}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}
```

既存 m2mToken.ts 内に同等の fetch 実装が既にある場合は、それを export して run.ts から使う形にし、重複を作らないこと（現物を読んで判断）。

- [ ] **Step 2: run.ts のインライン実装を置き換え**

`scripts/run.ts` の L22-48（`if (!process.env.M2M_TOKEN) { ... }` ブロック全体）を以下に置き換える:

```typescript
if (!process.env.M2M_TOKEN) {
  console.log("M2M_TOKEN not set, fetching from Auth0...");
  const { fetchM2MToken } = await import("../tools/m2mToken.ts");
  try {
    process.env.M2M_TOKEN = await fetchM2MToken();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  console.log("M2M_TOKEN fetched successfully.");
}
```

- [ ] **Step 3: 動作確認と Commit**

Run: `npm run typecheck -w @shisetsu-viewer/scraper`
Expected: PASS

ローカルの .env（実クレデンシャル）がある場合の実流確認: `npm run scrape -w @shisetsu-viewer/scraper -- tokyo-chuo`（7 targets と最小。scrape → upload まで通ることを確認）。無ければ CI 検証（Task 3-0-4）に委ねる。

```bash
git add packages/scraper/tools/m2mToken.ts packages/scraper/scripts/run.ts
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "refactor(scraper): PR3-0 run.ts のインライン M2M 取得を m2mToken.ts に一本化"
```

### Task 3-0-4: 境界契約のドキュメント化と PR 検証

**Files:**
- Modify: `packages/scraper/CLAUDE.md`（「Reservation Data Upload Pipeline」節）

- [ ] **Step 1: CLAUDE.md の該当節を更新**

「Reservation Data Upload Pipeline」節を以下に書き換える:

```markdown
### Reservation Data Upload Pipeline

1. Scraper tests produce JSON in `test-results/<municipality>/` (FileData 形状 — 境界契約):
   - `{ facility_name: string; data: { room_name: string; date: "YYYY-MM-DD"; reservation: Record<string, string> }[] }`
   - キー対応: `facility_name` ↔ `institutions.building_system_name` / `room_name` ↔ `institutions.institution_system_name`。
     institution 解決キーは `` `${facility_name}-${room_name}` ``。
2. `tools/updateReservations.ts` — 薄いオーケストレーション。ファイル読み込み → `tools/backend/transform.ts` の
   `buildReservationRows()`（純関数、テスト付き）→ backend の `upsertReservations()`
3. `tools/backend/hasura.ts` — 書き込み先バックエンドの Hasura 実装
   （`fetchInstitutionKeyMap` / `upsertReservations` / `upsertInstitutions` / `listInstitutions`）。
   GraphQL はこのファイルにのみ存在する
4. `tools/request.ts` — fetch-based GraphQL client with retry / `tools/m2mToken.ts` — Auth0 M2M token（取得と fetchM2MToken）
```

- [ ] **Step 2: 全体検証**

Run:
```bash
npm run typecheck:all && npm run lint:all && npm run format:check:all && npm run knip && npm run test:unit -w @shisetsu-viewer/scraper
```
Expected: 全 PASS（knip が hasura.ts の未使用 export を報告しないこと — 4 関数とも参照があるはず）

- [ ] **Step 3: PR 作成 → CI 緑 → マージ後の実流検証**

```bash
git push -u origin feat/rebuild-backend-boundary
gh pr create --title "refactor(scraper): PR3-0 アップロード境界の分離" --body "..."
```

マージ後: `gh workflow run scraper.yml -f municipality=tokyo-chuo` を dispatch し、Save scraped data ステップで upsert 件数が従来水準（chuo は ~1,200 行）であることをログで確認。次の定期 run（cron 23 8,20 UTC）も 1 回観察。

---

# API 契約（PR 3-1〜3-4 の共通言語）

## エンドポイント一覧

| Method/Path | 認可 | 用途 |
|---|---|---|
| `GET /v1/health` | 公開 | 疎通 + D1 接続確認 |
| `GET /v1/institutions` | 公開（Cache-Control: max-age=300） | 施設一覧（フィルタ + keyset カーソル） |
| `GET /v1/institutions/:id` | 公開（Cache-Control: max-age=300） | 施設詳細 |
| `GET /v1/institutions/:id/reservations` | JWT（user かつ非 trial） | 施設別予約一覧（日付範囲 + カーソル） |
| `GET /v1/reservations/search` | JWT（user かつ非 trial） | 予約横断検索（is_holiday / is_*_vacant フィルタ） |
| `GET /v1/scrape-runs` | 公開（Cache-Control: max-age=300） | 自治体別の最終取得時刻（「取得日時」表示のソース） |
| `PUT /v1/admin/reservations` | GitHub OIDC or ADMIN_API_KEY | 予約データ差分 upsert（500 行/チャンク） |
| `PUT /v1/admin/institutions` | GitHub OIDC or ADMIN_API_KEY | 施設データ upsert |
| `PUT /v1/admin/holidays` | GitHub OIDC or ADMIN_API_KEY | 祝日テーブル更新（年次運用） |

クエリパラメータ規約: 複数値はカンマ区切り（`municipality=MUNICIPALITY_KOUTOU,MUNICIPALITY_BUNKYO`）。日付は `YYYY-MM-DD`。カーソルは `cursor`、ページサイズは `limit`（既定 50・最大 100。現行 viewer の `first: 100` 相当は limit=100）。boolean フィルタは `true` のみ意味を持つ（`isHoliday=true`）。

- ID の path 検証は**緩い 8-4-4-4-12 hex**（`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`）。非 RFC UUID 17 施設を弾かないこと（実バグ 9 の再発防止）。
- レスポンスの共通ページ形状は `{ items: T[], pageInfo: { hasNextPage, endCursor } }`。Relay の edges/node は廃止。
- 書き込み系のレスポンス: `{ received: number, rowsWritten: number, deferred: boolean }`。書き込み予算超過時は **HTTP 202 + deferred: true**（残チャンクは次回 run に委ねる）。

## `packages/shared/apiTypes.ts`（PR 3-1 で新設する DTO）

```typescript
import type { Institution } from "./types.ts";

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

/** GET /v1/institutions の 1 行（viewer 一覧 + mcp list_institutions が使用） */
export type InstitutionSummary = Pick<
  Institution,
  | "id"
  | "municipality"
  | "building"
  | "institution"
  | "institution_size"
  | "is_available_strings"
  | "is_available_woodwind"
  | "is_available_brass"
  | "is_available_percussion"
  | "is_equipped_music_stand"
  | "is_equipped_piano"
> & { updated_at: string };

/** GET /v1/institutions/:id（全 25 列 + updated_at） */
export type InstitutionDetail = Institution & { updated_at: string };

/**
 * 予約 1 行。
 * - updated_at は「最終変化時刻」（差分書き込みのため。取得時刻は ScrapeRun 参照）
 * - is_holiday / is_*_vacant は DB の列ではなく **クエリ時に導出**した値（下記「テーブル設計」参照）
 */
export interface ReservationDto {
  institution_id: string;
  date: string; // YYYY-MM-DD
  reservation: Record<string, string>;
  is_holiday: boolean;
  is_morning_vacant: boolean;
  is_afternoon_vacant: boolean;
  is_evening_vacant: boolean;
  updated_at: string;
}

/** GET /v1/reservations/search の 1 ヒット */
export interface ReservationSearchHit {
  reservation: ReservationDto;
  institution: Pick<
    Institution,
    "id" | "municipality" | "building" | "institution" | "institution_size"
  >;
}

/** GET /v1/scrape-runs の 1 行（自治体別最新） */
export interface ScrapeRun {
  municipality: string; // MUNICIPALITY_*
  fetched_at: string; // ISO 8601
}

/**
 * PUT /v1/admin/reservations のリクエスト。
 * is_holiday / 空き 3 フラグは **送らない**（前者はクエリ時導出、後者は D1 の生成列が自動計算）。
 */
export interface UpsertReservationsRequest {
  municipality: string; // MUNICIPALITY_*（scrape_runs 記録用）
  runId: string; // GitHub run id またはローカル実行のタイムスタンプ
  rows: {
    institution_id: string;
    date: string;
    reservation: Record<string, string>;
  }[];
}

export interface UpsertResponse {
  received: number;
  rowsWritten: number;
  deferred: boolean;
}

export interface InstitutionsQueryParams {
  municipality?: string[];
  isAvailableStrings?: boolean;
  isAvailableWoodwind?: boolean;
  isAvailableBrass?: boolean;
  isAvailablePercussion?: boolean;
  institutionSizes?: string[];
  limit?: number;
  cursor?: string;
}

export interface ReservationSearchQueryParams {
  municipality?: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;
  isHoliday?: boolean;
  isMorningVacant?: boolean;
  isAfternoonVacant?: boolean;
  isEveningVacant?: boolean;
  isAvailableStrings?: boolean;
  isAvailableWoodwind?: boolean;
  isAvailableBrass?: boolean;
  isAvailablePercussion?: boolean;
  institutionSizes?: string[];
  limit?: number;
  cursor?: string;
}
```

## テーブル設計の核心（ユーザー決定済み・2026-07-12）

Postgres の `jsonb` は D1（SQLite）に存在しない。D1 が公式にサポートするのは **JSON テキスト + JSON 関数**（`->` / `->>` / `json_extract` / `json_each` / `json_valid`）と **生成列（STORED、インデックス可）**。SQLite の JSONB バイナリ形式は D1 のドキュメントに記載が無いため依存しない。

### 決定 1: `reservation` は TEXT(JSON)。空き 3 フラグは **STORED 生成列**

- `reservation` を書けばフラグが SQL 側で自動追随する。TS と SQL に CASE ロジックが二重化しない。
- 結果として**差分 upsert の WHERE が `reservation` 1 列の比較だけになる**（フラグは reservation の関数なので、reservation が同じならフラグも同じ）。正しさが自明。
- 却下した代替案:
  - **スロット正規化**（`(institution_id, date, division) → status`）: 行数が 7.3 万 → 約 30 万に膨張し、シードで 60 万書き込み・日次書き込みも 4 倍。**D1 Free の 10 万行/日を日常的に超えるため Free tier ($0) 前提が崩れる**。
  - **division ごとの固定カラム（24 列）**: キー順問題は消えるが、新しい division が出るたび ALTER TABLE が必要で、差分 WHERE が 24 列比較になる。スクレイピング対象サイトが変わりうるドメインに固定スキーマは向かない。

### 決定 2: `is_holiday` は**列に持たない**。クエリ時に導出する

- `is_holiday` = 土日 **または** 祝日（実データで裏取り済み: 2026-07-15(水)=false / 07-18(土)=true / 07-20(海の日)=true）。**date だけで決まる値**なので行に焼き込む必要がない。
- 土日は `strftime('%w', date) IN ('0','6')` で SQL 内から判定。祝日は `holidays` テーブル（年 ~20 行）を Worker が 1 回読み、**JSON 配列としてバインド**して `date IN (SELECT value FROM json_each(?))` で判定する。`json_each` はバインド値に対する仮想テーブルなので **rows_read が増えない**。
- 利点: **祝日テーブルを年次更新しても既存 7.3 万行を書き直す必要がない**（書き込み枠を消費しない）。upsert 経路から holidays 依存が消え、scraper が送るペイロードも軽くなる。
- インデックス面の影響なし: 検索は必ず日付範囲で絞る（`idx(date)` が効く）ので、休日条件はその後のフィルタになる。現行 Postgres も `is_holiday` 単独インデックスは持たず同じ振る舞い。

### 決定 3: `reservation` の正規化は **Worker（API）が強制する**

差分検知は JSON テキストの比較なので、キー順や空白が揺れると「全行が変化した」と誤判定して D1 Free の書き込み枠を一撃で溶かす。**API が唯一の書き手**である利点を使い、受け取った行を必ずキーソート・空白なしで再シリアライズしてから格納する。scraper が何を送っても壊れない。

`packages/shared/reservationJson.ts`（PR 3-1 で新設。`vacancy.ts` は作らない — 空き判定は SQL の生成列が単一の真実）:

```typescript
/**
 * reservation マップを正規形（キー辞書順・空白なし）の JSON 文字列にする。
 * D1 の差分 upsert はテキスト比較で変化を検知するため、書き込み経路は必ずこれを通す。
 * 値のドメインは division キー → status 文字列のフラットなマップのみ（ネストしない）。
 */
export function canonicalizeReservation(reservation: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(reservation).sort()) {
    sorted[key] = reservation[key] as string;
  }
  return JSON.stringify(sorted);
}
```

（spec が挙げていた registry への `divisionGroups` 追加は**不採用**。空き判定のセマンティクスは D1 の生成列 DDL に一元化され、それがファイルファーストな単一の真実になる。自治体別に判定を変える案は dual-write パリティを壊すため cutover 後の backlog。）

---

# PR 3-1: packages/api 新設（D1 スキーマ + 読み取りエンドポイント）

ブランチ: `feat/rebuild-api-read`（master ベース）

### Task 3-1-0: Go/No-Go 残項目 — Auth0 access token のクレーム確認（コード変更なし）

- [ ] **Step 1: 実トークンを取得してデコード**

mcp-server CLI のトークンストアを利用（Auth0 Authorization Code + PKCE で実ユーザーのトークンが取れる）:

```bash
npm run cli -- login
node -e "
const fs = require('fs');
const os = require('os');
const t = JSON.parse(fs.readFileSync(os.homedir() + '/.config/shisetsu/tokens.json', 'utf8'));
const payload = JSON.parse(Buffer.from(t.access_token.split('.')[1], 'base64url').toString());
console.log(JSON.stringify(payload, null, 2));
"
```

- [ ] **Step 2: 確認結果を記録**

以下を確認し、結果を `docs/superpowers/specs/2026-07-11-repository-rebuild-design.md` の Phase 3 節に追記（または本計画ファイルにメモ）:
- `aud` に Hasura audience（VITE_AUTH0_AUDIENCE と同値）が入っているか
- `https://hasura.io/jwt/claims` の `x-hasura-default-role`（anonymous / user）
- `https://app.shisetsudb.com/token/claims` の `role` / `trial` が **access token に** 入っているか（viewer は ID トークンから読んでいるため、access token には無い可能性がある）

**判定:** どちらかの namespace で role が取れれば GO（`resolveRole` は両対応で実装する — Task 3-1-5）。両方無い場合のみ Auth0 の Action/Rule でクレーム追加が必要（ユーザー作業。トークンに `x-hasura-default-role` が無いことは Hasura が動いている以上ほぼあり得ない）。

### Task 3-1-1: shared に apiTypes.ts と reservationJson.ts を追加（TDD）

**Files:**
- Create: `packages/shared/apiTypes.ts`（上の「API 契約」節のコードそのまま）
- Create: `packages/shared/reservationJson.ts`（上の「決定 3」のコードそのまま）
- Test: `packages/shared/reservationJson.test.ts`
- Modify: `packages/shared/index.ts`（re-export 追加）、`packages/shared/package.json`（test を `node --test *.test.ts` に拡張）

- [ ] **Step 1: reservationJson.test.ts を書く（node:test）**

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalizeReservation } from "./reservationJson.ts";

test("キーを辞書順に並べ替えて空白なしで直列化する", () => {
  assert.equal(
    canonicalizeReservation({
      RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
      RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
    }),
    '{"RESERVATION_DIVISION_EVENING":"RESERVATION_STATUS_VACANT","RESERVATION_DIVISION_MORNING":"RESERVATION_STATUS_STATUS_1"}'
  );
});

test("キー順だけが違う 2 つのマップは同一の文字列になる（差分検知の要）", () => {
  const a = canonicalizeReservation({ B: "2", A: "1" });
  const b = canonicalizeReservation({ A: "1", B: "2" });
  assert.equal(a, b);
});

test("空のマップは {} になる", () => {
  assert.equal(canonicalizeReservation({}), "{}");
});
```

- [ ] **Step 2: FAIL 確認 → 実装（コードは「決定 3」に確定済み）→ PASS 確認**

Run: `npm run test -w @shisetsu-viewer/shared`

- [ ] **Step 3: index.ts に re-export を追加して Commit**

```typescript
export * from "./apiTypes.ts";
export * from "./reservationJson.ts";
```

```bash
git add packages/shared/
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(shared): PR3-1 API DTO 型と reservation 正規化を追加"
```

### Task 3-1-2: packages/api の足場と D1 スキーマ

**Files:**
- Create: `packages/api/package.json` / `packages/api/tsconfig.json` / `packages/api/wrangler.jsonc` / `packages/api/vitest.config.ts`
- Create: `packages/api/migrations/0001_init.sql`
- Create: `packages/api/src/worker.ts`（この時点では /v1/health のみ）
- Create: `packages/api/test/setup.ts` / `packages/api/test/health.test.ts`
- Modify: `.github/workflows/nodejs.yml`（test ジョブに api テスト追加）

**運用ステップ（コード外・要 Cloudflare 権限）:** `npx wrangler d1 create shisetsu-db` を実行し、出力された `database_id` を wrangler.jsonc に記入する。cloudflare-bindings MCP（`d1_database_create`）でも可。

- [ ] **Step 1: パッケージ定義**

`packages/api/package.json`:

```json
{
  "name": "@shisetsu-viewer/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/worker.ts",
  "scripts": {
    "typecheck": "node ../../node_modules/typescript7/bin/tsc",
    "test": "vitest run",
    "start": "wrangler dev",
    "deploy": "wrangler deploy",
    "migrate:local": "wrangler d1 migrations apply shisetsu-db --local",
    "migrate:remote": "wrangler d1 migrations apply shisetsu-db --remote"
  },
  "dependencies": {
    "@shisetsu-viewer/shared": "0.0.1",
    "jose": "6.1.3"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "0.13.x",
    "vitest": "4.1.x",
    "wrangler": "4.x"
  }
}
```

バージョン制約（Cloudflare 公式ドキュメントで確認済み）: **vitest 4 対応は `@cloudflare/vitest-pool-workers` v0.13.0 以降**（v0.12.x までは vitest 3）。v0.13 は `vitest@^4.1.0` を要求する。実装時に `npm view <pkg> version` で最新安定版を確認し exact 指定にする（save-exact ポリシー）。

`packages/api/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "shisetsu-api",
  "main": "src/worker.ts",
  "compatibility_date": "2026-02-28",
  "compatibility_flags": ["nodejs_compat"],
  "routes": [{ "pattern": "api.shisetsudb.com", "custom_domain": true }],
  "observability": { "enabled": true },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shisetsu-db",
      "database_id": "<wrangler d1 create の出力で置換>",
      "migrations_dir": "migrations"
    }
  ],
  "vars": {
    "AUTH0_DOMAIN": "trfv.jp.auth0.com",
    "AUTH0_AUDIENCE": "<VITE_AUTH0_AUDIENCE と同値を記入>",
    "GITHUB_REPOSITORY": "trfv/shisetsu-viewer",
    "OIDC_AUDIENCE": "https://api.shisetsudb.com"
  }
}
```

`ADMIN_API_KEY` は vars ではなく secret（`wrangler secret put ADMIN_API_KEY`、PR 3-2 で使用）。tsconfig は mcp-server の tsconfig.json をコピーして `include` を調整（同じ Workers 向け設定を踏襲。`wrangler types` で `worker-configuration.d.ts` を生成して Env 型を得る — mcp-server の流儀に合わせる）。

- [ ] **Step 2: D1 スキーマ（migrations/0001_init.sql）**

```sql
-- institutions: 25 フィールドを 1:1 カラム化（fee 系 3 つのみ JSON TEXT）。
-- 594 行・更新は年数回なので、インデックスの書き込み増幅は無視できる。
CREATE TABLE institutions (
  id TEXT PRIMARY KEY,   -- 非 RFC UUID を 17 件含むため形式 CHECK は付けない
  prefecture TEXT NOT NULL,
  municipality TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  building_kana TEXT NOT NULL DEFAULT '',
  institution_kana TEXT NOT NULL DEFAULT '',
  building_system_name TEXT NOT NULL DEFAULT '',
  institution_system_name TEXT NOT NULL DEFAULT '',
  capacity INTEGER,
  area REAL,
  institution_size TEXT NOT NULL DEFAULT 'INSTITUTION_SIZE_UNKNOWN',
  fee_divisions TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(fee_divisions)),
  weekday_usage_fee TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(weekday_usage_fee)),
  holiday_usage_fee TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(holiday_usage_fee)),
  address TEXT NOT NULL DEFAULT '',
  is_available_strings TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_available_woodwind TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_available_brass TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_available_percussion TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_equipped_music_stand TEXT NOT NULL DEFAULT 'EQUIPMENT_DIVISION_UNKNOWN',
  is_equipped_piano TEXT NOT NULL DEFAULT 'EQUIPMENT_DIVISION_UNKNOWN',
  website_url TEXT NOT NULL DEFAULT '',
  layout_image_url TEXT NOT NULL DEFAULT '',
  lottery_period TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- 一覧の ORDER BY と keyset カーソルをこの順序で満たす
CREATE INDEX idx_institutions_list
  ON institutions (municipality, building_kana, institution_kana, id);

-- reservations: Free tier 最適化 + セマンティクスの単一化。
--  * PRIMARY KEY (institution_id, date) + WITHOUT ROWID → UNIQUE 用の暗黙インデックスを排除
--  * 二次インデックスは idx(date) 1 本のみ → 新規 INSERT の書き込み増幅は 2 行（本体 + index）
--  * WITHOUT ROWID の二次インデックスは (date, institution_id) 順のキーになるため、
--    ORDER BY date, institution_id がソートなしで返る = keyset カーソルと完全一致する
--  * 空き 3 フラグは STORED 生成列。reservation を書けば自動追随し、差分 WHERE が 1 列で済む
--  * is_holiday 列は持たない（date から決まるためクエリ時に導出。祝日表の更新で行を書き直さない）
CREATE TABLE reservations (
  institution_id TEXT NOT NULL,
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  reservation TEXT NOT NULL CHECK (json_valid(reservation)),
  is_morning_vacant INTEGER NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN json_extract(reservation, '$.RESERVATION_DIVISION_MORNING') IS NOT NULL
        THEN json_extract(reservation, '$.RESERVATION_DIVISION_MORNING') = 'RESERVATION_STATUS_VACANT'
      ELSE COALESCE(
        json_extract(reservation, '$.RESERVATION_DIVISION_MORNING_ONE') = 'RESERVATION_STATUS_VACANT'
        AND json_extract(reservation, '$.RESERVATION_DIVISION_MORNING_TWO') = 'RESERVATION_STATUS_VACANT',
        0)
    END
  ) STORED,
  is_afternoon_vacant INTEGER NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON') IS NOT NULL
        THEN json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON') = 'RESERVATION_STATUS_VACANT'
      ELSE COALESCE(
        json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON_ONE') = 'RESERVATION_STATUS_VACANT'
        AND json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON_TWO') = 'RESERVATION_STATUS_VACANT',
        0)
    END
  ) STORED,
  is_evening_vacant INTEGER NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN json_extract(reservation, '$.RESERVATION_DIVISION_EVENING') IS NOT NULL
        THEN json_extract(reservation, '$.RESERVATION_DIVISION_EVENING') = 'RESERVATION_STATUS_VACANT'
      ELSE COALESCE(
        json_extract(reservation, '$.RESERVATION_DIVISION_EVENING_ONE') = 'RESERVATION_STATUS_VACANT'
        AND json_extract(reservation, '$.RESERVATION_DIVISION_EVENING_TWO') = 'RESERVATION_STATUS_VACANT',
        0)
    END
  ) STORED,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (institution_id, date)
) WITHOUT ROWID;
CREATE INDEX idx_reservations_date ON reservations (date);

-- 祝日（is_holiday のクエリ時導出に使う。Hasura holidays からシード、年次更新）
CREATE TABLE holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT ''
) WITHOUT ROWID;

-- スクレイプ run の記録: 「最終取得時刻」の表示ソース + 日次書き込み予算の台帳。
-- 1 日 ~24 行しかないためインデックスは張らない（全表スキャンで十分・書き込み増幅を避ける）。
CREATE TABLE scrape_runs (
  municipality TEXT NOT NULL,
  run_id TEXT NOT NULL,
  run_date TEXT NOT NULL,   -- UTC 日付。日次書き込み予算の集計キー（D1 の枠は 00:00 UTC リセット）
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  rows_written INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (municipality, run_id)
) WITHOUT ROWID;
```

DDL の設計判断（レビュー時に蒸し返さないための記録）:
- **外部キーを張らない**: institutions と reservations のアップロード順序を疎結合に保つ（新設施設のスクレイプが institutions 投入より先でも失敗しない）+ INSERT ごとの親参照 read を避ける。
- **生成列にインデックスを張らない**: D1 は生成列へのインデックスを許すが、インデックスは書き込み増幅を生む。空き検索は必ず日付範囲で絞るので `idx(date)` で足りる。
- **reservations に municipality を非正規化しない**: 検索の自治体絞り込みは JOIN 後のフィルタになるが、非正規化して `idx(municipality, date)` を足すと書き込み増幅が 3 倍になり Free 枠を圧迫する。現行 Postgres と同じ振る舞いを維持する。
- **enum 値を短縮しない**: D1 の課金は行数のみで、行のバイト数は無関係（公式ドキュメント明記）。可読性を優先する。

- [ ] **Step 3: vitest-pool-workers の配線と health テスト**

`packages/api/vitest.config.ts`（**v0.13 の新 API**。旧 `defineWorkersConfig` は削除済みなので使わない）:

```typescript
import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        // テスト専用 binding。setup.ts が applyD1Migrations で適用する
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
```

（`readD1Migrations` の import 元がビルドで解決しない場合は `@cloudflare/vitest-pool-workers/config` からの import に切り替える — 公式ドキュメント内でも両表記がある。ストレージ分離は **テストファイル単位**なので、fixtures の投入は各テストファイルの `beforeAll` で行う。）

`packages/api/test/setup.ts`:

```typescript
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

`packages/api/test/health.test.ts`:

```typescript
import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("GET /v1/health が 200 と ok を返す", async () => {
  const res = await SELF.fetch("https://api.example.com/v1/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
```

`src/worker.ts`（初版）:

```typescript
export interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  GITHUB_REPOSITORY: string;
  OIDC_AUDIENCE: string;
  ADMIN_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/v1/health") {
      return Response.json({ ok: true });
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

Run: `npm run test -w @shisetsu-viewer/api` — PASS。`npm run typecheck:all` — api が対象に入って PASS。

- [ ] **Step 4: nodejs.yml の test ジョブに追加**

「Shared unit tests」ステップの直後に:

```yaml
      - name: API unit tests
        run: npm run test -w @shisetsu-viewer/api
```

- [ ] **Step 5: Commit**

```bash
git add packages/api .github/workflows/nodejs.yml package-lock.json
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(api): PR3-1 packages/api の足場と D1 スキーマを追加"
```

### Task 3-1-3: keyset カーソルと読み取りクエリ（TDD）

**Files:**
- Create: `packages/api/src/db/cursor.ts` + Test: `packages/api/test/cursor.test.ts`
- Create: `packages/api/src/db/queries.ts` + Test: `packages/api/test/queries.test.ts`
- Create: `packages/api/test/fixtures.ts`（テストデータ投入ヘルパ）

**Interfaces（Produces — mcp-server も PR 3-4 で直接 import する）:**

```typescript
// cursor.ts
export function encodeCursor(fields: Record<string, string>): string; // base64url(JSON)
export function decodeCursor(cursor: string): Record<string, string> | null; // 不正は null

// queries.ts — 全て純関数（モジュール状態なし）
export function loadHolidays(db: D1Database): Promise<string[]>; // SELECT date FROM holidays（~100 行）
export function listInstitutions(db: D1Database, params: InstitutionsQueryParams & { detail?: boolean }): Promise<Page<InstitutionSummary | InstitutionDetail>>;
export function getInstitutionDetail(db: D1Database, id: string): Promise<InstitutionDetail | null>;
export function listInstitutionReservations(db: D1Database, id: string, params: { startDate?: string; endDate?: string; limit?: number; cursor?: string }): Promise<Page<ReservationDto>>;
export function searchReservations(db: D1Database, params: ReservationSearchQueryParams): Promise<Page<ReservationSearchHit>>;
export function listScrapeRuns(db: D1Database): Promise<ScrapeRun[]>; // 自治体別 MAX(fetched_at)
```

実装の要点（コードはこの契約に従う）:
- ソート順は現行 Hasura と同一: institutions = `municipality, building_kana, institution_kana`（+ tiebreak `id`）、reservations = `date`（+ tiebreak `institution_id`）。
- keyset 継続条件は SQLite の**行値比較**を使う。`LIMIT ?+1` で 1 行余分に取り、`items.length > limit` なら hasNextPage=true + 末尾を捨てて endCursor を作る。
- boolean フィルタ `isAvailableStrings=true` は `is_available_strings = 'AVAILABILITY_DIVISION_AVAILABLE'` に変換（現行 `resolveAvailability` と同じ）。
- `reservation` / `fee_divisions` / `weekday_usage_fee` / `holiday_usage_fee` 列は `JSON.parse` して DTO に詰める。
- **予約を返す 2 つのクエリは必ず `loadHolidays(db)` を先に呼び、祝日配列を JSON 文字列でバインドする**（`is_holiday` の導出に使う。`json_each` はバインド値への仮想テーブルなので rows_read を増やさない）。

```sql
-- listInstitutions（cursor ありの場合の継続条件込み。動的 WHERE は条件配列を join）
SELECT id, municipality, building, institution, institution_size,
       is_available_strings, is_available_woodwind, is_available_brass, is_available_percussion,
       is_equipped_music_stand, is_equipped_piano, updated_at
FROM institutions
WHERE municipality IN (/* … */)
  AND is_available_brass = 'AVAILABILITY_DIVISION_AVAILABLE'   -- true 指定時のみ
  AND institution_size IN (/* … */)                            -- 指定時のみ
  AND (municipality, building_kana, institution_kana, id) > (?, ?, ?, ?)  -- cursor 指定時のみ
ORDER BY municipality, building_kana, institution_kana, id
LIMIT ?;  -- limit + 1
```

```sql
-- searchReservations
--   ?1 = 祝日の JSON 配列（例 '["2026-07-20","2026-08-11"]'）。loadHolidays() の結果
--   is_holiday は列ではなく式で導出する（土日 OR 祝日リスト）
SELECT r.institution_id, r.date, r.reservation, r.updated_at,
       r.is_morning_vacant, r.is_afternoon_vacant, r.is_evening_vacant,
       (strftime('%w', r.date) IN ('0', '6')
        OR r.date IN (SELECT value FROM json_each(?1))) AS is_holiday,
       i.id AS i_id, i.municipality, i.building, i.institution, i.institution_size
FROM reservations r
JOIN institutions i ON i.id = r.institution_id
WHERE r.date >= ?2 AND r.date <= ?3
  AND i.municipality IN (/* … */)                    -- 指定時のみ
  AND (strftime('%w', r.date) IN ('0', '6')
       OR r.date IN (SELECT value FROM json_each(?1)))   -- isHoliday=true のときのみ
  AND r.is_morning_vacant = 1                        -- isMorningVacant=true のときのみ（他 2 つも同様）
  AND (r.date, r.institution_id) > (?, ?)            -- cursor 指定時のみ
ORDER BY r.date, r.institution_id
LIMIT ?;  -- limit + 1
```

```sql
-- listInstitutionReservations（PK がそのままカバーする。?1 は同じく祝日 JSON 配列）
SELECT institution_id, date, reservation, updated_at,
       is_morning_vacant, is_afternoon_vacant, is_evening_vacant,
       (strftime('%w', date) IN ('0', '6')
        OR date IN (SELECT value FROM json_each(?1))) AS is_holiday
FROM reservations
WHERE institution_id = ?2 AND date >= ?3 AND date <= ?4
  AND date > ?  -- cursor 時のみ（この 1 テーブルは date 単独が keyset キー）
ORDER BY date
LIMIT ?;

-- listScrapeRuns
SELECT municipality, MAX(fetched_at) AS fetched_at FROM scrape_runs GROUP BY municipality;
```

- [ ] **Step 1: cursor.test.ts → cursor.ts**（encode→decode の往復、不正 base64 で null、フィールド欠落で null）
- [ ] **Step 2: fixtures.ts**（institutions 3 件〔うち 1 件は非 RFC UUID `f4d8d9d8-8594-b8b4-0000-000000000001`〕+ reservations 120 件〔2 施設 × 60 日〕+ holidays〔`2026-07-20` 等〕+ scrape_runs を `env.DB.batch` で投入。ストレージ分離はテストファイル単位なので各ファイルの `beforeAll` で呼ぶ）
- [ ] **Step 3: queries.test.ts を書く** — 最低限:
  - 一覧のソート順とページング（limit=2 で 2 ページ目が続きから始まり重複・欠落なし）
  - municipality / institutionSizes / isAvailableBrass フィルタ
  - 非 RFC UUID の施設が detail で引ける
  - reservations の日付範囲と keyset 継続
  - search の isMorningVacant フィルタと JOIN 結果の形状（ReservationSearchHit）
  - **生成列のセマンティクス固定（IMMV との同値性テスト。ここが実質の回帰防波堤）**:
    - `{MORNING: VACANT}` → is_morning_vacant = 1
    - `{MORNING_ONE: VACANT, MORNING_TWO: VACANT}` → 1
    - `{MORNING_ONE: VACANT, MORNING_TWO: STATUS_1}` → 0
    - `{DIVISION_1: VACANT}` のみ → 3 フラグとも 0（現行ビューと同じ挙動）
    - キーが 1 つも無い `{}` → 3 フラグとも 0（NULL 伝播が COALESCE で 0 になること）
  - **is_holiday のクエリ時導出**: 土曜（2026-07-18）と祝日（2026-07-20、holidays に登録）が true、平日（2026-07-15）が false。**holidays テーブルに行を足すと、reservations を書き直さずに is_holiday の結果が変わること**（この設計の主眼）
  - listScrapeRuns が自治体ごとに最新 1 件を返す
- [ ] **Step 4: 実装 → PASS → Commit**

```bash
git add packages/api/src/db packages/api/test
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(api): PR3-1 読み取りクエリと keyset カーソルを実装"
```

### Task 3-1-4: Auth0 検証とロール解決（TDD）

**Files:**
- Create: `packages/api/src/auth/auth0.ts` + Test: `packages/api/test/auth0.test.ts`

```typescript
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type Role = "anonymous" | "user";

const HASURA_CLAIMS = "https://hasura.io/jwt/claims";
const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";

// JWKS はユーザー非依存のためモジュールレベルのキャッシュで良い（可変シングルトン禁止の対象外）
let jwks: JWTVerifyGetKey | null = null;

function getJwks(domain: string): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  return jwks;
}

/**
 * Auth0 access token からロールを解決する。検証失敗・トークン無しは anonymous。
 * クレームの優先順: カスタム namespace（role/trial）→ Hasura namespace（x-hasura-default-role）。
 * trial ユーザーは予約データ非公開のため anonymous 扱い（現行 viewer の UI ゲートと同義）。
 */
export async function resolveRole(
  token: string | undefined,
  env: { AUTH0_DOMAIN: string; AUTH0_AUDIENCE: string },
  getKey: JWTVerifyGetKey = getJwks(env.AUTH0_DOMAIN)
): Promise<Role> {
  if (!token) return "anonymous";
  try {
    const { payload } = await jwtVerify(token, getKey, {
      // issuer は末尾スラッシュ必須。alg は実 JWKS（trfv.jp.auth0.com）が RS256 のため RS256
      // （Hasura の compose.yml は type: RS512 と書いてあるが、テナントの署名鍵は RS256）
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      audience: env.AUTH0_AUDIENCE,
      algorithms: ["RS256"],
    });
    const app = payload[APP_CLAIMS] as { role?: string; trial?: boolean } | undefined;
    if (app?.trial === true) return "anonymous";
    if (app?.role && app.role !== "anonymous") return "user";
    const hasura = payload[HASURA_CLAIMS] as Record<string, unknown> | undefined;
    return hasura?.["x-hasura-default-role"] === "user" ? "user" : "anonymous";
  } catch {
    return "anonymous";
  }
}
```

- [ ] **Step 1: テスト** — jose の `generateKeyPair` + `createLocalJWKSet` + `SignJWT` でトークンを自作し、`getKey` を注入して検証（ネットワーク不要）:
  - `x-hasura-default-role: user` → "user"
  - `x-hasura-default-role: anonymous` → "anonymous"
  - カスタムクレーム `{role: "user", trial: true}` → "anonymous"（trial 優先）
  - audience 不一致 / 期限切れ / 署名不正 / トークン無し → "anonymous"
- [ ] **Step 2: 実装 → PASS → Commit**

### Task 3-1-5: ルーティングと読み取りエンドポイント（TDD）

**Files:**
- Modify: `packages/api/src/worker.ts`（ルーター + 各ハンドラ）
- Create: `packages/api/test/endpoints.test.ts`

実装の要点:
- ルーティングは手書き switch/regex（Hono は不採用 — 9 ルートに対する依存追加を避ける。リポジトリの薄い依存方針に従う）。骨格:

```typescript
const ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_INSTITUTION = new RegExp(`^/v1/institutions/(${ID_PATTERN})$`, "i");
const RE_INSTITUTION_RESERVATIONS = new RegExp(
  `^/v1/institutions/(${ID_PATTERN})/reservations$`,
  "i"
);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    try {
      if (request.method === "GET") {
        if (pathname === "/v1/health") return handleHealth(env);
        if (pathname === "/v1/institutions") return handleListInstitutions(url, env);
        if (pathname === "/v1/scrape-runs") return handleScrapeRuns(env);
        const detail = pathname.match(RE_INSTITUTION);
        if (detail) return handleInstitutionDetail(detail[1] as string, env);
        const resv = pathname.match(RE_INSTITUTION_RESERVATIONS);
        if (resv) return handleInstitutionReservations(request, resv[1] as string, url, env);
        if (pathname === "/v1/reservations/search") return handleSearch(request, url, env);
        if (pathname === "/v1/admin/reservations/export") return handleExport(request, url, env); // PR 3-2
      }
      if (request.method === "PUT" && pathname.startsWith("/v1/admin/")) {
        return handleAdminPut(request, pathname, env); // PR 3-2
      }
      return Response.json({ error: "not found" }, { status: 404 });
    } catch (error) {
      console.error(error);
      return Response.json({ error: "internal error" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
```
- ID path 検証: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`（不一致は 404）。
- 認可: `/v1/institutions*` と `/v1/scrape-runs` は公開 + `Cache-Control: public, max-age=300`。`/v1/institutions/:id/reservations` と `/v1/reservations/search` は `resolveRole` が "user" 以外なら **401（トークン無し）/ 403（あるが不足）**。
- クエリパラメータのパース: カンマ区切り配列、`true` のみの boolean、`limit` は 1..100 に clamp（既定 50）、search の `startDate`/`endDate` は `YYYY-MM-DD` regex（不正は 400）。
- エラーレスポンスは `{ error: string }` JSON。

- [ ] **Step 1: endpoints.test.ts** — SELF.fetch で:
  - 公開系 200 + Cache-Control ヘッダ
  - reservations 系: トークン無し 401 / 無効トークン 403（テスト用に `resolveRole` を直接使わず、無署名トークンで 403 になることを確認）
  - 不正 ID 404、不正日付 400
  - ページングの一連フロー（cursor を辿って全行取得）
- [ ] **Step 2: 実装 → PASS**（認可付きテストは Task 3-1-4 のローカル JWKS を流用する: worker は `env.TEST_JWKS_JSON` が定義されていれば `createLocalJWKSet` を使う小さなフックを持ち、この binding は **vitest.config.ts の `cloudflareTest` の `miniflare.bindings` でのみ**供給する — 本番 wrangler.jsonc には書かない）
- [ ] **Step 3: 全体検証 → Commit → PR 作成**

```bash
npm run typecheck:all && npm run lint:all && npm run format:check:all && npm run knip && npm run test -w @shisetsu-viewer/api
git push -u origin feat/rebuild-api-read
gh pr create --title "feat(api): PR3-1 packages/api 新設（D1 読み取り）" --body "..."
```

### Task 3-1-6: デプロイと実環境スモーク（マージ後の運用ステップ）

- [ ] `npx wrangler d1 migrations apply shisetsu-db --remote`（本番 D1 にスキーマ適用）
- [ ] 初回デプロイ: `npm run deploy -w @shisetsu-viewer/api` → 以後の CD 用に **Workers Builds に接続**（ダッシュボード。ビルド設定: `npx wrangler deploy` / ルート `packages/api`。mcp-server 未接続問題と同じ轍を踏まない）
- [ ] custom domain `api.shisetsudb.com` が routes 設定で有効化されたことを確認（`curl https://api.shisetsudb.com/v1/health` → `{"ok":true}`）
- [ ] データ未投入のため一覧は空配列で 200 が返ることを確認（`curl "https://api.shisetsudb.com/v1/institutions?limit=5"`）
- [ ] 実 Auth0 トークン（Task 3-1-0 の CLI トークン）で `/v1/reservations/search` が 200（空 items）、トークン無しで 401 を確認

---

# PR 3-2: 書き込み + GitHub OIDC + dual-write（差分書き込み）

ブランチ: `feat/rebuild-api-write`(master ベース、PR 3-1 マージ後)

### Task 3-2-1: 差分 upsert（TDD — このフェーズの心臓部）

**Files:**
- Create: `packages/api/src/db/upsert.ts` + Test: `packages/api/test/upsert.test.ts`

**Interfaces:**

```typescript
// upsert.ts
export interface UpsertResult {
  rowsWritten: number;
}
export function upsertReservations(
  db: D1Database,
  rows: { institution_id: string; date: string; reservation: Record<string, string> }[]
): Promise<UpsertResult>;
export function upsertInstitutions(db: D1Database, rows: Institution[]): Promise<UpsertResult>;
export function upsertHolidays(
  db: D1Database,
  rows: { date: string; name: string }[]
): Promise<UpsertResult>;
export function recordScrapeRun(
  db: D1Database,
  municipality: string,
  runId: string,
  rowsWritten: number
): Promise<void>;
export function todayRowsWritten(db: D1Database): Promise<number>; // 予算ガード用
```

差分 upsert の SQL（1 チャンク = JSON 文字列 1 パラメータを `json_each` で展開 — バインド 100 個制限を回避）。**空き 3 フラグは生成列が自動計算するので INSERT / SET のどちらにも現れず、差分ガードは `reservation` 1 列だけで済む**:

```sql
INSERT INTO reservations (institution_id, date, reservation)
SELECT
  je.value ->> '$.institution_id',
  je.value ->> '$.date',
  je.value ->> '$.reservation'      -- Worker が canonicalize 済みの JSON "文字列"
FROM json_each(?1) AS je
WHERE TRUE                          -- 必須: INSERT...SELECT + ON CONFLICT の SQLite パース規則
ON CONFLICT (institution_id, date) DO UPDATE SET
  reservation = excluded.reservation,
  updated_at  = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE reservations.reservation IS NOT excluded.reservation;
```

実装ノート:
- **ペイロードの組み立て**: Worker が各行の `reservation` を `canonicalizeReservation()`（shared）で**文字列化してから** JSON 配列に詰める。つまり要素は `{institution_id, date, reservation: "{\"RESERVATION_DIVISION_MORNING\":\"...\"}"}`。SQL 側は `->>`（SQL 表現 = 文字列）で取り出してそのまま列に入れる。オブジェクトのまま渡して `->` で取り出す方式は SQLite の再直列化に挙動を委ねることになるため採らない。
- `IS NOT` は NULL 安全な不等比較（`<>` は NULL 相手だと NULL になり UPDATE が起きない罠がある）。
- ガードが偽の行は **UPDATE 自体が発生しない**（SQLite のセマンティクス）→ `rows_written` に計上されない。`updated_at` も実変化時のみ進む。
- 戻り値 `rowsWritten` は D1 実行結果の `meta.rows_written`（無ければ `meta.changes` にフォールバック）。
- institutions upsert も同形（`ON CONFLICT (id) DO UPDATE ... WHERE` に全 25 列の `IS NOT` を OR で列挙。capacity / area の NULL も `IS NOT` なら安全）。594 行なので冗長さは許容。
- 予算ガードの集計: `SELECT COALESCE(SUM(rows_written), 0) FROM scrape_runs WHERE run_date = date('now')`（D1 の日次枠は 00:00 UTC リセットなので UTC 日付で集計する）。
- `recordScrapeRun` は upsert 本体と `db.batch()` で 1 トランザクションにまとめる:

```sql
INSERT INTO scrape_runs (municipality, run_id, run_date, fetched_at, rows_written)
VALUES (?1, ?2, date('now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?3)
ON CONFLICT (municipality, run_id) DO UPDATE SET
  rows_written = scrape_runs.rows_written + excluded.rows_written,
  fetched_at   = excluded.fetched_at;
```

- [ ] **Step 1: upsert.test.ts** — 実 D1（miniflare）で:
  - 新規 100 行 insert → 全行入り、**生成列の 3 フラグが正しく計算される**
  - **同一データを再 upsert → `meta.rows_written` が 0**（差分ガードの核心）
  - 1 行だけ reservation を変えて再 upsert → 1 行のみ更新、`updated_at` がその行だけ進む
  - **キー順だけが違う reservation を再 upsert → 変更扱いにならない**（Worker 側 canonicalize の効果。ここが壊れると書き込み枠が即死する）
  - reservation を変えると **生成列のフラグも追随する**（`{MORNING: STATUS_1}` → `{MORNING: VACANT}` で is_morning_vacant が 0 → 1）
  - チャンク 501 行以上は 400（境界テストは Task 3-2-2 の adminEndpoints 側でも実施）
- [ ] **Step 2: 実装 → PASS → Commit**

**⚠ 本番課金の検証はテストでは完結しない:** ローカル miniflare の `rows_written` と本番課金メータの一致は保証されない。dual-write 初日に CF ダッシュボード（D1 metrics）で「無変化 run の rows_written が ~0」を実測確認する（Task 3-2-6）。効いていなければ「サーバ側 read-diff（SELECT で現行行を引いて JS で差分抽出 → 変化行のみ upsert）」へ切替（読み取りは 500 万行/日で余裕）。この切替は upsert.ts 内部の実装差し替えで済み、API 契約は不変。

### Task 3-2-2: GitHub OIDC 検証と admin エンドポイント（TDD）

**Files:**
- Create: `packages/api/src/auth/githubOidc.ts` + Test: `packages/api/test/githubOidc.test.ts`
- Modify: `packages/api/src/worker.ts`（admin ルート追加）
- Create: `packages/api/test/adminEndpoints.test.ts`

```typescript
// githubOidc.ts
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey {
  jwks ??= createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
  return jwks;
}

/**
 * GitHub Actions OIDC トークンを検証する。
 * ピンするクレーム: iss / aud / repository / ref が refs/heads/* であること。
 *  - ref を特定ブランチに固定しない: retry run・workflow_dispatch・ブランチでの検証実行も通したい
 *  - ただし refs/heads/ 前置は要求する（PR の merge ref = refs/pull/N/merge を弾く）
 *  - fork からの PR はそもそも id-token: write を得られない
 *  - sub は environment 利用で形式が変わるためピンしない
 */
export async function verifyGithubOidc(
  token: string,
  env: { GITHUB_REPOSITORY: string; OIDC_AUDIENCE: string },
  getKey: JWTVerifyGetKey = getJwks()
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getKey, {
      issuer: GITHUB_ISSUER,
      audience: env.OIDC_AUDIENCE,
      algorithms: ["RS256"],
    });
    const ref = payload["ref"];
    return (
      payload["repository"] === env.GITHUB_REPOSITORY &&
      typeof ref === "string" &&
      ref.startsWith("refs/heads/")
    );
  } catch {
    return false;
  }
}
```

admin 認可の合成（worker.ts 内）:

```typescript
async function authorizeAdmin(request: Request, env: Env): Promise<boolean> {
  const adminKey = request.headers.get("X-Admin-Key");
  if (adminKey && env.ADMIN_API_KEY) {
    // 先に SHA-256 を取って長さを揃えてから定数時間比較する（長さ差の漏洩も防ぐ）。
    // crypto.subtle.timingSafeEqual は Workers の拡張。
    const enc = new TextEncoder();
    const [a, b] = await Promise.all([
      crypto.subtle.digest("SHA-256", enc.encode(adminKey)),
      crypto.subtle.digest("SHA-256", enc.encode(env.ADMIN_API_KEY)),
    ]);
    return crypto.subtle.timingSafeEqual(a, b);
  }
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!bearer) return false;
  return verifyGithubOidc(bearer, env);
}
```

admin ルート:
- `PUT /v1/admin/reservations`（body: `UpsertReservationsRequest`）:
  1. `authorizeAdmin` 失敗 → 401
  2. rows は 1 リクエスト最大 500 行（超過は 400）
  3. **書き込み予算ガード**: `todayRowsWritten(db) > 80_000` なら **202 + `{received: rows.length, rowsWritten: 0, deferred: true}`** を返して書き込まない
  4. 各行の `reservation` を `canonicalizeReservation()` で正規化 → `upsertReservations` → `recordScrapeRun(municipality, runId, rowsWritten)`（`db.batch()` で 1 トランザクション）→ 200 + `UpsertResponse`
  - **祝日も空きフラグもここでは計算しない**（前者はクエリ時導出、後者は生成列）
- `PUT /v1/admin/institutions`（body: `{ rows: Institution[] }`）→ upsert + 200
- `PUT /v1/admin/holidays`（body: `{ rows: {date, name}[] }`）→ upsert + 200。**祝日を足しても reservations は 1 行も書き換わらない**（クエリ時導出の効果。テストで固定する）
- `GET /v1/admin/reservations/export?municipality=&cursor=&limit=1000` → パリティ突合用の dump（keyset、admin 認可）。`reservation` の正規化済み文字列と 3 フラグ・導出 is_holiday を返す
- ここで `GET /v1/scrape-runs`（公開・自治体別 MAX(fetched_at)）も配線する（queries.ts の `listScrapeRuns` は 3-1 で実装済み）

- [ ] **Step 1: githubOidc.test.ts**（ローカル JWKS 注入で: 正常 / repository 不一致 / issuer 不一致 / audience 不一致 / 期限切れ）
- [ ] **Step 2: adminEndpoints.test.ts**（X-Admin-Key 正常・不正、予算ガード 202、500 行制限 400、scrape_runs 反映、export のページング）
- [ ] **Step 3: 実装 → PASS → Commit**

### Task 3-2-3: scraper 側 d1Api クライアントと dual-write 配線

**Files:**
- Create: `packages/scraper/tools/backend/d1Api.ts`
- Modify: `packages/scraper/tools/updateReservations.ts` / `updateInstitutions.ts`（dual-write 分岐追加）
- Modify: `.github/workflows/scraper.yml` / `database.yml` / `.github/actions/scrape/action.yml`（id-token 権限 + env 配線）
- Modify: `packages/scraper/.env.sample`（`D1_API_ENDPOINT` / `ADMIN_API_KEY` 追記）

`tools/backend/d1Api.ts`:

```typescript
import type { Institution } from "@shisetsu-viewer/shared";
import type { ReservationRow } from "./types.ts";

const CHUNK = 500;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** GitHub Actions では OIDC、ローカルでは ADMIN_API_KEY を使う */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const requestUrl = process.env["ACTIONS_ID_TOKEN_REQUEST_URL"];
  const requestToken = process.env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"];
  if (requestUrl && requestToken) {
    const audience = process.env["OIDC_AUDIENCE"] ?? "https://api.shisetsudb.com";
    const res = await fetch(`${requestUrl}&audience=${encodeURIComponent(audience)}`, {
      headers: { Authorization: `bearer ${requestToken}` },
    });
    if (!res.ok) throw new Error(`OIDC token fetch failed: ${res.status}`);
    const { value } = (await res.json()) as { value: string };
    return { Authorization: `Bearer ${value}` };
  }
  return { "X-Admin-Key": requireEnv("ADMIN_API_KEY") };
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const endpoint = requireEnv("D1_API_ENDPOINT");
  const headers = { "Content-Type": "application/json", ...(await getAuthHeaders()) };
  const maxRetries = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${endpoint}${path}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status >= 500) throw new Error(`HTTP error! status: ${res.status}`);
      if (!res.ok && res.status !== 202) {
        throw new Error(`D1 API error ${res.status}: ${await res.text()}`);
      }
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      const retryable = error instanceof Error && error.message.startsWith("HTTP error!");
      if (attempt < maxRetries && retryable) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

interface UpsertResponse {
  received: number;
  rowsWritten: number;
  deferred: boolean;
}

export async function upsertReservations(
  rows: ReservationRow[],
  municipality: string,
  runId: string
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await putJson<UpsertResponse>("/v1/admin/reservations", {
      municipality,
      runId,
      rows: chunk,
    });
    written += res.rowsWritten;
    if (res.deferred) {
      console.warn(`d1: daily write budget reached; remaining chunks deferred to next run`);
      break;
    }
    console.log(`d1: ${i + 1} ~ ${i + chunk.length}, rows_written: ${res.rowsWritten}`);
  }
  return written;
}

export async function upsertInstitutions(rows: Institution[]): Promise<number> {
  const res = await putJson<UpsertResponse>("/v1/admin/institutions", { rows });
  return res.rowsWritten;
}
```

`updateReservations.ts` の dual-write 分岐（PR 3-0 の Step 2 で書いた「`const affected = await upsertReservations(rows);`」の直後に追加。import は名前衝突を避けて alias する）:

```typescript
import { upsertReservations as d1UpsertReservations } from "./backend/d1Api.ts";
// …ループ内、Hasura upsert の直後:
if (process.env["D1_API_ENDPOINT"]) {
  const runId = process.env["GITHUB_RUN_ID"] ?? new Date().toISOString();
  try {
    const written = await d1UpsertReservations(rows, municipality, runId);
    console.log(`${target}: d1 rows_written: ${written}`);
  } catch (error) {
    // dual-write 期間中は D1 側の失敗で本流（Hasura）を落とさない
    console.error(`${target}: d1 dual-write failed:`, error);
  }
}
```

（`municipality` は同ループで既に組み立て済みの `MUNICIPALITY_*` 文字列。`updateInstitutions.ts` も同様に `d1UpsertInstitutions(data)` を try/catch で追加。）

workflow 配線:
- `scraper.yml` / `database.yml` の冒頭 `permissions:` に `id-token: write` を追加。
- **dual-write のキルスイッチは GitHub の repository variable にする**: workflow の env は `D1_API_ENDPOINT: ${{ vars.D1_API_ENDPOINT }}`。変数が未設定なら空文字 → scraper 側は D1 書き込みをスキップ（= dual-write オフ）。**PR をマージしてもすぐには D1 に書かれない**。初期シード完了後に GitHub の Settings → Variables で `D1_API_ENDPOINT = https://api.shisetsudb.com` を設定した瞬間に dual-write が始まり、変数を消せば即座に止まる（コード変更・再デプロイ不要）。
- `.github/actions/scrape/action.yml` の「Save scraped data」ステップ env に `D1_API_ENDPOINT: ${{ env.D1_API_ENDPOINT }}` を追加。`GITHUB_RUN_ID` はランナーが自動供給する（composite 内でも参照可能なことを実装時に確認）。
- **注意: composite action のステップに OIDC 環境変数（`ACTIONS_ID_TOKEN_REQUEST_*`）が渡るのは、その job に `permissions: id-token: write` がある場合のみ**。scrape ジョブは workflow トップレベルの permissions を継承する。

- [ ] **Step 1: 実装 + typecheck + 既存 test:unit 緑**
- [ ] **Step 2: ローカル検証**（ADMIN_API_KEY 経路）: `wrangler dev` + ローカル D1 に対して `D1_API_ENDPOINT=http://localhost:8787 ADMIN_API_KEY=dev node tools/updateReservations.ts tokyo-chuo`（手元に test-results がある状態で）
- [ ] **Step 3: Commit**

### Task 3-2-4: 初期シード（seed.ts + 祝日）

**Files:**
- Create: `packages/scraper/tools/backend/seed.ts`

Hasura から実データを引いて D1 admin API に流すワンショットスクリプト:

```typescript
// 使い方: node --env-file=.env tools/backend/seed.ts <groupA|groupB|holidays|institutions>
// 前提 env: GRAPHQL_ENDPOINT + M2M_TOKEN（読み出し元）/ D1_API_ENDPOINT + ADMIN_API_KEY（書き込み先）
```

- `institutions`: `data/institutions/*.json`（ローカルが真）を全自治体 upsert（~594 行 × 増幅 2 ≈ 1.2k 書き込み）
- `holidays`: Hasura `holidays` テーブルを GraphQL で全件取得（`query { holidays { date name } }`）→ `PUT /v1/admin/holidays`
- `groupA` / `groupB`: 自治体グループの reservations（**date >= 今日** のみ。過去履歴は pg_dump アーカイブに委ねる）を Hasura から吸い出し、500 行チャンクで `PUT /v1/admin/reservations`（runId = `seed-<date>`）。読み出しクエリ（ワンショットなので offset ページングで良い）:

```graphql
query seed_reservations($municipality: String!, $from: date!, $limit: Int!, $offset: Int!) {
  reservations(
    where: { institution: { municipality: { _eq: $municipality } }, date: { _gte: $from } }
    order_by: { id: asc }
    limit: $limit
    offset: $offset
  ) {
    institution_id
    date
    reservation
  }
}
```

（M2M トークンのロールで reservations / holidays が読めない場合のフォールバック: `HASURA_ADMIN_SECRET` を .env に一時設定 — `tools/request.ts` の getAuthHeaders は admin secret 優先の分岐を既に持つ。）

グループ分割。**新規 INSERT は本体 1 行 + `idx(date)` 1 行 = 2 rows written**（公式ドキュメントの脚注: インデックス列を含む書き込みは追加で 1 行計上）なので、行数 × 2 が書き込み量になる。各日を予算ガード（8 万）未満に収める:

| グループ | 自治体 | 行数 | 書き込み（×2） |
|---|---|---:|---:|
| A（1 日目） | edogawa 11,832 / arakawa 17,934 / koutou 5,904 / chuo 1,218 | 36,888 | **73.8k** |
| B（2 日目） | kawasaki 15,799 / toshima 9,072 / sumida 4,284 / bunkyo 3,616 / kita ~1,914 / ota 1,577 | 36,262 | **72.5k** |

シード中は dual-write を**まだ有効にしない**（repository variable `D1_API_ENDPOINT` が未設定のため）。よってシードの書き込みと日次スクレイプの書き込みが同日に競合せず、どちらの日も予算ガードに触れない。シード完了後に変数を設定すると、**その直後の最初の dual-write run で rows_written が小さい値（数千）に収まるかどうかで差分ガードの有効性が即座に判定できる**（テーブルが既に埋まっているため）。

- [ ] **Step 1: seed.ts 実装 + typecheck**
- [ ] **Step 2: リハーサル**: `wrangler dev` のローカル D1 に対して groupA を流し、`GET /v1/institutions` / `/v1/reservations/search` が実データで引けることを確認
- [ ] **Step 3: Commit**（実行は Task 3-2-6 の運用手順で）

### Task 3-2-5: パリティ突合スクリプト

**Files:**
- Create: `packages/scraper/tools/backend/parity.ts`

```typescript
// 使い方: node --env-file=.env tools/backend/parity.ts [municipality]
// Hasura（reservations + searchable_reservations）と D1（GET /v1/admin/reservations/export）を突合:
//  1. 自治体×日付ごとの件数一致
//  2. 全行の reservation 比較（両側とも canonicalizeReservation() を通して文字列比較）
//  3. 空き 3 フラグ: D1 の生成列 == Hasura の searchable_reservations の is_*_vacant
//     （生成列の CASE 式が pg_ivm の CASE 式と同値であることの実データ検証。ここが本命）
//  4. is_holiday: D1 のクエリ時導出 == Hasura の reservations.is_holiday 列
// 出力: 乖離 0 なら "PARITY OK <muni> rows=<n>"、乖離があれば行キーと差分を列挙して exit 1
```

- [ ] **Step 1: 実装 + typecheck → Commit**
- [ ] **Step 2: PR 作成 → ci-success 緑 → マージ**

### Task 3-2-6: 運用手順（マージ後、dual-write 開始 → 2 週間ゲート）

- [ ] **secrets 追加**（ユーザー確認の上）: `wrangler secret put ADMIN_API_KEY -c packages/api/wrangler.jsonc`（`openssl rand -hex 32`）。GitHub 側は OIDC のため**リポジトリ secrets 追加は不要**（ローカル .env にのみ ADMIN_API_KEY を置く）
- [ ] **シード実行（2 日。この間 dual-write はオフのまま）**: Day1 = `institutions` + `holidays` + `groupA`、Day2 = `groupB`。各日実行後に CF ダッシュボード → D1 → shisetsu-db → Metrics で rows written が想定内（~7.5 万/日以下）であることを確認
- [ ] **dual-write を有効化**: GitHub の Settings → Secrets and variables → Actions → Variables に **`D1_API_ENDPOINT = https://api.shisetsudb.com`** を設定。次回 cron から D1 にも書かれる。**止めたくなったら変数を削除するだけ**（コード変更不要のキルスイッチ）
- [ ] **単一自治体での先行検証**: 変数設定後すぐ `gh workflow run scraper.yml -f municipality=tokyo-kita` を dispatch。Save scraped data のログに Hasura の `affected_rows` と `d1 rows_written` の両方が出ること、かつ **D1 側が Hasura 側より明確に小さい**こと（＝差分ガードが効いている）を確認してから全量 cron の観察に進む
- [ ] **差分ガードの実測（この PR の合否を分ける観測）**: シード済みテーブルに対する最初の全量 run で `d1 rows_written` の合計が数千オーダーに収まること。**ほぼ全行（7 万台）が書かれていたら WHERE ガードが課金上効いていない**か、reservation 文字列が毎回変わっている（正規化漏れ）。前者なら Task 3-2-1 の注記どおりサーバ側 read-diff へ切替、後者なら canonicalize の欠陥を修正する。両者は「Hasura 側の affected_rows と比べて D1 だけが大きいか」で切り分ける
- [ ] **2 週間ゲート（毎日 1 分の確認 + 週 2 回のパリティ）**:
  - CF ダッシュボードで日次 rows_written（目標: ~0.9 万/日、5 万超えたら調査）
  - `node tools/backend/parity.ts` を週 2 回実行、乖離 0 を継続確認
  - sumida の structural 失敗など scraper 側の既知問題はパリティ対象外にせずそのまま比較（両側同じデータになるはず）
- [ ] **ゲート合格基準**（PR 3-3 / 3-4 に進む条件): パリティ乖離 0 が 2 週連続 / 日次 rows_written が Free 枠の 5 割未満で安定 / 202 deferred が発生していない

---

# PR 3-3: viewer 切り替え（GraphQL → 型付き REST クライアント）

ブランチ: `feat/rebuild-viewer-api`（master ベース）

**前提ゲート:** dual-write 2 週間のパリティ検証合格（PR 3-2 の検証節）。viewer のロールバックは CF Workers の instant rollback（Hasura は PR 3-5 まで生かしておく）。

**spec からの変更点:** 「sentinel バグの共通フック化」は PR #1605 で対応済みのため本 PR のスコープ外。`usePaginatedQuery` の返り値は現行の `data: TItem[]`（フラット配列）形状を維持する（spec の `{items, pageInfo}` 案より呼び出し側変更が小さく、pageInfo は hook 内部でしか使わないため）。

### Task 3-3-1: API クライアントと型付きエンドポイント（TDD）

**Files:**
- Create: `packages/viewer/api/client.ts`
- Create: `packages/viewer/api/client.test.ts`
- Create: `packages/viewer/api/endpoints.ts`
- Modify: `packages/viewer/constants/env.ts` / `packages/viewer/env.d.ts`（`VITE_API_ENDPOINT` 追加、`VITE_GRAPHQL_ENDPOINT` 削除）
- Modify: `packages/viewer/.env.sample`(と手元 .env)

**Interfaces:**
- Produces: `apiGet<T>(path, params, token?)`、`fetchInstitutions` / `fetchInstitutionDetail` / `fetchInstitutionReservations` / `searchReservations` / `fetchScrapeRuns` — Task 3-3-2 以降のフックとページが使う。
- Consumes: `@shisetsu-viewer/shared` の `apiTypes.ts`（PR 3-1）。

- [ ] **Step 1: client.test.ts を書く（既存 `api/graphqlClient.test.ts` の置き換え）**

検証項目: (1) クエリパラメータの直列化（配列はカンマ区切り、undefined/null は省略、boolean は `true` のみ付与）、(2) token があれば `Authorization: Bearer`、無ければヘッダ無し、(3) 非 2xx で本文メッセージ付き throw、(4) 200 で JSON を返す。MSW の `http.get` でモック。

```typescript
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { worker } from "../test/mocks/browser";
import { apiGet } from "./client";

const ENDPOINT = "https://api.test.example";

describe("apiGet", () => {
  it("配列パラメータをカンマ区切りで直列化し、null/undefined を省略する", async () => {
    let capturedUrl = "";
    worker.use(
      http.get(`${ENDPOINT}/v1/institutions`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
      })
    );
    await apiGet(`${ENDPOINT}/v1/institutions`, {
      municipality: ["MUNICIPALITY_KOUTOU", "MUNICIPALITY_BUNKYO"],
      isAvailableBrass: true,
      institutionSizes: undefined,
      limit: 100,
    });
    const url = new URL(capturedUrl);
    expect(url.searchParams.get("municipality")).toBe("MUNICIPALITY_KOUTOU,MUNICIPALITY_BUNKYO");
    expect(url.searchParams.get("isAvailableBrass")).toBe("true");
    expect(url.searchParams.has("institutionSizes")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("token があれば Authorization ヘッダを付ける", async () => {
    let auth: string | null = null;
    worker.use(
      http.get(`${ENDPOINT}/v1/x`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({});
      })
    );
    await apiGet(`${ENDPOINT}/v1/x`, {}, "tok-123");
    expect(auth).toBe("Bearer tok-123");
  });

  it("非 2xx はエラーメッセージ付きで throw する", async () => {
    worker.use(
      http.get(`${ENDPOINT}/v1/x`, () =>
        HttpResponse.json({ error: "forbidden" }, { status: 403 })
      )
    );
    await expect(apiGet(`${ENDPOINT}/v1/x`, {})).rejects.toThrow(/403/);
  });
});
```

Run: `npx vitest run api/client.test.ts`（packages/viewer で）
Expected: FAIL（client.ts 未実装）

- [ ] **Step 2: client.ts を実装**

```typescript
export type QueryParams = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

function buildSearchParams(params: QueryParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) sp.set(key, value.join(","));
      continue;
    }
    sp.set(key, String(value));
  }
  return sp;
}

export async function apiGet<T>(url: string, params: QueryParams, token?: string): Promise<T> {
  const sp = buildSearchParams(params);
  const qs = sp.size > 0 ? `?${sp.toString()}` : "";
  const res = await fetch(`${url}${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
```

`constants/env.ts` は `API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT`（`GRAPHQL_ENDPOINT` を置換）。`env.d.ts` の `ImportMetaEnv` も同様に置換。

- [ ] **Step 3: endpoints.ts を実装**

```typescript
import type {
  InstitutionDetail,
  InstitutionsQueryParams,
  InstitutionSummary,
  Page,
  ReservationDto,
  ReservationSearchHit,
  ReservationSearchQueryParams,
  ScrapeRun,
} from "@shisetsu-viewer/shared";
import { API_ENDPOINT } from "../constants/env";
import { apiGet } from "./client";

export function fetchInstitutions(
  params: InstitutionsQueryParams,
  cursor: string | null
): Promise<Page<InstitutionSummary>> {
  return apiGet(`${API_ENDPOINT}/v1/institutions`, { ...params, cursor });
}

export function fetchInstitutionDetail(id: string): Promise<InstitutionDetail> {
  return apiGet(`${API_ENDPOINT}/v1/institutions/${id}`, {});
}

export function fetchInstitutionReservations(
  id: string,
  params: { startDate?: string; endDate?: string; limit?: number },
  cursor: string | null,
  token: string
): Promise<Page<ReservationDto>> {
  return apiGet(`${API_ENDPOINT}/v1/institutions/${id}/reservations`, { ...params, cursor }, token);
}

export function searchReservations(
  params: ReservationSearchQueryParams,
  cursor: string | null,
  token: string
): Promise<Page<ReservationSearchHit>> {
  return apiGet(`${API_ENDPOINT}/v1/reservations/search`, { ...params, cursor }, token);
}

export function fetchScrapeRuns(): Promise<{ items: ScrapeRun[] }> {
  return apiGet(`${API_ENDPOINT}/v1/scrape-runs`, {});
}
```

- [ ] **Step 4: テスト実行 → Commit**

Run: `npx vitest run api/` — PASS を確認。

```bash
git add packages/viewer/api/client.ts packages/viewer/api/client.test.ts packages/viewer/api/endpoints.ts packages/viewer/constants/env.ts packages/viewer/env.d.ts packages/viewer/.env.sample
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(viewer): PR3-3 型付き REST API クライアントを追加"
```

### Task 3-3-2: フックの置き換え（useApiQuery / usePaginatedQuery）

**Files:**
- Create: `packages/viewer/hooks/useApiQuery.ts`（`useGraphQLQuery.ts` の置き換え）
- Modify: `packages/viewer/hooks/usePaginatedQuery.ts`（Relay connection 依存を除去）
- 既存のフックテストがあれば同時に改修

**Interfaces:**
- Produces:
  - `useApiQuery<T>(fetcher: (token: string) => Promise<T>, key: string)` → `{ data, loading, error, refetch }`
  - `usePaginatedQuery<TItem>(fetchPage: (token: string, cursor: string | null) => Promise<Page<TItem>>, key: string)` → `{ data: TItem[] | undefined, loading, error, hasNextPage, fetchMore, fetchingMore }`（**返り値形状は現行と同一** — ページ側の変更を最小化）
- Consumes: `useAuth0()`（token, isLoading）— 現行と同じ注入方法。

- [ ] **Step 1: useApiQuery.ts を実装**

現行 `useGraphQLQuery.ts`（48 行）の構造を踏襲し、`graphqlQuery(query, variables, token)` 呼び出しを `fetcher(token)` に、`variablesKey` を `key` 引数に置き換える。auth ローディング待ち・cancelled ガード・refetch カウンタはそのまま移植する。

- [ ] **Step 2: usePaginatedQuery.ts を改修**

現行 96 行の構造（初回フェッチ、`variablesKey`/token でリセット、`fetchMore` の endCursorRef/fetchingMoreRef ガード、cancelled ガード）を維持し、以下だけ変える:
- 引数 `(query, variables, getConnection)` → `(fetchPage, key)`
- `getConnection(data).edges.map(e => e.node)` → `page.items`
- `pageInfo.hasNextPage` / `pageInfo.endCursor` は `page.pageInfo` から（プロパティ名は同一）

- [ ] **Step 3: 呼び出しゼロの状態で typecheck が落ちることを確認してから Task 3-3-3 に進む**

（このタスク単体では旧 `useGraphQLQuery.ts` がまだ残っていて良い。ページ切り替えと同時に削除する）

### Task 3-3-3: ページ切り替え + 旧レイヤ削除 + MSW REST 化

**Files:**
- Modify: `packages/viewer/pages/Institution.tsx` / `pages/Reservation.tsx` / `pages/Detail.tsx`
- Modify: `packages/viewer/utils/institution.ts` / `utils/reservation.ts`（`toXxxQueryVariables` → `toXxxQueryParams`。日付は `date-fns` の `format(d, "yyyy-MM-dd")` — 現行の `toDateString()`（"Sat Jul 12 2026"）をやめる）
- Delete: `packages/viewer/api/queries.ts` / `api/graphqlClient.ts` / `api/graphqlClient.test.ts` / `utils/relay.ts` / `hooks/useGraphQLQuery.ts`
- Modify: `packages/viewer/test/mocks/handlers.ts` / `test/mocks/data.ts`（graphql.query → http.get、Relay 形状 → Page 形状、`btoa(JSON.stringify([1,"public",...]))` ID → 素の UUID）
- Modify: 影響するページ/コンポーネントテスト

ページ側の主な置換:
- `usePaginatedQuery(INSTITUTIONS_QUERY, vars, (d) => d.institutions_connection)` → `usePaginatedQuery((token, cursor) => fetchInstitutions(params, cursor), JSON.stringify(params))`
- 行クリックの `extractSinglePkFromRelayId(row.id)` → `row.id` 直接
- `useGraphQLQuery(INSTITUTION_DETAIL_QUERY, {id})` → `useApiQuery((token) => fetchInstitutionDetail(id), id)`
- Reservation ページのヒット行は `ReservationSearchHit` 形状（`reservation` ネスト + `institution` ネスト — 現行の `SearchableReservationNode` とほぼ同形なので列定義の valueGetter は小変更）

「取得日時」の整理（spec 決定事項の具体化）:
- Reservation / Detail の行カラム `updated_at` のヘッダを **「更新日時」** に変更（差分書き込み後は「最終変化時刻」の意味になるため）
- Reservation ページと Detail の予約タブに、`fetchScrapeRuns()` 由来の **「データ取得: <自治体の最新 fetched_at>」** 表示を追加（`hooks/useScrapeRuns.ts` を新設、`useApiQuery` で取得、municipality キーで引く）

- [ ] **Step 1: MSW ハンドラを REST 化**（テストを先に新契約へ）
- [ ] **Step 2: ページ・utils を書き換え、旧ファイルを削除**（`git rm` を使う。`rm -rf` は権限で拒否される）
- [ ] **Step 3: viewer テストスイート全緑を確認**

Run: `TZ=Asia/Tokyo npx vitest run`（packages/viewer で）
Expected: 全 PASS（現在 537+ 件）

- [ ] **Step 4: knip / lint / typecheck / format**

Run: `npm run typecheck:all && npm run lint:all && npm run format:check:all && npm run knip`
Expected: PASS（queries.ts 等の削除で knip の指摘が出ないこと）

- [ ] **Step 5: Commit**

```bash
git add -A packages/viewer
PATH="$PWD/node_modules/.bin:$PATH" git commit -m "feat(viewer): PR3-3 データ層を Hasura GraphQL から packages/api REST に切り替え"
```

### Task 3-3-4: E2E 確認と PR・デプロイ検証

- [ ] **Step 1: ローカル実 API での確認** — `.env` の `VITE_API_ENDPOINT` を本番 `https://api.shisetsudb.com` に向けて `npm start`。施設一覧 / 詳細 / 予約検索（ログイン込み）/ 無限スクロールを手で確認。
- [ ] **Step 2: E2E** — `npm run test:e2e -w @shisetsu-viewer/viewer`。CI 用の `.env.test` に `VITE_API_ENDPOINT` を追加（ダミー値専用ヘッダの慣例に従う）。
- [ ] **Step 3: PR 作成 → ci-success 緑 → マージ**。CF Workers Builds が自動デプロイ。本番 app.shisetsudb.com で Step 1 と同じ動作確認。
- [ ] **Step 4: ロールバック手順の確認（記録のみ）** — CF ダッシュボード → Workers → shisetsu-viewer → Deployments → instant rollback。Hasura は PR 3-5 まで残っているため、旧デプロイに戻せば全機能が旧経路で動く。

---

# PR 3-4: mcp-server 切り替え（D1 直バインド + per-request DI）

ブランチ: `feat/rebuild-mcp-d1`（master ベース）。PR 3-3 と並行可。

**狙い:** モジュールレベル可変シングルトン（`graphqlClient.ts:6-12` を `worker.ts:167` がリクエスト毎に mutate）を、**リクエストごとに生成する DataSource の注入**に置き換え、トークン混線を型構造上不可能にする。

### Task 3-4-1: DataSource 抽象と 2 実装

**Files:**
- Create: `packages/mcp-server/dataSource.ts`（インターフェース）
- Create: `packages/mcp-server/d1DataSource.ts`（Worker 用: `@shisetsu-viewer/api` の `db/queries.ts` を D1 binding で呼ぶ薄いラッパ）
- Create: `packages/mcp-server/httpDataSource.ts`（stdio/CLI 用: api.shisetsudb.com への fetch。認証は Bearer（ユーザートークン）または `X-Admin-Key`）
- Modify: `packages/mcp-server/package.json`（workspace 依存 `@shisetsu-viewer/api`, `@shisetsu-viewer/shared` 追加）
- Modify: `packages/mcp-server/wrangler.jsonc`（`d1_databases` binding 追加 — PR 3-1 で作った DB と同一 `database_id`）

**Interfaces:**

```typescript
import type {
  InstitutionDetail,
  InstitutionsQueryParams,
  InstitutionSummary,
  Page,
  ReservationDto,
  ReservationSearchHit,
  ReservationSearchQueryParams,
} from "@shisetsu-viewer/shared";

export interface DataSource {
  listInstitutions(params: InstitutionsQueryParams): Promise<Page<InstitutionSummary>>;
  getInstitutionDetail(id: string): Promise<InstitutionDetail | null>;
  getInstitutionReservations(
    id: string,
    range: { startDate: string; endDate?: string }
  ): Promise<ReservationDto[]>;
  searchReservations(params: ReservationSearchQueryParams): Promise<Page<ReservationSearchHit>>;
}

/** 書き込みは admin モード（stdio）のみ */
export interface WritableDataSource extends DataSource {
  upsertReservations(req: UpsertReservationsRequest): Promise<UpsertResponse>;
  upsertInstitutions(rows: Institution[]): Promise<UpsertResponse>;
}
```

- `d1DataSource.ts` は `createD1DataSource(db: D1Database): DataSource` — 関数クロージャで db を保持（モジュール状態なし）。実装は `@shisetsu-viewer/api` の `queries.ts` 純関数への委譲のみ。
- `httpDataSource.ts` は `createHttpDataSource(endpoint: string, auth: { bearer?: string; adminKey?: string }): WritableDataSource`。

### Task 3-4-2: createServer の DI 化とツール書き換え

**Files:**
- Modify: `packages/mcp-server/server.ts` — `createServer(options: { dataSource: DataSource; allowReservations: boolean; write?: WritableDataSource })`
- Modify: `packages/mcp-server/tools/*.ts` — 各 register 関数が `dataSource` を受け取り、GraphQL 文字列組み立てを `dataSource.*()` 呼び出しに置換。**zod 入力スキーマは不変**（`paramHelpers.ts` の緩い hex ID 検証、`fields` enum も維持）。書き換えの型例（getInstitutionDetail）:

```typescript
export function registerGetInstitutionDetail(server: McpServer, dataSource: DataSource): void {
  server.registerTool(
    "get_institution_detail",
    { /* 既存の title/description/inputSchema をそのまま */ },
    async ({ id, fields }) => {
      const detail = await dataSource.getInstitutionDetail(id);
      if (!detail) {
        return { content: [{ type: "text", text: "施設が見つかりません" }], isError: true };
      }
      const result = pick(detail, INSTITUTION_DETAIL_FIELDS, fields);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
```
- Delete: `packages/mcp-server/graphqlClient.ts` / `m2mToken.ts` / `buildFieldSelection.ts`
- Create: `packages/mcp-server/pick.ts` — `fields` 指定を結果オブジェクトの pick に置換する util（`buildFieldSelection` の後継。allowlist 外は throw のまま）

```typescript
export function pick<T extends Record<string, unknown>>(
  obj: T,
  allowed: readonly string[],
  selected: readonly string[] | undefined
): Partial<T> {
  const fields = selected ?? allowed;
  for (const f of fields) {
    if (!allowed.includes(f)) throw new Error(`Invalid field: ${f}`);
  }
  return Object.fromEntries(fields.filter((f) => f in obj).map((f) => [f, obj[f]])) as Partial<T>;
}
```

- 読み取り 4 ツールは `allowReservations: false` のとき reservations 系 2 ツール（get_institution_reservations / search_reservations）を**登録しない**（現行の authMode 二値ゲートと同じ発想で、データ層任せだった anonymous 拒否を server 構成に昇格）。
- write 2 ツール（upsert_reservations / upsert_institutions）は `write` が渡された場合のみ登録。

### Task 3-4-3: worker.ts / index.ts(stdio) / cli.ts の配線

**Files:**
- Modify: `packages/mcp-server/worker.ts` — `mcpHandler.fetch` 内（L161-174）を per-request 生成に:

```typescript
// before: configureGraphQL(env.GRAPHQL_ENDPOINT, ctx.props.upstreamAccessToken); createServer({authMode:"auth0"})
const role = await resolveRole(ctx.props.upstreamAccessToken, env); // @shisetsu-viewer/api の auth0.ts を再利用
const server = createServer({
  dataSource: createD1DataSource(env.DB),
  allowReservations: role === "user",
});
```

- Modify: `packages/mcp-server/index.ts`（stdio）— `createHttpDataSource(env.API_ENDPOINT, { adminKey: env.ADMIN_API_KEY })` + `write` 有効で createServer。`configureM2M` 呼び出し削除。
- Modify: `packages/mcp-server/cli.ts` — `configureGraphQL(endpoint, token)` を `createHttpDataSource(API_ENDPOINT, { bearer: token })` に置換。execute* 関数は DataSource 経由に。
- Modify: `packages/mcp-server/env.ts` / `.env.sample` — `GRAPHQL_ENDPOINT` → `API_ENDPOINT` + `ADMIN_API_KEY`。wrangler の `Env` 型に `DB: D1Database` 追加、`GRAPHQL_ENDPOINT` 削除。

### Task 3-4-4: 検証と deploy

- [ ] typecheck / lint / knip 全緑
- [ ] `npm run cli -- detail <kita の非 RFC UUID 施設 ID>` — 非 RFC ID 17 施設が引けること（実バグ 9 の回帰確認）
- [ ] `npm run cli -- search --municipality tokyo-koutou --start-date 2026-08-01 --end-date 2026-08-07` — 検索が D1 API 経由で動くこと
- [ ] MCP Inspector で worker（`npm run preview:wrangler`、ローカル D1）に接続し 4 ツール + resource + prompt を実行
- [ ] `npm run deploy -w @shisetsu-viewer/mcp-server` → claude.ai / Claude Code から実クライアント接続で 6 ツール確認（このタイミングで **mcp-server を CF Workers Builds に接続**する — 引き継ぎ済みフォローアップと同時に片付ける）

---

# PR 3-5: Hasura 撤去

ブランチ: `feat/rebuild-hasura-removal`（master ベース）

**前提ゲート（すべて満たしてから着手）:**
1. PR 3-3 / 3-4 が本番で 1 週間問題なし
2. cron スクレイプの dual-write が安定（パリティ突合の乖離ゼロが 1 週間継続）
3. **pg_dump アーカイブ取得済み**（ユーザー作業: shisetsu-database リポジトリ側で `pg_dump` を実行しローカル or R2 に保存。破壊的操作の直前確認ルール適用）

### Task 3-5-1: dual-write 削除と Hasura コード撤去

**Files:**
- Modify: `packages/scraper/tools/updateReservations.ts` / `updateInstitutions.ts` / `exportInstitutions.ts` — backend を d1Api のみに（dual-write フラグ分岐を削除）。exportInstitutions は `GET /v1/institutions?municipality=X&detail=true` から読む形に変更
- Delete: `packages/scraper/tools/backend/hasura.ts` / `tools/backend/parity.ts` / `tools/backend/seed.ts` / `tools/request.ts` / `tools/m2mToken.ts`
- Modify: `packages/scraper/scripts/run.ts` — M2M フォールバックブロック削除（OIDC は Actions 環境が供給、ローカルは ADMIN_API_KEY）
- Delete: `.github/workflows/rotate-m2m-token.yml`
- Modify: `.github/workflows/scraper.yml` / `database.yml` — env から `GRAPHQL_ENDPOINT` / `M2M_TOKEN` を削除
- Modify: `packages/scraper/.env.sample` / `packages/scraper/CLAUDE.md` / ルート `CLAUDE.md` / `packages/mcp-server/CLAUDE.md` — Hasura / M2M / GraphQL 記述を一掃し新アーキテクチャに更新

- [ ] 実装 → typecheck / lint / knip / test:unit 全緑 → PR → マージ
- [ ] マージ後: 定期 cron 1 サイクル（朝・夜）が D1 のみで緑、viewer / mcp の動作確認

### Task 3-5-2: 運用の後片付け（ユーザー確認を挟む破壊的操作）

- [ ] **GitHub secrets 削除**（一覧を提示して確認後に実行）: `M2M_TOKEN` / `GRAPHQL_ENDPOINT` / `AUTH0_*`（rotate workflow が使っていた M2M 系）/ `GH_PAT_SECRETS_RW`。残すもの: `ADMIN_API_KEY`（追加済み）、CF 系は Workers Builds 利用なら不要のはず — 実在 secrets を `gh secret list` で確認してから提案
- [ ] **shisetsu-database の停止・アーカイブ**（別リポ・ユーザー作業）: compose 停止、リポジトリ archive 化。※ compose.yml / config.yaml に平文シークレットがコミット済みのため、公開状態にする場合は履歴ごと精査
- [ ] （任意）90 日より古い行の月次 prune: `packages/api` に Cron Trigger（`triggers.crons: ["23 19 1 * *"]`）+ `scheduled()` ハンドラで `DELETE FROM reservations WHERE date < date('now', '-90 days')`。削除も書き込みカウントされるため月 ~2 万行 = 枠内。実装する場合は vitest-pool-workers でテスト付き

---

# 全体検証（Phase 3 完了条件）

- [ ] cron スクレイプが D1 のみで 1 週間安定稼働（retry 後の structural 失敗ゼロ or 既知の sumida のみ）
- [ ] viewer 全機能（一覧 / 詳細 / 予約検索 / 無限スクロール / ログインゲート）が D1 経由で動作
- [ ] mcp-server の 6 ツールが実クライアント（claude.ai / Claude Code / CLI）で動作、**非 RFC UUID 17 施設が引ける**
- [ ] D1 の日次 rows_written が Free 枠（10 万）の 5 割未満で安定（CF ダッシュボード実測）
- [ ] GitHub secrets が実質 `ADMIN_API_KEY` 不要化まで整理済み（残: なし or ローカル専用）、M2M / GRAPHQL 系が全削除
- [ ] registry ドリフトテスト・全 CI 緑、CLAUDE.md（root / scraper / viewer / mcp-server / api 新設）が実装と一致

# リスクと軽減策（Phase 3 固有）

| リスク | 軽減策 |
|---|---|
| WHERE ガード付き upsert でも無変化行が課金される（D1 の計測仕様） | 公式ドキュメントに ON CONFLICT 固有の注意書きは無く、SQLite 意味論では UPDATE 自体が起きない。とはいえ課金は実測でしか確認できないので、dual-write 開始直後に CF ダッシュボードで確認（Task 3-2-6）。ダメならサーバ側 read-diff に切替 — upsert.ts 内部の差し替えで API 契約は不変 |
| reservation JSON のキー順揺れで差分ガードが空振り（毎回全行更新 → 書き込み枠が即死） | **API が唯一の書き手**という性質を使い、Worker 内で必ず `canonicalizeReservation()` を通してから格納する（scraper が何を送っても壊れない）。「キー順だけ違う再 upsert は無変化」をユニットテストで固定 |
| 全行変化日（サイト全面改番）で日次枠超過 | 書き込み予算ガード（8 万で 202 deferred → 次回 run 持ち越し）。恒久対処は Workers Paid $5 昇格（escape hatch、README 記載） |
| dual-write が想定外の挙動をして本番スクレイプを乱す | `D1_API_ENDPOINT` を **GitHub repository variable** にしてあるので、変数を削除するだけで即座に dual-write を停止できる（コード変更・再デプロイ不要）。scraper 側も D1 書き込み失敗を try/catch で握って Hasura 本流を落とさない |
| Auth0 access token に role クレームが無い | Task 3-1-0 で事前確認。`resolveRole` はカスタム namespace → Hasura namespace の 2 段フォールバック実装 |
| 生成列の CASE 式が IMMV と微妙にズレる（空き検索の結果が変わる） | Task 3-1-3 で境界ケースをユニットテストに固定（単一枠 / 分割枠の片方だけ / DIVISION_N のみ / 空マップ）+ dual-write のパリティ突合で Hasura の searchable_reservations と全行比較 |
| シードとパリティで Hasura 側の stale データ（sumida）を「正」として複製 | 両側とも同じソース（Hasura 現在値）なのでパリティは成立する。sumida の修理は Phase 1 系の別作業（/repair-scraper） |
| mcp-server の D1 直結で per-request 認可漏れ | worker.ts で毎リクエスト `resolveRole` → `allowReservations` を server 構成に反映（ツール未登録）。vitest + MCP Inspector で anonymous 接続時に reservations 系ツールが見えないことを確認 |
| viewer 切り替え後の重大バグ | CF Workers instant rollback（Hasura は 3-5 まで温存 = 旧デプロイが完全動作） |
| vitest-pool-workers と vitest 4 の非互換 | **解消済み**: v0.13.0 以降が vitest ^4.1.0 対応（公式ドキュメント確認済み）。新 `cloudflareTest()` プラグイン API を使う（Task 3-1-2 に反映済み） |

# 運用メモ（実装後の定常運用）

- **祝日の年次更新**: 毎年 12 月頃に翌年の祝日を `PUT /v1/admin/holidays` で追加（内閣府 CSV から生成。手順を `packages/api/CLAUDE.md` に記載する — PR 3-2 実装時に作成）。**`is_holiday` はクエリ時導出なので、祝日を足した瞬間に検索結果へ反映される**（reservations は 1 行も書き換わらない = 書き込み枠を消費しない）。更新を忘れた場合の影響は「平日の祝日が休日として検索に出てこない」だけで、土日は date から判定するため無関係。
- **書き込み予算の監視**: dual-write 期間確立後は月 1 回 CF ダッシュボードを見る程度で良い。202 deferred が Issue 化されるような通知はあえて作らない（次回 run で自然回復するため）。
- **Paid 昇格（escape hatch）**: CF ダッシュボード → Workers & Pages → Plans → Workers Paid（$5/月、D1 込み枠 5,000 万行/月）。ダウングレードも即時。
- **D1 バックアップ**: D1 は Time Travel（30 日 point-in-time restore）が Free で有効。追加のバックアップ運用は不要（過去履歴の長期保存は撤去時の pg_dump アーカイブが担う）。

# spec からの意図的な差分（実装時に spec を更新すること）

1. **テーブル設計を刷新**（2026-07-12 のユーザー判断）:
   - 空き 3 フラグは「書き込み時に TS で導出して列に保存」→ **STORED 生成列**（SQL が単一の真実。差分 WHERE が `reservation` 1 列で済む）
   - `is_holiday` は「書き込み時導出の列」→ **列を持たずクエリ時に導出**（土日は date から、祝日はバインドした配列から）。祝日表の年次更新で 7.3 万行を書き直さずに済む
   - `reservation` の正規化を **Worker（唯一の書き手）が強制**する設計を追加
2. **sentinel バグ修正は PR #1605 で完了済み** → PR 3-3 のスコープから除外。
3. **registry への `divisionGroups` 追加は不採用** → 空き判定のセマンティクスは D1 の生成列 DDL に一元化される。自治体別グループは cutover 後の backlog。
4. **PR 2-1 の deploy.yml は作らない**（確定済み設計判断の踏襲）→ packages/api / mcp-server とも CF Workers Builds で CD。
5. **viewer の「取得日時」** → 行の updated_at は「更新日時」にリラベルし、自治体単位の取得時刻を `/v1/scrape-runs` から表示（spec の併記案を採用）。
6. **dual-write のオン/オフは GitHub repository variable `D1_API_ENDPOINT`**（コード変更なしのキルスイッチ）。
