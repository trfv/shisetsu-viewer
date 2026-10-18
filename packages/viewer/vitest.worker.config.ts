import { randomBytes } from "node:crypto";

import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// 固定値を書くと gitleaks が秘密情報として検出する。
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
        // service binding "API" はローカルに実体が無く、スタブが無いと workerd が起動しない。
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
