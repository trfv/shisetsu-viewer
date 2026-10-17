import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DataSource } from "../../data/dataSource.ts";
import { executeListInstitutions, listInstitutionsInput } from "../../queries/listInstitutions.ts";
import { jsonResult, READ_ONLY } from "./result.ts";

export function registerListInstitutions(server: McpServer, dataSource: DataSource): void {
  server.registerTool(
    "list_institutions",
    {
      description: `施設一覧を取得します。自治体・施設サイズ・楽器利用可否でフィルタできます。

【使い方】まずこのツールで施設を探し、IDを取得 → get_institution_detail で詳細 or get_institution_reservations / search_reservations で空き確認
【レスポンス】institutions: 施設配列(id, municipality, building, institution 等), pageInfo: { hasNextPage, endCursor }, count`,
      annotations: { title: "施設一覧取得", ...READ_ONLY },
      inputSchema: listInstitutionsInput,
    },
    async (args) => jsonResult(await executeListInstitutions(args, dataSource))
  );
}
