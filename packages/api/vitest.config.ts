import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // JWT audience 検証に非空の値が要る
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
