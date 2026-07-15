/**
 * keyset ページネーションのカーソル。フィールドの JSON を base64url にする。
 * 値は常に文字列（date / institution_id など SQL の行値比較に使うキー）。
 */
export function encodeCursor(fields: Record<string, string>): string {
  // building_kana など多バイト文字を含むため、UTF-8 バイト列を経由して base64 化する
  // （btoa は Latin1 しか扱えない）。
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
