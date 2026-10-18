// workers-oauth-provider は読み込み時に Cloudflare.compatibilityFlags を見て CIMD の有効・無効を
// 決めるので、テストファイルの import より前に workerd と同じ値を置く。
Object.assign(globalThis, {
  Cloudflare: { compatibilityFlags: { global_fetch_strictly_public: true } },
});
