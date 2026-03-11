import { MUNICIPALITIES } from "@shisetsu-viewer/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function buildMunicipalityTable(): string {
  return Object.values(MUNICIPALITIES)
    .map((m) => `| ${m.key} | ${m.label} | ${m.prefecture} |`)
    .join("\n");
}

const GUIDE_TEXT = `# 施設検索 MCP サーバー ガイド

このサーバーは、東京都区部・川崎市の公共音楽練習施設の検索や予約状況の確認ができます。

## 対応自治体

| キー | 名称 | 都道府県 |
|------|------|----------|
${buildMunicipalityTable()}

## 推奨ワークフロー

1. **施設を探す** → \`list_institutions\` で自治体・楽器利用可否・施設サイズでフィルタ
2. **詳細を見る** → \`get_institution_detail\` で料金・住所・設備を確認
3. **空きを確認** → 特定施設なら \`get_institution_reservations\`、横断検索なら \`search_reservations\`

## パラメータ値リファレンス

### 楽器利用可否フィルタ
\`isAvailableStrings\`, \`isAvailableWoodwind\`, \`isAvailableBrass\`, \`isAvailablePercussion\` には \`true\`（利用可）または \`false\`（利用不可）を指定できます。

### 施設サイズ
- \`INSTITUTION_SIZE_LARGE\` — 100人以上
- \`INSTITUTION_SIZE_MEDIUM\` — 50〜99人
- \`INSTITUTION_SIZE_SMALL\` — 50人未満

### 日付形式
すべて \`YYYY-MM-DD\` 形式（例: 2026-03-15）

### ページネーション
レスポンスの \`pageInfo.hasNextPage\` が \`true\` の場合、\`pageInfo.endCursor\` を次回リクエストの \`after\` に渡すと次ページを取得できます。

## 予約ステータスについて
\`reservation\` フィールドは \`{ 時間区分キー: ステータスキー }\` のマッピングです。ステータスの意味は自治体ごとに異なります（例: 江東区では STATUS_1 = "予約あり"、文京区では STATUS_1 = "一部空き"）。`;

export function registerGuidePrompt(server: McpServer): void {
  server.registerPrompt(
    "guide",
    {
      title: "施設検索ガイド",
      description:
        "このMCPサーバーの使い方ガイド。対応自治体・ワークフロー・パラメータ値を確認できます。",
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: GUIDE_TEXT },
        },
      ],
    })
  );
}
