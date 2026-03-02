/**
 * Return the pre-fetched M2M Bearer token from the environment.
 * Token acquisition is handled externally (CI prepare job / local .env).
 */
export function getM2MToken(): string {
  const token = process.env.M2M_TOKEN;
  if (!token) {
    throw new Error("Missing required environment variable: M2M_TOKEN");
  }
  return token;
}
