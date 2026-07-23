import type { D1Migration } from "@cloudflare/vitest-pool-workers";

// cloudflare:test の `env` は Cloudflare.Env（worker-configuration.d.ts 生成）として型付けされる。
// vitest.config.ts の miniflare.bindings で注入するテスト専用 binding をここで足す。
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
      // 認可テストで beforeAll がローカル JWKS を書き込む（同一 isolate なので worker から見える）
      TEST_JWKS_JSON?: string;
      TEST_GITHUB_JWKS_JSON?: string;
      ADMIN_API_KEY?: string;
    }
  }
}
