import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        // テスト専用 binding。setup.ts が applyD1Migrations で適用する
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
