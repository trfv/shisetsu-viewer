// Cookie に載せる値の暗号化。セッションを D1 に置かない（個人情報を自前で持たない）ため、
// refresh token を含む状態を Cookie そのものに入れる。署名だけでは中身が読めてしまうので、
// 改ざん検知と秘匿を兼ねる AES-GCM を使う。

/** Auth0 から受け取ったトークン一式。ID トークンは Cookie の 4KB 上限を圧迫するので持たない。 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** アクセストークンの失効時刻（UNIX 秒） */
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
 * SESSION_KEYS（32 バイト鍵を base64url にした文字列の JSON 配列）を読む。
 * 先頭で暗号化し、全鍵で復号を試みる。鍵の交換は新しい鍵を先頭に足してデプロイし、
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

// 鍵は利用者に依存しないので isolate 内で使い回してよい。Secret が変わると raw も変わる。
let cached: { raw: string; keys: Promise<CryptoKey[]> } | null = null;

/**
 * 鍵の読み込みを、Cookie を実際に読み書きするまで遅らせる。SESSION_KEYS の設定漏れや
 * 破損があっても、Cookie を持たない匿名の閲覧（/api/* の大半）は巻き込まずに済む。
 */
export function keyLoader(raw: string): KeyLoader {
  return () => {
    if (cached?.raw !== raw) cached = { raw, keys: importKeys(raw) };
    return cached.keys;
  };
}

/**
 * label は additional data として暗号文に束縛する。これにより、ある Cookie の値を
 * 別の名前の Cookie に貼り替えても復号に失敗する（__Host-oauth を __Host-session として使う等）。
 */
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

/** どの鍵でも復号できなければ null。改ざん、鍵の廃止、壊れた値をまとめて未ログインに倒す。 */
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
      // 次の鍵を試す
    }
  }
  return null;
}
