import type { McpServer } from "@modelcontextprotocol/server";

import type { DataSource } from "../../data/dataSource.ts";
import {
  executeSearchReservations,
  searchReservationsInput,
  searchReservationsOutput,
} from "../../queries/searchReservations.ts";
import { READ_ONLY, structuredResult } from "./result.ts";

export function registerSearchReservations(server: McpServer, dataSource: DataSource): void {
  server.registerTool(
    "search_reservations",
    {
      description: `複数施設を横断して空き状況を検索します。特定の日付範囲・時間帯で空いている施設を見つけるのに最適です。

【使い方】startDate/endDate(YYYY-MM-DD)は必須。時間帯フィルタ: isMorningVacant(午前), isAfternoonVacant(午後), isEveningVacant(夜間)にtrueを指定。楽器フィルタ: isAvailableStrings等にtrueを指定で利用可のみ。
【レスポンス】reservations: 配列(各エントリに reservation + institution サブオブジェクト), pageInfo: { hasNextPage, endCursor }, count`,
      annotations: { title: "予約横断検索", ...READ_ONLY },
      inputSchema: searchReservationsInput,
      outputSchema: searchReservationsOutput,
    },
    async (args) => structuredResult(await executeSearchReservations(args, dataSource))
  );
}
