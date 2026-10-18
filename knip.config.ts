import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreBinaries: ["xdg-open"],
  exclude: ["enumMembers"],
  workspaces: {
    ".": {
      ignoreDependencies: [],
    },
    "packages/viewer": {
      // `cloudflare:test`（Workers の仮想モジュール）を knip が `cloudflare` パッケージと誤検出する
      ignoreDependencies: ["cloudflare"],
    },
    "packages/factory": {
      entry: ["src/cli/*.ts"],
    },
    "packages/scraper": {
      entry: ["**/index.test.ts", "*/index.ts", "scripts/*.ts", "tools/**/*.ts"],
      ignoreDependencies: [],
    },
    "packages/shared": {
      // Auth0 の Post Login Action の原本。管理画面に貼って使い、テストからは createRequire で読む
      entry: ["auth0PostLogin.cjs"],
    },
    "packages/api": {
      entry: ["test/**/*.ts"],
      // `cloudflare:test`（Workers の仮想モジュール）を knip が `cloudflare` パッケージと誤検出する
      ignoreDependencies: ["cloudflare"],
    },
    "packages/mcp-server": {
      // worker は wrangler.jsonc の main、stdio と cli は package.json の scripts から辿られる
      entry: [],
      ignoreBinaries: [],
      ignoreDependencies: [],
    },
  },
};

export default config;
