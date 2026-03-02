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

export function registerGetInstitutionDetail(server: McpServer): void {
  server.registerTool(
    "get_institution_detail",
    {
      description: "施設の詳細情報を取得（ID指定）",
      inputSchema: {
        id: z.string().uuid().describe("施設のUUID"),
        fields: z
          .array(z.enum(INSTITUTION_DETAIL_FIELDS))
          .optional()
          .describe(
            "返却フィールドを指定 (省略時は全フィールド)。選択可能: " +
              INSTITUTION_DETAIL_FIELDS.join(", ")
          ),
      },
    },
    async (args) => {
      const query = buildQuery(buildFieldSelection(INSTITUTION_DETAIL_FIELDS, args.fields));
      const data = await graphqlRequest<QueryData>(query, { id: args.id });
      const node = data.institutions_connection.edges[0]?.node;

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
