// Secret は wrangler.jsonc に書けないため `wrangler types` の生成対象に入らない。
// 実行時には binding として存在するので、ここで Cloudflare.Env に足して型を揃える。
// 値の投入は `wrangler versions secret put <NAME>`。
declare namespace Cloudflare {
  interface Env {
    /** Auth0 の Regular Web Application の Client ID */
    AUTH0_CLIENT_ID: string;
    /** 同 Client Secret。code 交換と refresh は Worker 内（confidential client）で行う */
    AUTH0_CLIENT_SECRET: string;
    /** Cookie の暗号化鍵。32 バイトの鍵を base64url にした文字列の JSON 配列。先頭で暗号化する */
    SESSION_KEYS: string;
  }
}
