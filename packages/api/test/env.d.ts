import type { D1Migration } from "@cloudflare/vitest-plugin";

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
      // テストが書き込むと同一 isolate の worker から見える
      TEST_JWKS_JSON?: string;
      TEST_GITHUB_JWKS_JSON?: string;
      ADMIN_API_KEY?: string;
    }
  }
}
