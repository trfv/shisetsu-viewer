import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreBinaries: ["open", "xdg-open"],
  exclude: ["enumMembers"],
  workspaces: {
    ".": {
      ignoreDependencies: [
        "prettier-plugin-organize-imports", // loaded by prettier via config
      ],
    },
    "packages/viewer": {
      ignoreDependencies: [
        "@swc/core", // used internally by @vitejs/plugin-react-swc
        "dotenv", // used via --require dotenv/config in generate script
      ],
    },
    "packages/scraper": {
      entry: ["**/index.test.ts", "*/index.ts", "tools/**/*.ts"],
      ignoreDependencies: [],
    },
    "packages/shared": {},
    "packages/mcp-server": {
      entry: ["worker.ts"],
      ignoreBinaries: [],
      ignoreDependencies: [],
    },
  },
};

export default config;
