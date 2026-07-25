import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DataSource, WritableDataSource } from "./dataSource.ts";
import { registerGuidePrompt } from "./prompts/guide.ts";
import { registerSearchAvailableRoomsPrompt } from "./prompts/searchAvailableRooms.ts";
import { registerMunicipalitiesResource } from "./resources/municipalities.ts";
import { registerGetInstitutionDetail } from "./tools/getInstitutionDetail.ts";
import { registerGetInstitutionReservations } from "./tools/getInstitutionReservations.ts";
import { registerListInstitutions } from "./tools/listInstitutions.ts";
import { registerSearchReservations } from "./tools/searchReservations.ts";
import { registerUpsertInstitutions } from "./tools/upsertInstitutions.ts";
import { registerUpsertReservations } from "./tools/upsertReservations.ts";

/**
 * DataSource はリクエストごとに生成して渡す。サーバーインスタンスと DataSource を 1:1 で
 * 対応させることで、Workers の並行リクエスト間で認証状態（ロール・トークン）が共有されない
 * ことを型構造で保証する。
 *
 * - `allowReservations` が false のとき reservations 系 2 ツールを登録しない
 *   （anonymous / trial ユーザーへの予約データ非公開を server 構成に昇格）。
 * - `write` が渡された場合のみ write 2 ツールを登録する（admin モード = stdio）。
 */
export function createServer(options: {
  dataSource: DataSource;
  allowReservations: boolean;
  write?: WritableDataSource | undefined;
}): McpServer {
  const server = new McpServer({
    name: "shisetsu-viewer",
    version: "0.2.0",
  });

  registerMunicipalitiesResource(server);

  registerGuidePrompt(server);
  registerSearchAvailableRoomsPrompt(server);

  registerListInstitutions(server, options.dataSource);
  registerGetInstitutionDetail(server, options.dataSource);

  if (options.allowReservations) {
    registerGetInstitutionReservations(server, options.dataSource);
    registerSearchReservations(server, options.dataSource);
  }

  if (options.write) {
    registerUpsertReservations(server, options.write);
    registerUpsertInstitutions(server, options.write);
  }

  return server;
}
