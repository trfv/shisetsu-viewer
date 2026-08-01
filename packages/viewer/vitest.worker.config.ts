import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      // マイグレーションは api パッケージが持つ。viewer は適用するだけで所有しない。
      const migrations = await readD1Migrations(
        path.join(import.meta.dirname, "../api/migrations")
      );
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            GOOGLE_CLIENT_ID: "test-client-id",
            GOOGLE_CLIENT_SECRET: "test-secret",
            APP_ORIGIN: "https://app.test",
          },
          // wrangler.jsonc の service binding "API" はローカルに実体が無いため、
          // スタブを与えないと workerd の起動自体が失敗する。
          // 受け取ったリクエストは worker/index.test.ts が Authorization 等を検証できるよう
          // そのままエコーせず、最小の JSON を返すだけにする。
          serviceBindings: {
            API: () =>
              new Response(JSON.stringify({ items: [], pageInfo: null }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
          },
        },
      };
    }),
  ],
  test: {
    include: ["worker/**/*.test.ts"],
    setupFiles: ["./worker/test-setup.ts"],
  },
});
