import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreBinaries: ["open", "playwright"],
  exclude: ["enumMembers"],
  workspaces: {
    ".": {
      ignoreDependencies: [
        "@mizchi/lsmcp", // MCP server (external dev tool, not imported)
        "prettier-plugin-organize-imports", // loaded by prettier via config
      ],
    },
    "packages/viewer": {
      ignoreDependencies: [
        "@shisetsu-viewer/shared", // workspace dependency resolved by npm workspaces
        "@swc/core", // used internally by @vitejs/plugin-react-swc
        "@vitest/browser", // required for vitest browser mode (test.browser.enabled)
        "dotenv", // used via --require dotenv/config in generate script
        "esbuild", // used internally by vite for dependency pre-bundling
      ],
    },
    "packages/scraper": {
      entry: ["**/index.test.ts", "scripts/run.ts", "tools/*.ts"],
      ignoreDependencies: [
        "@shisetsu-viewer/shared", // workspace dependency resolved by npm workspaces
      ],
    },
    "packages/shared": {
      entry: ["registry.test.ts"],
      ignoreDependencies: [
        "vitest", // provided by root workspace
      ],
    },
  },
};

export default config;
