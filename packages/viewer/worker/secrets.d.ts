// Secret は wrangler.jsonc に書けないため `wrangler types` の生成対象に入らない。
// 実行時には binding として存在するので、ここで Cloudflare.Env に足して型を揃える。
// 値の投入は `wrangler secret put <NAME>`。
declare namespace Cloudflare {
  interface Env {
    /** Google OAuth のウェブアプリケーション クライアント ID */
    GOOGLE_CLIENT_ID: string;
    /** 同クライアントシークレット。code 交換は Worker 内（confidential client）で行う */
    GOOGLE_CLIENT_SECRET: string;
    /** api 向け JWT の署名鍵。秘密 JWK の配列を JSON 文字列にしたもの。先頭が署名鍵 */
    AUTH_SIGNING_KEYS: string;
  }
}
