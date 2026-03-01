import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { validateApiToken } from "./auth.ts";
import { configureGraphQL } from "./graphqlClient.ts";
import { configureM2M } from "./m2mToken.ts";
import { createServer } from "./server.ts";

interface Env {
  GRAPHQL_ENDPOINT: string;
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_AUDIENCE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }

    if (
      !env.GRAPHQL_ENDPOINT ||
      !env.AUTH0_DOMAIN ||
      !env.AUTH0_CLIENT_ID ||
      !env.AUTH0_CLIENT_SECRET ||
      !env.AUTH0_AUDIENCE
    ) {
      return Response.json({ error: "Server misconfigured" }, { status: 500 });
    }

    configureGraphQL(env.GRAPHQL_ENDPOINT);
    configureM2M({
      domain: env.AUTH0_DOMAIN,
      clientId: env.AUTH0_CLIENT_ID,
      clientSecret: env.AUTH0_CLIENT_SECRET,
      audience: env.AUTH0_AUDIENCE,
    });

    // Validate API token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Authorization header required" }, { status: 401 });
    }

    const apiToken = authHeader.slice(7);
    try {
      const valid = await validateApiToken(apiToken);
      if (!valid) {
        return Response.json({ error: "Invalid or expired API token" }, { status: 401 });
      }
    } catch (e) {
      console.error("Token validation error:", e);
      return Response.json({ error: "Token validation failed" }, { status: 500 });
    }

    const server = createServer({ authMode: "auth0" });
    const transport = new WebStandardStreamableHTTPServerTransport({});

    await server.connect(transport);

    return transport.handleRequest(request);
  },
};
