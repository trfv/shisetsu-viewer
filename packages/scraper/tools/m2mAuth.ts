/**
 * Auth0 Client Credentials Flow でアクセストークンを取得する。
 * scripts/run.ts が子プロセス起動前に M2M_TOKEN 環境変数を埋めるために使う。
 *
 * トークンの「取得」はここ、環境変数からの「読み出し」は m2mToken.ts (getM2MToken) と役割を分ける。
 */
export async function fetchM2MToken(): Promise<string> {
  const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE } = process.env;
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET || !AUTH0_AUDIENCE) {
    throw new Error(
      "Missing required environment variables: set M2M_TOKEN, or AUTH0_DOMAIN + AUTH0_CLIENT_ID + AUTH0_CLIENT_SECRET + AUTH0_AUDIENCE"
    );
  }
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`Auth0 token fetch failed: ${res.status} ${res.statusText}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}
