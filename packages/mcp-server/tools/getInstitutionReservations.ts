import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { DataSource } from "../dataSource.ts";
import { RESERVATION_FIELDS } from "../fieldDefinitions.ts";
import { institutionIdSchema } from "../paramHelpers.ts";
import { pick } from "../pick.ts";

export async function executeGetInstitutionReservations(
  args: {
    institutionId: string;
    startDate: string;
    endDate: string;
    fields?: readonly string[] | undefined;
  },
  dataSource: DataSource
): Promise<{ reservations: Record<string, unknown>[]; count: number }> {
  const rows = await dataSource.getInstitutionReservations(args.institutionId, {
    startDate: args.startDate,
    endDate: args.endDate,
  });
  const reservations = rows.map((row) => pick(row, RESERVATION_FIELDS, args.fields));
  return { reservations, count: reservations.length };
}

export function registerGetInstitutionReservations(
  server: McpServer,
  dataSource: DataSource
): void {
  server.registerTool(
    "get_institution_reservations",
    {
      description: `特定施設の予約状況を日付範囲で取得します（上限1000件）。

【使い方】list_institutions で取得した施設IDと日付範囲(YYYY-MM-DD)を指定。reservation フィールドは { 時間区分キー: ステータスキー } のマッピングです。ステータスの意味は自治体ごとに異なります。
【レスポンス】reservations: 日付ごとの予約データ配列(date, reservation), count`,
      annotations: {
        title: "施設予約状況取得",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        institutionId: institutionIdSchema.describe("施設のUUID"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("開始日 (YYYY-MM-DD)"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("終了日 (YYYY-MM-DD)"),
        fields: z
          .array(z.enum(RESERVATION_FIELDS))
          .optional()
          .describe(
            "返却フィールドを指定しトークンを節約 (省略時は全フィールド)。選択可能: " +
              RESERVATION_FIELDS.join(", ")
          ),
      },
    },
    async (args) => {
      const result = await executeGetInstitutionReservations(args, dataSource);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
