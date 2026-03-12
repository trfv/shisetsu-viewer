import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";
import { SEARCH_RESERVATION_FIELDS, SEARCH_INSTITUTION_FIELDS } from "../fieldDefinitions.ts";
import { buildFieldSelection } from "../buildFieldSelection.ts";
import { resolveAvailability, MUNICIPALITY_HELP, INSTITUTION_SIZE_HELP } from "../paramHelpers.ts";

function buildQuery(reservationFields: string, institutionFields: string): string {
  return `
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
          ${reservationFields}
        }
        institution {
          ${institutionFields}
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
}

interface QueryData {
  searchable_reservations_connection: {
    edges: Array<{ node: Record<string, unknown>; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
}

export async function executeSearchReservations(args: {
  municipality?: string[] | undefined;
  startDate: string;
  endDate: string;
  isHoliday?: boolean | undefined;
  isMorningVacant?: boolean | undefined;
  isAfternoonVacant?: boolean | undefined;
  isEveningVacant?: boolean | undefined;
  isAvailableStrings?: boolean | string | undefined;
  isAvailableWoodwind?: boolean | string | undefined;
  isAvailableBrass?: boolean | string | undefined;
  isAvailablePercussion?: boolean | string | undefined;
  institutionSizes?: string[] | undefined;
  fields?:
    | {
        reservation?: readonly string[] | undefined;
        institution?: readonly string[] | undefined;
      }
    | undefined;
  first?: number | undefined;
  after?: string | undefined;
}) {
  const reservationFields = buildFieldSelection(
    SEARCH_RESERVATION_FIELDS,
    args.fields?.reservation
  );
  const institutionFields = buildFieldSelection(
    SEARCH_INSTITUTION_FIELDS,
    args.fields?.institution
  );
  const query = buildQuery(reservationFields, institutionFields);
  const data = await graphqlRequest<QueryData>(query, {
    first: args.first ?? 20,
    after: args.after,
    municipality: args.municipality,
    startDate: args.startDate,
    endDate: args.endDate,
    isHoliday: args.isHoliday,
    isMorningVacant: args.isMorningVacant,
    isAfternoonVacant: args.isAfternoonVacant,
    isEveningVacant: args.isEveningVacant,
    isAvailableStrings: resolveAvailability(args.isAvailableStrings),
    isAvailableWoodwind: resolveAvailability(args.isAvailableWoodwind),
    isAvailableBrass: resolveAvailability(args.isAvailableBrass),
    isAvailablePercussion: resolveAvailability(args.isAvailablePercussion),
    institutionSizes: args.institutionSizes,
  });

  const conn = data.searchable_reservations_connection;
  return {
    reservations: conn.edges.map((e) => e.node),
    pageInfo: conn.pageInfo,
    count: conn.edges.length,
  };
}

export function registerSearchReservations(server: McpServer): void {
  server.registerTool(
    "search_reservations",
    {
      description: `複数施設を横断して空き状況を検索します。特定の日付範囲・時間帯で空いている施設を見つけるのに最適です。

【使い方】startDate/endDate(YYYY-MM-DD)は必須。時間帯フィルタ: isMorningVacant(午前), isAfternoonVacant(午後), isEveningVacant(夜間)にtrueを指定。楽器フィルタ: isAvailableStrings等にtrueを指定で利用可のみ。
【レスポンス】reservations: 配列(各エントリに reservation + institution サブオブジェクト), pageInfo: { hasNextPage, endCursor }, count`,
      annotations: {
        title: "予約横断検索",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        municipality: z
          .array(z.string())
          .optional()
          .describe(`自治体キーでフィルタ。指定可能な値: ${MUNICIPALITY_HELP}`),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("開始日 (YYYY-MM-DD)"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("終了日 (YYYY-MM-DD)"),
        isHoliday: z.boolean().optional().describe("trueで祝日のみに絞り込み"),
        isMorningVacant: z.boolean().optional().describe("trueで午前空きのみ"),
        isAfternoonVacant: z.boolean().optional().describe("trueで午後空きのみ"),
        isEveningVacant: z.boolean().optional().describe("trueで夜間空きのみ"),
        isAvailableStrings: z
          .union([z.boolean(), z.string()])
          .optional()
          .describe("弦楽器利用可否 (true = 利用可)"),
        isAvailableWoodwind: z
          .union([z.boolean(), z.string()])
          .optional()
          .describe("木管楽器利用可否 (true = 利用可)"),
        isAvailableBrass: z
          .union([z.boolean(), z.string()])
          .optional()
          .describe("金管楽器利用可否 (true = 利用可)"),
        isAvailablePercussion: z
          .union([z.boolean(), z.string()])
          .optional()
          .describe("打楽器利用可否 (true = 利用可)"),
        institutionSizes: z
          .array(z.string())
          .optional()
          .describe(`施設サイズでフィルタ。指定可能な値: ${INSTITUTION_SIZE_HELP}`),
        fields: z
          .object({
            reservation: z
              .array(z.enum(SEARCH_RESERVATION_FIELDS))
              .optional()
              .describe(
                "予約サブクエリのフィールド。選択可能: " + SEARCH_RESERVATION_FIELDS.join(", ")
              ),
            institution: z
              .array(z.enum(SEARCH_INSTITUTION_FIELDS))
              .optional()
              .describe(
                "施設サブクエリのフィールド。選択可能: " + SEARCH_INSTITUTION_FIELDS.join(", ")
              ),
          })
          .optional()
          .describe("返却フィールドを指定しトークンを節約 (省略時は全フィールド)"),
        first: z.number().int().min(1).max(100).default(20).describe("取得件数 (最大100)"),
        after: z.string().optional().describe("ページネーション用カーソル"),
      },
    },
    async (args) => {
      const result = await executeSearchReservations(args);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
