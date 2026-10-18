import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createHttpDataSource } from "./data/httpDataSource.ts";
import { ADMIN_API_KEY, API_ENDPOINT } from "./env.ts";
import { createServer } from "./server/createServer.ts";

// stdio は 1 プロセス 1 ユーザー（admin）なので、リクエストごとに作らず起動時に 1 つで足りる。
const dataSource = createHttpDataSource(API_ENDPOINT, { adminKey: ADMIN_API_KEY });
serveStdio(() => createServer({ dataSource, allowReservations: true, write: dataSource }));
