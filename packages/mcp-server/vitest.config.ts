import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": new URL("./test/cloudflareWorkersStub.ts", import.meta.url).pathname,
    },
  },
  // node_modules は外部化されて alias が効かないため、cloudflare:workers を import する依存だけ取り込む
  test: { server: { deps: { inline: ["@cloudflare/workers-oauth-provider"] } } },
});
