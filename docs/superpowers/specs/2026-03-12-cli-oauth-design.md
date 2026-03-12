# CLI OAuth Authentication Design

## Context

The shisetsu CLI (`packages/mcp-server/cli.ts`) currently authenticates to Hasura via Auth0 M2M (Client Credentials) tokens. M2M is slated for deprecation in favor of per-user OAuth tokens. This design adds OAuth-based authentication to the CLI using Authorization Code Flow with PKCE and a local callback server, reusing the existing Auth0 Regular Web App used by the Workers deployment.

## Requirements

- CLI authenticates users via browser-based OAuth (Authorization Code + PKCE)
- Per-user access tokens forwarded to Hasura (same as Workers deployment)
- Tokens persisted locally with automatic refresh
- M2M authentication removed from CLI (kept in MCP server `index.ts` for now)
- No new Auth0 application needed; reuse Workers' Regular Web App
- No new npm dependencies

## Auth0 Configuration (Manual)

Add to the Workers Regular Web App in Auth0 dashboard:
- **Allowed Callback URLs**: `http://localhost` (Auth0 allows any port for localhost by default when the base URL is registered)

No other Auth0 changes needed. The app already has `authorization_code` and `refresh_token` grant types enabled.

## Architecture

### New Files

```
packages/mcp-server/
  auth/
    login.ts       — OAuth login flow (local HTTP server + browser + token exchange)
    tokenStore.ts  — Token persistence (~/.config/shisetsu/tokens.json)
    logout.ts      — Token deletion
```

### Modified Files

```
packages/mcp-server/
  cli.ts           — Add login/logout commands, replace M2M auth with token store
```

### Unchanged

- `graphqlClient.ts` — Already accepts bearer token via `configureGraphQL(endpoint, token)`
- `m2mToken.ts` — Still used by `index.ts` (MCP stdio server)
- `env.ts` — Still used by `index.ts`; CLI will not import it at top level
- `worker.ts` — Unaffected
- All tool files — Unaffected (use `graphqlRequest` which already supports configured bearer tokens)

## Login Flow

```
User runs: shisetsu login

1. Read AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE from .env
   (dynamic import of env.ts, or direct process.env reads)
2. Generate PKCE code_verifier + code_challenge
3. Generate random state parameter
4. Start http.createServer on port 0 (OS-assigned random port)
5. Construct Auth0 /authorize URL:
   - response_type=code
   - client_id={AUTH0_CLIENT_ID}
   - redirect_uri=http://localhost:{port}/callback
   - audience={AUTH0_AUDIENCE}
   - scope=openid offline_access
   - state={state}
   - code_challenge={code_challenge}
   - code_challenge_method=S256
6. Open URL in default browser (using `open` command on macOS)
7. Wait for callback request on localhost
8. Verify state matches
9. POST to Auth0 /oauth/token:
   - grant_type=authorization_code
   - client_id={AUTH0_CLIENT_ID}
   - client_secret={AUTH0_CLIENT_SECRET}
   - code={code}
   - redirect_uri=http://localhost:{port}/callback
   - code_verifier={code_verifier}
10. Receive { access_token, refresh_token, expires_in }
11. Save to ~/.config/shisetsu/tokens.json:
    { access_token, refresh_token, expires_at: now + expires_in }
12. Respond to browser with success HTML page
13. Close server
14. Print "Login successful" to stderr
```

## Token Store

### File Location

`~/.config/shisetsu/tokens.json`

Platform detection: `process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')`, then append `shisetsu/tokens.json`.

### File Format

```json
{
  "access_token": "eyJ...",
  "refresh_token": "v1.xxx...",
  "expires_at": 1741958400
}
```

### File Permissions

Created with mode `0o600` (owner read/write only). Directory created with `0o700`.

### Operations

- **read()**: Read and parse tokens.json. Return null if file doesn't exist.
- **write(tokens)**: Write tokens.json with restricted permissions. Create directory if needed.
- **remove()**: Delete tokens.json.

## Token Refresh

### In tokenStore.ts

`getValidToken()` function:

1. Read tokens from store
2. If no tokens: return null (caller should prompt login)
3. If `expires_at > now + 60` (60s margin): return access_token
4. If expired but refresh_token exists:
   a. POST to Auth0 /oauth/token with grant_type=refresh_token
   b. Save new tokens to store
   c. Return new access_token
5. If refresh fails: remove tokens, return null

Auth0 credentials (domain, client_id, client_secret) needed for refresh are read from .env at call time.

## CLI Authentication Change

### Current (M2M)

```typescript
// cli.ts top-level
import { AUTH0_DOMAIN, ... } from "./env.ts";  // throws if vars missing
configureGraphQL(GRAPHQL_ENDPOINT);
configureM2M({ domain, clientId, clientSecret, audience });
// graphqlClient.ts calls getM2MToken() on each request
```

### New (OAuth)

```typescript
// cli.ts
// No top-level env.ts import (would throw before login)
// GRAPHQL_ENDPOINT read directly from process.env

if (command === "login") {
  // Dynamic import of env vars for Auth0 credentials
  await commandLogin();
} else if (command === "logout") {
  await commandLogout();
} else {
  // Get stored/refreshed token
  const token = await getValidToken();
  if (!token) fail("認証が必要です。'shisetsu login' を実行してください");
  configureGraphQL(graphqlEndpoint, token);
  // ... dispatch to command handler
}
```

Key change: `configureGraphQL` now receives the access_token as second argument (pre-configured bearer token), so `graphqlClient.ts` uses it directly instead of calling `getM2MToken()`.

## Logout Flow

```
User runs: shisetsu logout

1. Remove ~/.config/shisetsu/tokens.json
2. Print "Logged out" to stderr
```

No Auth0 revocation API call (tokens expire naturally). Simple and sufficient for CLI use.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No tokens.json | `Error: 認証が必要です。'shisetsu login' を実行してください` |
| Token expired, refresh succeeds | Transparent to user |
| Token expired, refresh fails | Remove tokens, `Error: セッション期限切れ。'shisetsu login' を再実行してください` |
| Login cancelled (browser closed) | Timeout after 120s, `Error: ログインがタイムアウトしました` |
| Auth0 callback error | Display error, exit 1 |
| GRAPHQL_ENDPOINT not set | `Error: GRAPHQL_ENDPOINT 環境変数が必要です` |

## Updated CLI Help

```
shisetsu - 施設予約データ CLI

Usage: shisetsu <command> [options]

Commands:
  login                   Auth0 でログイン（ブラウザが開きます）
  logout                  ログアウト（保存済みトークンを削除）
  list                    施設一覧取得
  detail <id>             施設詳細取得
  reservations <id>       施設予約状況取得
  search                  空き状況横断検索
  municipalities          自治体一覧
```

## Security Considerations

- tokens.json は `0600` パーミッションで保存
- client_secret は .env で管理（既存と同じ）
- PKCE を使用し、authorization code の横取り攻撃を防止
- state パラメータで CSRF を防止
- refresh_token は Auth0 側で rotation 設定可能（推奨）

## Verification

1. `shisetsu login` → ブラウザが開き、Auth0 認証画面が表示される
2. 認証完了後、ブラウザに成功ページが表示される
3. `~/.config/shisetsu/tokens.json` が作成される
4. `shisetsu list --municipality MUNICIPALITY_KOUTOU --pretty` → データが返る
5. `shisetsu logout` → tokens.json が削除される
6. `shisetsu list` → `認証が必要です` エラー
7. 型チェック・lint・knip が通る
