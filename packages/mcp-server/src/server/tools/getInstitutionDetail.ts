import type { McpServer } from "@modelcontextprotocol/server";

import type { DataSource } from "../../data/dataSource.ts";
import {
  executeGetInstitutionDetail,
  getInstitutionDetailInput,
  getInstitutionDetailOutput,
} from "../../queries/getInstitutionDetail.ts";
import { READ_ONLY, structuredResult } from "./result.ts";

export function registerGetInstitutionDetail(server: McpServer, dataSource: DataSource): void {
  server.registerTool(
    "get_institution_detail",
    {
      description: `施設の詳細情報を取得します（料金、設備、住所、レイアウト画像URLなど）。

【使い方】list_institutions で取得した施設IDを指定してください。料金は weekday_usage_fee / holiday_usage_fee に区分ごとの金額が入っています。
【レスポンス】施設の全詳細フィールド（capacity, area, fee, address, website_url 等）`,
      annotations: { title: "施設詳細取得", ...READ_ONLY },
      inputSchema: getInstitutionDetailInput,
      outputSchema: getInstitutionDetailOutput,
    },
    async (args) => {
      const node = await executeGetInstitutionDetail(args, dataSource);
      if (!node) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "施設が見つかりません" }) },
          ],
          isError: true,
        };
      }
      return structuredResult(node);
    }
  );
}
