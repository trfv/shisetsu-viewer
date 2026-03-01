import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_DOMAIN,
  GRAPHQL_ENDPOINT,
} from "./env.ts";
import { configureGraphQL } from "./graphqlClient.ts";
import { configureM2M } from "./m2mToken.ts";
import { createServer } from "./server.ts";

configureGraphQL(GRAPHQL_ENDPOINT);
configureM2M({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  audience: AUTH0_AUDIENCE,
});

const server = createServer({ authMode: "admin" });
const transport = new StdioServerTransport();
await server.connect(transport);
