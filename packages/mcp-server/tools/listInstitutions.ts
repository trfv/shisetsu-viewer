import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";
import { INSTITUTION_LIST_FIELDS } from "../fieldDefinitions.ts";
import { buildFieldSelection } from "../buildFieldSelection.ts";

function buildQuery(fieldSelection: string): string {
  return `
query institutions(
  $first: Int
  $after: String
  $municipality: [String!]
  $isAvailableStrings: availavility_division = null
  $isAvailableWoodwind: availavility_division = null
  $isAvailableBrass: availavility_division = null
  $isAvailablePercussion: availavility_division = null
  $institutionSizes: [String!] = null
) {
  institutions_connection(
    first: $first
    after: $after
    where: {
      municipality: { _in: $municipality }
      is_available_strings: { _eq: $isAvailableStrings }
      is_available_woodwind: { _eq: $isAvailableWoodwind }
      is_available_brass: { _eq: $isAvailableBrass }
      is_available_percussion: { _eq: $isAvailablePercussion }
      institution_size: { _in: $institutionSizes }
    }
    order_by: { municipality: asc, building_kana: asc, institution_kana: asc }
  ) {
    edges {
      node {
        ${fieldSelection}
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;
}

interface QueryData {
  institutions_connection: {
    edges: Array<{ node: Record<string, unknown>; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
}

export function registerListInstitutions(server: McpServer): void {
  server.registerTool(
    "list_institutions",
    {
      description: "施設一覧を取得（フィルタ・ページネーション対応）",
      inputSchema: {
        municipality: z
          .array(z.string())
          .optional()
          .describe("自治体キーでフィルタ (例: ['MUNICIPALITY_KOUTOU'])"),
        institutionSizes: z
          .array(z.string())
          .optional()
          .describe("施設サイズでフィルタ (例: ['INSTITUTION_SIZE_LARGE'])"),
        isAvailableStrings: z
          .string()
          .optional()
          .describe("弦楽器利用可否でフィルタ ('AVAILABILITY_DIVISION_AVAILABLE')"),
        isAvailableWoodwind: z.string().optional().describe("木管楽器利用可否でフィルタ"),
        isAvailableBrass: z.string().optional().describe("金管楽器利用可否でフィルタ"),
        isAvailablePercussion: z.string().optional().describe("打楽器利用可否でフィルタ"),
        fields: z
          .array(z.enum(INSTITUTION_LIST_FIELDS))
          .optional()
          .describe(
            "返却フィールドを指定 (省略時は全フィールド)。選択可能: " +
              INSTITUTION_LIST_FIELDS.join(", ")
          ),
        first: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("取得件数 (最大100、デフォルト20)"),
        after: z
          .string()
          .optional()
          .describe("ページネーション用カーソル (前回レスポンスの endCursor)"),
      },
    },
    async (args) => {
      const query = buildQuery(buildFieldSelection(INSTITUTION_LIST_FIELDS, args.fields));
      const data = await graphqlRequest<QueryData>(query, {
        first: args.first,
        after: args.after,
        municipality: args.municipality,
        isAvailableStrings: args.isAvailableStrings,
        isAvailableWoodwind: args.isAvailableWoodwind,
        isAvailableBrass: args.isAvailableBrass,
        isAvailablePercussion: args.isAvailablePercussion,
        institutionSizes: args.institutionSizes,
      });

      const conn = data.institutions_connection;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                institutions: conn.edges.map((e) => e.node),
                pageInfo: conn.pageInfo,
                count: conn.edges.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
