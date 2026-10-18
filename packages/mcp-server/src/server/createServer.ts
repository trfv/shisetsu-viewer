import { McpServer } from "@modelcontextprotocol/server";

import type { DataSource, WritableDataSource } from "../data/dataSource.ts";
import { registerGuidePrompt } from "./prompts/guide.ts";
import { registerSearchAvailableRoomsPrompt } from "./prompts/searchAvailableRooms.ts";
import { registerMunicipalitiesResource } from "./resources/municipalities.ts";
import { registerGetInstitutionDetail } from "./tools/getInstitutionDetail.ts";
import { registerGetInstitutionReservations } from "./tools/getInstitutionReservations.ts";
import { registerListInstitutions } from "./tools/listInstitutions.ts";
import { registerSearchReservations } from "./tools/searchReservations.ts";
import { registerUpsertInstitutions } from "./tools/upsertInstitutions.ts";
import { registerUpsertReservations } from "./tools/upsertReservations.ts";

export function createServer(options: {
  dataSource: DataSource;
  allowReservations: boolean;
  write?: WritableDataSource | undefined;
}): McpServer {
  const server = new McpServer({
    name: "shisetsu-viewer",
    version: "0.3.0",
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
