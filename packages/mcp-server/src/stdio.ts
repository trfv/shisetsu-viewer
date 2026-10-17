import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createHttpDataSource } from "./data/httpDataSource.ts";
import { ADMIN_API_KEY, API_ENDPOINT } from "./env.ts";
import { createServer } from "./server/createServer.ts";

// stdio は 1 プロセス 1 ユーザー（admin）なので、プロセス起動時に 1 つ作れば足りる。
// D1 API へは X-Admin-Key で書き込み、read/write 全ツールを露出する。
// serveStdio は接続ごとに factory を呼び、2026-07-28 と 2025 系のどちらのクライアントにも応える。
const dataSource = createHttpDataSource(API_ENDPOINT, { adminKey: ADMIN_API_KEY });
serveStdio(() => createServer({ dataSource, allowReservations: true, write: dataSource }));
