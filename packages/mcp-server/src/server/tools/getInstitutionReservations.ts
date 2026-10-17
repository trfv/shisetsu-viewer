import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DataSource } from "../../data/dataSource.ts";
import {
  executeGetInstitutionReservations,
  getInstitutionReservationsInput,
} from "../../queries/getInstitutionReservations.ts";
import { jsonResult, READ_ONLY } from "./result.ts";

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
      annotations: { title: "施設予約状況取得", ...READ_ONLY },
      inputSchema: getInstitutionReservationsInput,
    },
    async (args) => jsonResult(await executeGetInstitutionReservations(args, dataSource))
  );
}
