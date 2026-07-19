import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_DOMAIN,
  GRAPHQL_ENDPOINT,
} from "./env.ts";
import { createGraphQLClient } from "./graphqlClient.ts";
import { configureM2M } from "./m2mToken.ts";
import { createServer } from "./server.ts";

configureM2M({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  audience: AUTH0_AUDIENCE,
});

// stdio は 1 プロセス 1 ユーザーなので、プロセス起動時に 1 つ作れば足りる
// （トークンは未指定 = M2M フォールバック）
const server = createServer({
  authMode: "admin",
  client: createGraphQLClient(GRAPHQL_ENDPOINT),
});
const transport = new StdioServerTransport();
await server.connect(transport);
