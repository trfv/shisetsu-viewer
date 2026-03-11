# Shisetsu Viewer MCP Server

音楽練習で利用可能な施設の検索や予約状況の確認を、Claude などの AI アシスタントから行える [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) サーバーです。

## こんなことができます

AI アシスタントに自然言語で話しかけるだけで、以下のことができます。

- **施設を探す** — 「江東区で弦楽器が使える施設を教えて」
- **施設の詳細を見る** — 「この施設の料金と設備を教えて」
- **予約状況を確認する** — 「この施設の3月の空き状況は？」
- **空きを横断検索する** — 「来週の土日、夜間に空いている大ホールはある？」

### 対応エリア

江東区 / 文京区 / 北区 / 豊島区 / 江戸川区 / 荒川区 / 墨田区 / 大田区 / 杉並区 / 中央区 / 川崎市

## 接続方法

### 方法 1: リモート接続（推奨）

Cloudflare Workers にデプロイ済みのサーバーに接続します。初回接続時にブラウザが開き、ログイン認証が求められます。

#### Claude.ai で使う

Claude.ai の Settings → Integrations → Add custom MCP server で以下の URL を入力します。

```
https://mcp.shisetsudb.com/mcp
```

#### Claude Desktop で使う

`claude_desktop_config.json` に以下を追加します。

```json
{
  "mcpServers": {
    "shisetsu-viewer": {
      "type": "url",
      "url": "https://mcp.shisetsudb.com/mcp"
    }
  }
}
```

#### Claude Code で使う

```bash
claude mcp add shisetsu-viewer \
  --transport http \
  "https://mcp.shisetsudb.com/mcp"
```

### 方法 2: ローカル接続（開発者向け）

リポジトリをクローンしてローカルで起動します。

#### 前提条件

- Node.js >= 24
- このリポジトリのクローン
- `packages/mcp-server/.env` の設定（管理者に確認してください）

#### Claude Desktop で使う

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

> `/path/to/` は実際のパスに置き換えてください。

#### Claude Code で使う

```bash
claude mcp add shisetsu-viewer \
  --transport stdio \
  -- node --env-file=.env index.ts \
  --cwd /path/to/shisetsu-viewer/packages/mcp-server
```

## 使い方

接続が完了したら、AI アシスタントに自然言語で質問するだけです。以下に具体的な使い方の例を示します。

### 施設を探す

> 「江東区の施設を一覧で見せて」
>
> 「川崎市で打楽器が使えて、100人以上入れるホールはある？」
>
> 「文京区と豊島区の音楽室を比較したい」

### 施設の詳細を確認する

> 「この施設の住所と料金を教えて」
>
> 「砂町文化センター 第1音楽室の設備情報を見たい」

### 予約状況を確認する

> 「この施設の来月の空き状況を教えて」
>
> 「2026年4月1日〜4月7日の予約状況は？」

### 空いている施設を横断検索する

> 「来週末の夜間に空いている施設を江東区で探して」
>
> 「3月中の土日祝で午後に空いている大ホールはある？」
>
> 「弦楽器OKで今週空いている施設を全エリアから探して」

## ツールリファレンス

AI アシスタントが内部で使用するツールの詳細です。通常は自然言語で話しかければ AI が適切なツールを選択しますが、より正確な指定をしたい場合に参照してください。

### `list_institutions` — 施設一覧取得

施設をフィルタ・ページネーション付きで一覧取得します。

| パラメータ              | 型         | 必須 | 説明                                         |
| ----------------------- | ---------- | :--: | -------------------------------------------- |
| `municipality`          | `string[]` |      | 自治体キーでフィルタ                         |
| `institutionSizes`      | `string[]` |      | 施設サイズでフィルタ                         |
| `isAvailableStrings`    | `string`   |      | 弦楽器利用可否                               |
| `isAvailableWoodwind`   | `string`   |      | 木管楽器利用可否                             |
| `isAvailableBrass`      | `string`   |      | 金管楽器利用可否                             |
| `isAvailablePercussion` | `string`   |      | 打楽器利用可否                               |
| `fields`                | `string[]` |      | 返却フィールドを選択（省略時は全フィールド） |
| `first`                 | `number`   |      | 取得件数 (1-100、デフォルト20)               |
| `after`                 | `string`   |      | ページネーションカーソル                     |

### `get_institution_detail` — 施設詳細取得

UUID 指定で施設の詳細情報（料金、設備、住所など）を取得します。

| パラメータ | 型              | 必須 | 説明                                         |
| ---------- | --------------- | :--: | -------------------------------------------- |
| `id`       | `string (UUID)` | Yes  | 施設の UUID                                  |
| `fields`   | `string[]`      |      | 返却フィールドを選択（省略時は全フィールド） |

### `get_institution_reservations` — 施設予約状況取得

特定施設の日付範囲内の予約状況を取得します（上限 1000 件）。

| パラメータ      | 型              | 必須 | 説明                                         |
| --------------- | --------------- | :--: | -------------------------------------------- |
| `institutionId` | `string (UUID)` | Yes  | 施設の UUID                                  |
| `startDate`     | `string`        | Yes  | 開始日 (`YYYY-MM-DD`)                        |
| `endDate`       | `string`        | Yes  | 終了日 (`YYYY-MM-DD`)                        |
| `fields`        | `string[]`      |      | 返却フィールドを選択（省略時は全フィールド） |

### `search_reservations` — 予約横断検索

複数施設を横断して空き状況を検索します。日付範囲と時間帯（午前/午後/夜間）の空き条件を指定できます。

| パラメータ              | 型         | 必須 | 説明                                                 |
| ----------------------- | ---------- | :--: | ---------------------------------------------------- |
| `municipality`          | `string[]` |      | 自治体フィルタ                                       |
| `startDate`             | `string`   | Yes  | 開始日 (`YYYY-MM-DD`)                                |
| `endDate`               | `string`   | Yes  | 終了日 (`YYYY-MM-DD`)                                |
| `isHoliday`             | `boolean`  |      | 祝日のみ                                             |
| `isMorningVacant`       | `boolean`  |      | 午前空き                                             |
| `isAfternoonVacant`     | `boolean`  |      | 午後空き                                             |
| `isEveningVacant`       | `boolean`  |      | 夜間空き                                             |
| `isAvailableStrings`    | `string`   |      | 弦楽器利用可否                                       |
| `isAvailableWoodwind`   | `string`   |      | 木管楽器利用可否                                     |
| `isAvailableBrass`      | `string`   |      | 金管楽器利用可否                                     |
| `isAvailablePercussion` | `string`   |      | 打楽器利用可否                                       |
| `institutionSizes`      | `string[]` |      | 施設サイズ                                           |
| `fields`                | `object`   |      | `{ reservation?: string[], institution?: string[] }` |
| `first`                 | `number`   |      | 取得件数 (1-100、デフォルト20)                       |
| `after`                 | `string`   |      | ページネーションカーソル                             |

### `municipalities` リソース — 対応自治体一覧

自治体キーと名称の対応表を取得します。各自治体の予約ステータスや区分のラベル情報も含まれます。

## 開発者向け情報

開発・デプロイに関する情報は [CLAUDE.md](./CLAUDE.md) を参照してください。
