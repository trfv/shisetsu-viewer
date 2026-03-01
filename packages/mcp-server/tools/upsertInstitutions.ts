import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";

const MUTATION = `
mutation update_institutions(
  $data: [institutions_insert_input!]!
  $columns: [institutions_update_column!]!
) {
  insert_institutions(
    objects: $data,
    on_conflict: {
      constraint: institutions_id_key,
      update_columns: $columns
    }
  ) {
    affected_rows
  }
}`;

interface MutationData {
  insert_institutions: { affected_rows: number };
}

const DEFAULT_COLUMNS = [
  "prefecture",
  "municipality",
  "building",
  "institution",
  "building_kana",
  "institution_kana",
  "building_system_name",
  "institution_system_name",
  "capacity",
  "area",
  "institution_size",
  "fee_divisions",
  "weekday_usage_fee",
  "holiday_usage_fee",
  "address",
  "is_available_strings",
  "is_available_woodwind",
  "is_available_brass",
  "is_available_percussion",
  "is_equipped_music_stand",
  "is_equipped_piano",
  "website_url",
  "layout_image_url",
  "lottery_period",
  "note",
];

export function registerUpsertInstitutions(server: McpServer): void {
  server.registerTool(
    "upsert_institutions",
    {
      description: "施設データを一括 upsert（admin のみ）",
      inputSchema: {
        data: z.array(z.record(z.string(), z.unknown())).describe("施設データ配列"),
        updateColumns: z
          .array(z.string())
          .optional()
          .describe("競合時に更新するカラム名 (省略時はデフォルト全カラム)"),
      },
    },
    async (args) => {
      const result = await graphqlRequest<MutationData>(MUTATION, {
        data: args.data,
        columns: args.updateColumns ?? DEFAULT_COLUMNS,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                totalRows: args.data.length,
                affectedRows: result.insert_institutions.affected_rows,
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
