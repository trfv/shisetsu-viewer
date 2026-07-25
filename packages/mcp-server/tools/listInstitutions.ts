import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PageInfo } from "@shisetsu-viewer/shared";
import { z } from "zod";

import type { DataSource } from "../dataSource.ts";
import { INSTITUTION_LIST_FIELDS } from "../fieldDefinitions.ts";
import { INSTITUTION_SIZE_HELP, MUNICIPALITY_HELP, toAvailabilityFilter } from "../paramHelpers.ts";
import { pick } from "../pick.ts";

export async function executeListInstitutions(
  args: {
    municipality?: string[] | undefined;
    institutionSizes?: string[] | undefined;
    isAvailableStrings?: boolean | string | undefined;
    isAvailableWoodwind?: boolean | string | undefined;
    isAvailableBrass?: boolean | string | undefined;
    isAvailablePercussion?: boolean | string | undefined;
    fields?: readonly string[] | undefined;
    first?: number | undefined;
    after?: string | undefined;
  },
  dataSource: DataSource
): Promise<{ institutions: Record<string, unknown>[]; pageInfo: PageInfo; count: number }> {
  const page = await dataSource.listInstitutions({
    municipality: args.municipality,
    institutionSizes: args.institutionSizes,
    isAvailableStrings: toAvailabilityFilter(args.isAvailableStrings),
    isAvailableWoodwind: toAvailabilityFilter(args.isAvailableWoodwind),
    isAvailableBrass: toAvailabilityFilter(args.isAvailableBrass),
    isAvailablePercussion: toAvailabilityFilter(args.isAvailablePercussion),
    limit: args.first,
    cursor: args.after,
  });
  const institutions = page.items.map((item) => pick(item, INSTITUTION_LIST_FIELDS, args.fields));
  return { institutions, pageInfo: page.pageInfo, count: institutions.length };
}

export function registerListInstitutions(server: McpServer, dataSource: DataSource): void {
  server.registerTool(
    "list_institutions",
    {
      description: `施設一覧を取得します。自治体・施設サイズ・楽器利用可否でフィルタできます。

【使い方】まずこのツールで施設を探し、IDを取得 → get_institution_detail で詳細 or get_institution_reservations / search_reservations で空き確認
【レスポンス】institutions: 施設配列(id, municipality, building, institution 等), pageInfo: { hasNextPage, endCursor }, count`,
      annotations: {
        title: "施設一覧取得",
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
        institutionSizes: z
          .array(z.string())
          .optional()
          .describe(`施設サイズでフィルタ。指定可能な値: ${INSTITUTION_SIZE_HELP}`),
        isAvailableStrings: z
          .union([z.boolean(), z.string()])
          .optional()
          .describe("弦楽器利用可否 (true = 利用可、false = 利用不可)"),
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
        fields: z
          .array(z.enum(INSTITUTION_LIST_FIELDS))
          .optional()
          .describe(
            "返却フィールドを指定しトークンを節約 (省略時は全フィールド)。選択可能: " +
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
      const result = await executeListInstitutions(args, dataSource);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
