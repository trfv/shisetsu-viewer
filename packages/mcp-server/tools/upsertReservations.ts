import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { WritableDataSource } from "../dataSource.ts";
import { institutionIdSchema } from "../paramHelpers.ts";

// D1 API は 1 リクエスト 500 行まで（MAX_RESERVATION_ROWS）。超過分はチャンク分割で送る。
const CHUNK_SIZE = 500;

export function registerUpsertReservations(server: McpServer, write: WritableDataSource): void {
  server.registerTool(
    "upsert_reservations",
    {
      description:
        "予約データを一括 upsert します（admin のみ）。500件ずつチャンク処理で送信します。",
      annotations: {
        title: "予約データ一括更新",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        municipality: z.string().describe("自治体キー (MUNICIPALITY_*)。scrape_runs 記録に使用"),
        runId: z
          .string()
          .optional()
          .describe("実行 ID (省略時はタイムスタンプ)。scrape_runs の冪等キー"),
        data: z
          .array(
            z.object({
              institution_id: institutionIdSchema.describe("施設UUID"),
              date: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .describe("日付 (YYYY-MM-DD)"),
              reservation: z
                .record(z.string(), z.string())
                .describe("区分キー → ステータスキーのマッピング"),
            })
          )
          .describe("予約データ配列"),
      },
    },
    async (args) => {
      const runId = args.runId ?? `mcp-${Date.now()}`;
      let received = 0;
      let rowsWritten = 0;
      let deferred = false;

      for (let i = 0; i < args.data.length; i += CHUNK_SIZE) {
        const chunk = args.data.slice(i, i + CHUNK_SIZE);
        const res = await write.upsertReservations({
          municipality: args.municipality,
          runId,
          rows: chunk,
        });
        received += res.received;
        rowsWritten += res.rowsWritten;
        deferred = deferred || res.deferred;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { totalRows: args.data.length, received, rowsWritten, deferred },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
