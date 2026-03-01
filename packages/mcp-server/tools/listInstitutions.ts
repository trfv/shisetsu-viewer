import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";

const QUERY = `
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
        id
        municipality
        building
        institution
        institution_size
        is_available_strings
        is_available_woodwind
        is_available_brass
        is_available_percussion
        is_equipped_music_stand
        is_equipped_piano
        updated_at
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

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
      const data = await graphqlRequest<QueryData>(QUERY, {
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
