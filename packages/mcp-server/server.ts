import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMunicipalitiesResource } from "./resources/municipalities.ts";
import { registerListInstitutions } from "./tools/listInstitutions.ts";
import { registerGetInstitutionDetail } from "./tools/getInstitutionDetail.ts";
import { registerGetInstitutionReservations } from "./tools/getInstitutionReservations.ts";
import { registerSearchReservations } from "./tools/searchReservations.ts";
import { registerUpsertReservations } from "./tools/upsertReservations.ts";
import { registerUpsertInstitutions } from "./tools/upsertInstitutions.ts";

export function createServer(options: { authMode: "admin" | "auth0" }): McpServer {
  const server = new McpServer({
    name: "shisetsu-viewer",
    version: "0.1.0",
  });

  registerMunicipalitiesResource(server);

  registerListInstitutions(server);
  registerGetInstitutionDetail(server);
  registerGetInstitutionReservations(server);
  registerSearchReservations(server);

  if (options.authMode === "admin") {
    registerUpsertReservations(server);
    registerUpsertInstitutions(server);
  }

  return server;
}
