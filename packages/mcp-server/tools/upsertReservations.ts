import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";

const MUTATION = `
mutation update_reservations($data: [reservations_insert_input!]!) {
  insert_reservations(
    objects: $data
    on_conflict: {
      constraint: reservations_institution_id_date_key
      update_columns: [reservation]
    }
  ) {
    affected_rows
  }
}`;

interface MutationData {
  insert_reservations: { affected_rows: number };
}

const CHUNK_SIZE = 2000;

export function registerUpsertReservations(server: McpServer): void {
  server.registerTool(
    "upsert_reservations",
    {
      description: "予約データを一括 upsert（admin のみ、2000件ずつチャンク処理）",
      inputSchema: {
        data: z
          .array(
            z.object({
              institution_id: z.string().uuid().describe("施設UUID"),
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
      let totalAffected = 0;

      for (let i = 0; i < args.data.length; i += CHUNK_SIZE) {
        const chunk = args.data.slice(i, i + CHUNK_SIZE);
        const result = await graphqlRequest<MutationData>(MUTATION, { data: chunk });
        totalAffected += result.insert_reservations.affected_rows;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                totalRows: args.data.length,
                affectedRows: totalAffected,
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
