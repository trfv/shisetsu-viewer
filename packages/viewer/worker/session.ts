// セッションを D1 に置かず（個人情報を自前で持たない）Cookie に入れる。署名だけでは
// refresh token が読めてしまうので AES-GCM で暗号化する。

/** ID トークンは Cookie の 4KB 上限を圧迫するので持たない。 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** UNIX 秒 */
  expiresAt: number;
}

const IV_BYTES = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * SESSION_KEYS は 32 バイト鍵の base64url の JSON 配列。鍵の交換は新しい鍵を先頭に足し、
 * Cookie の寿命（365 日）が過ぎてから旧鍵を落とす。
 */
export async function importKeys(raw: string): Promise<CryptoKey[]> {
  const encoded = JSON.parse(raw) as string[];
  if (!Array.isArray(encoded) || encoded.length === 0) {
    throw new Error("SESSION_KEYS に鍵がありません");
  }
  return await Promise.all(
    encoded.map((key) =>
      crypto.subtle.importKey("raw", fromBase64Url(key), "AES-GCM", false, ["encrypt", "decrypt"])
    )
  );
}

export type KeyLoader = () => Promise<CryptoKey[]>;

// 鍵は利用者に依存しないので isolate 内で使い回してよい。
let cached: { raw: string; keys: Promise<CryptoKey[]> } | null = null;

// 遅延読み込みにして、SESSION_KEYS の不備で Cookie を持たない匿名の閲覧まで巻き込まない。
export function keyLoader(raw: string): KeyLoader {
  return () => {
    if (cached?.raw !== raw) cached = { raw, keys: importKeys(raw) };
    return cached.keys;
  };
}

// label を additional data に束縛し、別名の Cookie への貼り替え（oauth → session 等）を復号失敗にする。
export async function seal(keys: CryptoKey[], label: string, value: unknown): Promise<string> {
  const [key] = keys;
  if (!key) throw new Error("暗号化の鍵がありません");
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(label) },
    key,
    encoder.encode(JSON.stringify(value))
  );
  const sealed = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  sealed.set(iv);
  sealed.set(new Uint8Array(ciphertext), IV_BYTES);
  return toBase64Url(sealed);
}

export async function unseal<T>(
  keys: CryptoKey[],
  label: string,
  sealed: string
): Promise<T | null> {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = fromBase64Url(sealed);
  } catch {
    return null;
  }
  if (bytes.length <= IV_BYTES) return null;
  const iv = bytes.slice(0, IV_BYTES);
  const ciphertext = bytes.slice(IV_BYTES);
  for (const key of keys) {
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: encoder.encode(label) },
        key,
        ciphertext
      );
      return JSON.parse(decoder.decode(plaintext)) as T;
    } catch {
      continue;
    }
  }
  return null;
}
