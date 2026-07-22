import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            // setup.ts が applyD1Migrations で適用するマイグレーション
            TEST_MIGRATIONS: migrations,
            // wrangler.jsonc の "" を上書き（JWT audience 検証に非空の値が要る）
            AUTH0_AUDIENCE: "https://api.test/",
          },
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
