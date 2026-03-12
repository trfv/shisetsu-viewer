// packages/mcp-server/auth/tokenStore.ts
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

function getConfigDir(): string {
  const base = process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config");
  return join(base, "shisetsu");
}

function getTokenPath(): string {
  return join(getConfigDir(), "tokens.json");
}

async function readTokens(): Promise<Tokens | null> {
  try {
    const data = await readFile(getTokenPath(), "utf-8");
    return JSON.parse(data) as Tokens;
  } catch {
    return null;
  }
}

export async function writeTokens(tokens: Tokens): Promise<void> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(getTokenPath(), JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export async function removeTokens(): Promise<void> {
  try {
    await unlink(getTokenPath());
  } catch {
    // File doesn't exist — no-op
  }
}

async function refreshAccessToken(tokens: Tokens): Promise<Tokens | null> {
  const domain = process.env["AUTH0_DOMAIN"];
  const clientId = process.env["AUTH0_CLIENT_ID"];
  const clientSecret = process.env["AUTH0_CLIENT_SECRET"];

  if (!domain || !clientId || !clientSecret) return null;

  try {
    const response = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) return null;

    const result = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + result.expires_in,
    };
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token, or a tagged result indicating why none is available.
 * - `{ status: "ok", token }` — valid token (possibly refreshed)
 * - `{ status: "no_tokens" }` — no stored tokens (user never logged in)
 * - `{ status: "refresh_failed" }` — tokens existed but refresh failed (removed)
 */
type TokenResult =
  | { status: "ok"; token: string }
  | { status: "no_tokens" }
  | { status: "refresh_failed" };

export async function getValidToken(): Promise<TokenResult> {
  const tokens = await readTokens();
  if (!tokens) return { status: "no_tokens" };

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > now + 60) {
    return { status: "ok", token: tokens.access_token };
  }

  // Token expired — try refresh
  const refreshed = await refreshAccessToken(tokens);
  if (refreshed) {
    await writeTokens(refreshed);
    return { status: "ok", token: refreshed.access_token };
  }

  // Refresh failed — remove stale tokens
  await removeTokens();
  return { status: "refresh_failed" };
}
