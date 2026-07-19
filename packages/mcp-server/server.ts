import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphQLClient } from "./graphqlClient.ts";
import { registerMunicipalitiesResource } from "./resources/municipalities.ts";
import { registerListInstitutions } from "./tools/listInstitutions.ts";
import { registerGetInstitutionDetail } from "./tools/getInstitutionDetail.ts";
import { registerGetInstitutionReservations } from "./tools/getInstitutionReservations.ts";
import { registerSearchReservations } from "./tools/searchReservations.ts";
import { registerUpsertReservations } from "./tools/upsertReservations.ts";
import { registerUpsertInstitutions } from "./tools/upsertInstitutions.ts";
import { registerGuidePrompt } from "./prompts/guide.ts";
import { registerSearchAvailableRoomsPrompt } from "./prompts/searchAvailableRooms.ts";

/**
 * `client` は呼び出し元がリクエストごとに生成して渡す。
 * サーバーインスタンスとクライアントを 1:1 で対応させることで、
 * Workers の並行リクエスト間でトークンが共有されないことを型で保証する。
 */
export function createServer(options: {
  authMode: "admin" | "auth0";
  client: GraphQLClient;
}): McpServer {
  const server = new McpServer({
    name: "shisetsu-viewer",
    version: "0.2.0",
  });

  registerMunicipalitiesResource(server);

  registerGuidePrompt(server);
  registerSearchAvailableRoomsPrompt(server);

  registerListInstitutions(server, options.client);
  registerGetInstitutionDetail(server, options.client);
  registerGetInstitutionReservations(server, options.client);
  registerSearchReservations(server, options.client);

  if (options.authMode === "admin") {
    registerUpsertReservations(server, options.client);
    registerUpsertInstitutions(server, options.client);
  }

  return server;
}
