# MCP Server Package

MCP (Model Context Protocol) server exposing Hasura GraphQL data as AI-consumable tools and resources. Deployed to Cloudflare Workers. Dependencies: `@modelcontextprotocol/sdk`, `zod`. Uses `node --env-file=.env` for local environment loading.

## Commands

```bash
npm run deploy -w @shisetsu-viewer/mcp-server           # Deploy to Cloudflare Workers
npm run preview:wrangler -w @shisetsu-viewer/mcp-server # Local preview via wrangler dev
npm run start -w @shisetsu-viewer/mcp-server            # Local stdio server (dev/debug用, write tools有効)
```

## Architecture

- `server.ts` — Creates `McpServer`, registers all tools and resources
- `worker.ts` — Cloudflare Workers entry point with API token auth middleware
- `index.ts` — Local stdio entry point (dev/debug用, write tools有効)
- `auth.ts` — API token validation against Hasura `api_tokens` table (SHA-256 hash lookup)
- `m2mToken.ts` — Auth0 M2M token acquisition and caching
- `graphqlClient.ts` — Hasura GraphQL client, authenticates via Auth0 M2M Bearer token
- `env.ts` — Environment variable schema and validation

### Authentication

- **Hasura**: Auth0 M2M Bearer トークン（全モード共通）
- **クライアント → Workers**: API トークン（`api_tokens` テーブルで SHA-256 ハッシュ検証）

### Tools

- **Read**: `listInstitutions`, `getInstitutionDetail`, `getInstitutionReservations`, `searchReservations`
- **Write**: `upsertReservations`, `upsertInstitutions`（Cloudflare Workers デプロイでは無効）

### Resources

- `municipalities` — Municipality registry data from `@shisetsu-viewer/shared`

## Environment Variables

- `GRAPHQL_ENDPOINT` — Hasura GraphQL endpoint
- `AUTH0_AUDIENCE` — Auth0 API audience
- `AUTH0_DOMAIN` — Auth0 domain (for M2M token)
- `AUTH0_CLIENT_ID` — Auth0 M2M client ID
- `AUTH0_CLIENT_SECRET` — Auth0 M2M client secret

Copy `.env.sample` to `.env` and fill in values.
