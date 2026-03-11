# MCP Server Package

MCP (Model Context Protocol) server exposing Hasura GraphQL data as AI-consumable tools and resources. Deployed to Cloudflare Workers. Dependencies: `@modelcontextprotocol/sdk`, `zod`, `@cloudflare/workers-oauth-provider`. Uses `node --env-file=.env` for local environment loading.

## Commands

```bash
npm run typecheck -w @shisetsu-viewer/mcp-server       # Type check with tsgo
npm run deploy -w @shisetsu-viewer/mcp-server           # Deploy to Cloudflare Workers
npm run preview:wrangler -w @shisetsu-viewer/mcp-server # Local preview via wrangler dev
npm run start -w @shisetsu-viewer/mcp-server            # Local stdio server (dev/debug用, write tools有効)
```

## Architecture

- `server.ts` — Creates `McpServer`, registers all tools and resources
- `worker.ts` — Cloudflare Workers entry point with MCP OAuth + Auth0 integration
- `index.ts` — Local stdio entry point (dev/debug用, write tools有効)
- `m2mToken.ts` — Auth0 M2M token acquisition and caching (local stdio用)
- `graphqlClient.ts` — Hasura GraphQL client with retry logic
- `env.ts` — Environment variable schema and validation (local stdio用)

### Authentication

**Workers デプロイ (worker.ts):**
- クライアント → Workers: MCP OAuth (`@cloudflare/workers-oauth-provider` + Auth0)
- Workers → Hasura: ユーザーの Auth0 アクセストークンを転送（per-user 権限）
- OAuth フロー: Dynamic Client Registration → Auth0 認証 → token exchange
- トークン保存: Cloudflare KV (`OAUTH_KV`) に暗号化して自動管理

**ローカル stdio (index.ts):**
- Hasura: Auth0 M2M Bearer トークン（サービスアカウント権限）

### Tools

- **Read**: `listInstitutions`, `getInstitutionDetail`, `getInstitutionReservations`, `searchReservations`
- **Write**: `upsertReservations`, `upsertInstitutions`（Cloudflare Workers デプロイでは無効）

### Resources

- `municipalities` — Municipality registry data from `@shisetsu-viewer/shared`

## Environment Variables

### ローカル stdio 用 (.env)

- `GRAPHQL_ENDPOINT` — Hasura GraphQL endpoint
- `AUTH0_DOMAIN` — Auth0 domain (for M2M token)
- `AUTH0_CLIENT_ID` — Auth0 M2M client ID
- `AUTH0_CLIENT_SECRET` — Auth0 M2M client secret
- `AUTH0_AUDIENCE` — Auth0 API audience

### Workers 用 (wrangler secrets)

- `GRAPHQL_ENDPOINT` — Hasura GraphQL endpoint
- `AUTH0_DOMAIN` — Auth0 domain
- `AUTH0_CLIENT_ID` — Auth0 Regular Web App client ID
- `AUTH0_CLIENT_SECRET` — Auth0 Regular Web App client secret
- `AUTH0_AUDIENCE` — Auth0 API audience
- `OAUTH_KV` — KV namespace binding (wrangler.jsonc で設定)

Copy `.env.sample` to `.env` and fill in values for local development.
