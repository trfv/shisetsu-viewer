import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Institution } from "@shisetsu-viewer/shared";
import { z } from "zod";

import type { WritableDataSource } from "../dataSource.ts";

export function registerUpsertInstitutions(server: McpServer, write: WritableDataSource): void {
  server.registerTool(
    "upsert_institutions",
    {
      description: "施設データを一括 upsert します（admin のみ）。競合時は既存データを更新します。",
      annotations: {
        title: "施設データ一括更新",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        data: z.array(z.record(z.string(), z.unknown())).describe("施設データ配列"),
      },
    },
    async (args) => {
      const res = await write.upsertInstitutions(args.data as unknown as Institution[]);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                totalRows: args.data.length,
                received: res.received,
                rowsWritten: res.rowsWritten,
                deferred: res.deferred,
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
