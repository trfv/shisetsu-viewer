const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN as string;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID as string;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET as string;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE as string;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

let cachedToken = "";
let expiresAt = 0;

export function resetTokenCache(): void {
  cachedToken = "";
  expiresAt = 0;
}

/**
 * Fetch an Auth0 M2M access token using the Client Credentials Flow.
 * Tokens are cached in memory and refreshed 5 minutes before expiry.
 */
export async function getM2MToken(): Promise<string> {
  if (cachedToken && Date.now() < expiresAt) {
    return cachedToken;
  }

  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
    }),
  });

  if (!response.ok) {
    throw new Error(`M2M token request failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = data.access_token;
  expiresAt = Date.now() + data.expires_in * 1000 - EXPIRY_MARGIN_MS;

  return cachedToken;
}
