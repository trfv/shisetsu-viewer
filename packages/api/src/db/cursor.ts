export function encodeCursor(fields: Record<string, string>): string {
  // btoa は Latin1 しか扱えないので、多バイト文字は UTF-8 バイト列を経由する
  const bytes = new TextEncoder().encode(JSON.stringify(fields));
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  const base64 = btoa(binary);
  return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeCursor(cursor: string): Record<string, string> | null {
  let json: string;
  try {
    const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") return null;
    result[key] = value;
  }
  return result;
}
