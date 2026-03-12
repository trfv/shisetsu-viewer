import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";
import { INSTITUTION_DETAIL_FIELDS } from "../fieldDefinitions.ts";
import { buildFieldSelection } from "../buildFieldSelection.ts";

function buildQuery(fieldSelection: string): string {
  return `
query institutionDetail($id: uuid!) {
  institutions_connection(where: { id: { _eq: $id } }, first: 1) {
    edges {
      node {
        ${fieldSelection}
      }
    }
  }
}`;
}

interface QueryData {
  institutions_connection: {
    edges: Array<{ node: Record<string, unknown> }>;
  };
}

export async function executeGetInstitutionDetail(args: {
  id: string;
  fields?: readonly string[] | undefined;
}): Promise<Record<string, unknown> | null> {
  const query = buildQuery(buildFieldSelection(INSTITUTION_DETAIL_FIELDS, args.fields));
  const data = await graphqlRequest<QueryData>(query, { id: args.id });
  return data.institutions_connection.edges[0]?.node ?? null;
}

export function registerGetInstitutionDetail(server: McpServer): void {
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
        id: z.string().uuid().describe("施設のUUID"),
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
      const node = await executeGetInstitutionDetail(args);

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
