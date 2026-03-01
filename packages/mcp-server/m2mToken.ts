interface M2MConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

let _config: M2MConfig | null = null;
let _cachedToken = "";
let _expiresAt = 0;

export function configureM2M(config: M2MConfig): void {
  _config = config;
  _cachedToken = "";
  _expiresAt = 0;
}

export async function getM2MToken(): Promise<string> {
  if (_cachedToken && Date.now() < _expiresAt) {
    return _cachedToken;
  }

  if (!_config) {
    throw new Error("M2M not configured. Call configureM2M() first.");
  }

  const response = await fetch(`https://${_config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: _config.clientId,
      client_secret: _config.clientSecret,
      audience: _config.audience,
    }),
  });

  if (!response.ok) {
    throw new Error(`M2M token request failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as TokenResponse;
  _cachedToken = data.access_token;
  _expiresAt = Date.now() + data.expires_in * 1000 - EXPIRY_MARGIN_MS;

  return _cachedToken;
}
