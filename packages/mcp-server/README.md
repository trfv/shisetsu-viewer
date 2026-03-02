# @shisetsu-viewer/mcp-server

公共施設予約データを AI アシスタントから利用するための [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) サーバー。Hasura GraphQL をバックエンドとし、施設検索・予約状況照会などのツールを提供します。

## セットアップ

### 環境変数

`.env` ファイルをパッケージルートに作成し、以下を設定:

```env
GRAPHQL_ENDPOINT=https://your-hasura-instance.hasura.app/v1/graphql
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-m2m-client-id
AUTH0_CLIENT_SECRET=your-m2m-client-secret
AUTH0_AUDIENCE=https://your-api-audience
```

### 起動

```bash
# ローカル stdio モード（開発/デバッグ用、書き込みツール有効）
npm run start -w @shisetsu-viewer/mcp-server

# Cloudflare Workers ローカルプレビュー（読み取り専用）
npm run preview:wrangler -w @shisetsu-viewer/mcp-server

# Cloudflare Workers デプロイ（読み取り専用）
npm run deploy -w @shisetsu-viewer/mcp-server
```

### Claude Desktop から接続（stdio モード）

`claude_desktop_config.json` に以下を追加:

```json
{
  "mcpServers": {
    "shisetsu-viewer": {
      "command": "node",
      "args": ["--env-file=.env", "index.ts"],
      "cwd": "/path/to/shisetsu-viewer/packages/mcp-server"
    }
  }
}
```

## 動作モード

| モード | エントリーポイント | authMode | 書き込みツール | 用途 |
|--------|-------------------|----------|--------------|------|
| stdio | `index.ts` | `admin` | 有効 | ローカル開発・デバッグ |
| Workers | `worker.ts` | `auth0` | 無効 | 本番デプロイ（読み取り専用） |

- **stdio モード**: `node --env-file=.env index.ts` で起動。全ツール利用可能。
- **Workers モード**: Cloudflare Workers 上で HTTP エンドポイント (`/mcp`) を提供。クライアントは `Authorization: Bearer <api_token>` ヘッダーで認証。

## ツール

### 読み取りツール

全ての読み取りツールはオプションの `fields` パラメータをサポートします。指定すると必要なフィールドのみ GraphQL から取得します（省略時は全フィールド）。

#### `list_institutions` — 施設一覧取得

施設をフィルタ・ページネーション付きで一覧取得します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `municipality` | `string[]` | | 自治体キーでフィルタ (例: `["MUNICIPALITY_KOUTOU"]`) |
| `institutionSizes` | `string[]` | | 施設サイズでフィルタ |
| `isAvailableStrings` | `string` | | 弦楽器利用可否 |
| `isAvailableWoodwind` | `string` | | 木管楽器利用可否 |
| `isAvailableBrass` | `string` | | 金管楽器利用可否 |
| `isAvailablePercussion` | `string` | | 打楽器利用可否 |
| `fields` | `string[]` | | 返却フィールドを選択 |
| `first` | `number` | | 取得件数 (1-100、デフォルト20) |
| `after` | `string` | | ページネーションカーソル |

**取得可能フィールド:** `id`, `municipality`, `building`, `institution`, `institution_size`, `is_available_strings`, `is_available_woodwind`, `is_available_brass`, `is_available_percussion`, `is_equipped_music_stand`, `is_equipped_piano`, `updated_at`

#### `get_institution_detail` — 施設詳細取得

UUID 指定で施設の詳細情報を取得します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `id` | `string (UUID)` | Yes | 施設の UUID |
| `fields` | `string[]` | | 返却フィールドを選択 |

**取得可能フィールド:** `id`, `prefecture`, `municipality`, `building`, `institution`, `capacity`, `area`, `fee_divisions`, `weekday_usage_fee`, `holiday_usage_fee`, `address`, `is_available_strings`, `is_available_woodwind`, `is_available_brass`, `is_available_percussion`, `is_equipped_music_stand`, `is_equipped_piano`, `website_url`, `layout_image_url`, `lottery_period`, `note`

#### `get_institution_reservations` — 施設予約状況取得

特定施設の日付範囲内の予約状況を取得します（上限 1000 件）。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `institutionId` | `string (UUID)` | Yes | 施設の UUID |
| `startDate` | `string` | Yes | 開始日 (`YYYY-MM-DD`) |
| `endDate` | `string` | Yes | 終了日 (`YYYY-MM-DD`) |
| `fields` | `string[]` | | 返却フィールドを選択 |

