import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";

const QUERY = `
query reservations(
  $first: Int
  $after: String
  $prefecture: prefecture = null
  $municipality: [String!]
  $isAvailableStrings: availavility_division = null
  $isAvailableWoodwind: availavility_division = null
  $isAvailableBrass: availavility_division = null
  $isAvailablePercussion: availavility_division = null
  $institutionSizes: [String!] = null
  $startDate: date
  $endDate: date
  $isHoliday: Boolean
  $isMorningVacant: Boolean
  $isAfternoonVacant: Boolean
  $isEveningVacant: Boolean
) {
  searchable_reservations_connection(
    first: $first
    after: $after
    where: {
      _and: {
        institution: {
          prefecture: { _eq: $prefecture }
          municipality: { _in: $municipality }
          is_available_strings: { _eq: $isAvailableStrings }
          is_available_woodwind: { _eq: $isAvailableWoodwind }
          is_available_brass: { _eq: $isAvailableBrass }
          is_available_percussion: { _eq: $isAvailablePercussion }
          institution_size: { _in: $institutionSizes }
        }
        date: { _gte: $startDate, _lte: $endDate }
        is_morning_vacant: { _eq: $isMorningVacant }
        is_afternoon_vacant: { _eq: $isAfternoonVacant }
        is_evening_vacant: { _eq: $isEveningVacant }
        is_holiday: { _eq: $isHoliday }
      }
    }
    order_by: { date: asc }
  ) {
    edges {
      node {
        id
        reservation {
          id
          date
          reservation
          updated_at
        }
        institution {
          id
          municipality
          building
          institution
          institution_size
        }
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
  searchable_reservations_connection: {
    edges: Array<{ node: Record<string, unknown>; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
}

export function registerSearchReservations(server: McpServer): void {
  server.registerTool(
    "search_reservations",
    {
      description: "予約を横断検索（施設フィルタ・時間帯空き・日付範囲・ページネーション対応）",
      inputSchema: {
        municipality: z
          .array(z.string())
          .optional()
          .describe("自治体キーでフィルタ (例: ['MUNICIPALITY_KOUTOU'])"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("開始日 (YYYY-MM-DD)"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("終了日 (YYYY-MM-DD)"),
        isHoliday: z.boolean().optional().describe("祝日のみフィルタ"),
        isMorningVacant: z.boolean().optional().describe("午前空きでフィルタ"),
        isAfternoonVacant: z.boolean().optional().describe("午後空きでフィルタ"),
        isEveningVacant: z.boolean().optional().describe("夜間空きでフィルタ"),
        isAvailableStrings: z.string().optional().describe("弦楽器利用可否でフィルタ"),
        isAvailableWoodwind: z.string().optional().describe("木管楽器利用可否でフィルタ"),
        isAvailableBrass: z.string().optional().describe("金管楽器利用可否でフィルタ"),
        isAvailablePercussion: z.string().optional().describe("打楽器利用可否でフィルタ"),
        institutionSizes: z.array(z.string()).optional().describe("施設サイズでフィルタ"),
        first: z.number().int().min(1).max(100).default(20).describe("取得件数 (最大100)"),
        after: z.string().optional().describe("ページネーション用カーソル"),
      },
    },
    async (args) => {
      const data = await graphqlRequest<QueryData>(QUERY, {
        first: args.first,
        after: args.after,
        municipality: args.municipality,
        startDate: args.startDate,
        endDate: args.endDate,
        isHoliday: args.isHoliday,
        isMorningVacant: args.isMorningVacant,
        isAfternoonVacant: args.isAfternoonVacant,
        isEveningVacant: args.isEveningVacant,
        isAvailableStrings: args.isAvailableStrings,
        isAvailableWoodwind: args.isAvailableWoodwind,
        isAvailableBrass: args.isAvailableBrass,
        isAvailablePercussion: args.isAvailablePercussion,
        institutionSizes: args.institutionSizes,
      });

      const conn = data.searchable_reservations_connection;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                reservations: conn.edges.map((e) => e.node),
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
