// workerd がランタイムに置く Cloudflare.compatibilityFlags を、wrangler.jsonc と同じ値で用意する。
// workers-oauth-provider はモジュールの読み込み時にこれを見て CIMD の有効・無効を決める（無いと
// 「CIMD is disabled」と警告する）ので、テストファイルの import より前に置く必要がある。
Object.assign(globalThis, {
  Cloudflare: { compatibilityFlags: { global_fetch_strictly_public: true } },
});
