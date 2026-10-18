import { randomBytes } from "node:crypto";

import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// テスト用の暗号化鍵。実行のたびに作る（固定値を書くと gitleaks が秘密情報として検出する）。
const TEST_SESSION_KEY = randomBytes(32).toString("base64url");

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          AUTH0_CLIENT_ID: "test-client-id",
          AUTH0_CLIENT_SECRET: "test-secret",
          SESSION_KEYS: JSON.stringify([TEST_SESSION_KEY]),
        },
        // wrangler.jsonc の service binding "API" はローカルに実体が無いため、
        // スタブを与えないと workerd の起動自体が失敗する。受け取った Authorization と
        // CF-Connecting-IP をそのまま返し、worker/index.test.ts が転送内容を検証できるようにする。
        serviceBindings: {
          API: (request: Request) =>
            new Response(
              JSON.stringify({
                path: new URL(request.url).pathname,
                authorization: request.headers.get("Authorization"),
              }),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "private, no-store",
                },
              }
            ),
        },
      },
    }),
  ],
  test: {
    include: ["worker/**/*.test.ts"],
  },
});
