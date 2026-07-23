import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ADMIN_API_KEY, API_ENDPOINT } from "./env.ts";
import { createHttpDataSource } from "./httpDataSource.ts";
import { createServer } from "./server.ts";

// stdio は 1 プロセス 1 ユーザー（admin）なので、プロセス起動時に 1 つ作れば足りる。
// D1 API へは X-Admin-Key で書き込み、read/write 全ツールを露出する。
const dataSource = createHttpDataSource(API_ENDPOINT, { adminKey: ADMIN_API_KEY });
const server = createServer({
  dataSource,
  allowReservations: true,
  write: dataSource,
});
const transport = new StdioServerTransport();
await server.connect(transport);
