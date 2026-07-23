import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { DataSource } from "../dataSource.ts";
import { INSTITUTION_DETAIL_FIELDS } from "../fieldDefinitions.ts";
import { institutionIdSchema } from "../paramHelpers.ts";
import { pick } from "../pick.ts";

export async function executeGetInstitutionDetail(
  args: {
    id: string;
    fields?: readonly string[] | undefined;
  },
  dataSource: DataSource
): Promise<Record<string, unknown> | null> {
  const detail = await dataSource.getInstitutionDetail(args.id);
  if (!detail) return null;
  return pick(detail, INSTITUTION_DETAIL_FIELDS, args.fields);
}

export function registerGetInstitutionDetail(server: McpServer, dataSource: DataSource): void {
  server.registerTool(
    "get_institution_detail",
    {
      description: `施設の詳細情報を取得します（料金、設備、住所、レイアウト画像URLなど）。

【使い方】list_institutions で取得した施設IDを指定してください。料金は weekday_usage_fee / holiday_usage_fee に区分ごとの金額が入っています。
【レスポンス】施設の全詳細フィールド（capacity, area, fee, address, website_url 等）`,
      annotations: {
        title: "施設詳細取得",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        id: institutionIdSchema.describe("施設のUUID"),
        fields: z
          .array(z.enum(INSTITUTION_DETAIL_FIELDS))
          .optional()
          .describe(
            "返却フィールドを指定しトークンを節約 (省略時は全フィールド)。選択可能: " +
              INSTITUTION_DETAIL_FIELDS.join(", ")
          ),
      },
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

      return {
        content: [{ type: "text" as const, text: JSON.stringify(node, null, 2) }],
      };
    }
  );
}
