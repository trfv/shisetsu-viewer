/** Cookie ヘッダから name に完全一致する値を取り出す。無ければ null。 */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

/**
 * __Host- prefix の要件（Secure かつ Path=/ かつ Domain 属性なし）を満たす形で直列化する。
 * これによりサブドメインから Cookie を上書きされる経路を塞ぐ。
 * SameSite=Lax で足りるのは、BFF と SPA が同一オリジンだからである。
 */
export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