**取得可能フィールド:** `id`, `date`, `reservation`, `updated_at`

#### `search_reservations` — 予約横断検索

複数施設を横断して空き状況を検索します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `municipality` | `string[]` | | 自治体フィルタ |
| `startDate` | `string` | Yes | 開始日 (`YYYY-MM-DD`) |
| `endDate` | `string` | Yes | 終了日 (`YYYY-MM-DD`) |
| `isHoliday` | `boolean` | | 祝日のみ |
| `isMorningVacant` | `boolean` | | 午前空き |
| `isAfternoonVacant` | `boolean` | | 午後空き |
| `isEveningVacant` | `boolean` | | 夜間空き |
| `isAvailableStrings` | `string` | | 弦楽器利用可否 |
| `isAvailableWoodwind` | `string` | | 木管楽器利用可否 |
| `isAvailableBrass` | `string` | | 金管楽器利用可否 |
| `isAvailablePercussion` | `string` | | 打楽器利用可否 |
| `institutionSizes` | `string[]` | | 施設サイズ |
| `fields` | `object` | | `{ reservation?: string[], institution?: string[] }` |
| `first` | `number` | | 取得件数 (1-100、デフォルト20) |
| `after` | `string` | | ページネーションカーソル |

**取得可能フィールド:**
- `fields.reservation`: `id`, `date`, `reservation`, `updated_at`
- `fields.institution`: `id`, `municipality`, `building`, `institution`, `institution_size`

### 書き込みツール（admin モードのみ）

#### `upsert_reservations` — 予約データ一括 upsert

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `data` | `object[]` | Yes | 予約データ配列 (`institution_id`, `date`, `reservation`) |

2000 件ずつチャンク処理されます。

#### `upsert_institutions` — 施設データ一括 upsert

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `data` | `object[]` | Yes | 施設データ配列 |
| `updateColumns` | `string[]` | | 競合時に更新するカラム名（省略時は全カラム） |

## リソース

#### `municipalities` — 自治体レジストリ

URI: `shisetsu://municipalities`

対応自治体の一覧（自治体キー、ラベル、予約ステータス/区分ラベル）を JSON で返します。`@shisetsu-viewer/shared` の `MUNICIPALITIES` データがソースです。

## 利用フロー例

```
1. municipalities リソースで自治体キーを確認
2. list_institutions で条件に合う施設を検索
3. get_institution_detail で施設の詳細（料金・設備）を確認
4. get_institution_reservations で特定施設の空き状況を確認
5. search_reservations で複数施設から空いている日時を一括検索
```

## 認証

```
┌─────────┐    API Token     ┌──────────────┐   Auth0 M2M Token   ┌────────┐
│  Client  │ ──────────────→ │  MCP Server  │ ──────────────────→ │ Hasura │
└─────────┘   (Workers のみ)  └──────────────┘    (全モード共通)     └────────┘
```

- **Hasura 認証**: Auth0 M2M (Machine-to-Machine) Bearer トークン。全モードで共通。
- **クライアント認証** (Workers のみ): `api_tokens` テーブルで SHA-256 ハッシュ検証。有効期限チェックあり。

## 開発

```bash
npm run typecheck -w @shisetsu-viewer/mcp-server  # 型チェック (tsgo)
npm run start -w @shisetsu-viewer/mcp-server       # ローカル stdio サーバー起動
```

### アーキテクチャ

```
index.ts          ← stdio エントリーポイント (admin)
worker.ts         ← Cloudflare Workers エントリーポイント (auth0)
server.ts         ← McpServer 作成、ツール/リソース登録
auth.ts           ← API トークン検証 (SHA-256)
m2mToken.ts       ← Auth0 M2M トークン取得・キャッシュ
graphqlClient.ts  ← Hasura GraphQL クライアント
env.ts            ← 環境変数スキーマ・バリデーション
fieldDefinitions.ts    ← GraphQL フィールド許可リスト定義
buildFieldSelection.ts ← フィールド選択 → クエリ文字列構築
tools/
  listInstitutions.ts
  getInstitutionDetail.ts
  getInstitutionReservations.ts
  searchReservations.ts
  upsertReservations.ts
  upsertInstitutions.ts
resources/
  municipalities.ts
```
