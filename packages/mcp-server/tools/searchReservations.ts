import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PageInfo } from "@shisetsu-viewer/shared";
import { z } from "zod";

import type { DataSource } from "../dataSource.ts";
import { SEARCH_INSTITUTION_FIELDS, SEARCH_RESERVATION_FIELDS } from "../fieldDefinitions.ts";
import { INSTITUTION_SIZE_HELP, MUNICIPALITY_HELP, toAvailabilityFilter } from "../paramHelpers.ts";
import { pick } from "../pick.ts";

export async function executeSearchReservations(
  args: {
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
  },
  dataSource: DataSource
): Promise<{ reservations: Record<string, unknown>[]; pageInfo: PageInfo; count: number }> {
  const page = await dataSource.searchReservations({
    startDate: args.startDate,
    endDate: args.endDate,
    municipality: args.municipality,
    institutionSizes: args.institutionSizes,
    isHoliday: args.isHoliday === true ? true : undefined,
    isMorningVacant: args.isMorningVacant === true ? true : undefined,
    isAfternoonVacant: args.isAfternoonVacant === true ? true : undefined,
    isEveningVacant: args.isEveningVacant === true ? true : undefined,
    isAvailableStrings: toAvailabilityFilter(args.isAvailableStrings),
    isAvailableWoodwind: toAvailabilityFilter(args.isAvailableWoodwind),
    isAvailableBrass: toAvailabilityFilter(args.isAvailableBrass),
    isAvailablePercussion: toAvailabilityFilter(args.isAvailablePercussion),
    limit: args.first,
    cursor: args.after,
  });
  const reservations = page.items.map((hit) => ({
    reservation: pick(hit.reservation, SEARCH_RESERVATION_FIELDS, args.fields?.reservation),
    institution: pick(hit.institution, SEARCH_INSTITUTION_FIELDS, args.fields?.institution),
  }));
  return { reservations, pageInfo: page.pageInfo, count: reservations.length };
}

export function registerSearchReservations(server: McpServer, dataSource: DataSource): void {
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
      const result = await executeSearchReservations(args, dataSource);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
