import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreBinaries: ["xdg-open"],
  exclude: ["enumMembers"],
  workspaces: {
    ".": {
      ignoreDependencies: [
        "prettier-plugin-organize-imports", // loaded by prettier via config
      ],
    },
    "packages/viewer": {
      ignoreDependencies: [],
    },
    "packages/scraper": {
      entry: ["**/index.test.ts", "*/index.ts", "tools/**/*.ts"],
      ignoreDependencies: [],
    },
    "packages/shared": {},
    "packages/api": {
      entry: ["test/**/*.ts"],
      // `cloudflare:test` は Workers ランタイムの仮想モジュール（npm パッケージではない）。
      // knip が `cloudflare` パッケージとして誤検出するため無視する。
      ignoreDependencies: ["cloudflare"],
    },
    "packages/mcp-server": {
      entry: ["worker.ts"],
      ignoreBinaries: [],
      ignoreDependencies: [],
    },
  },
};

export default config;
