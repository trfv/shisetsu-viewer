import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
    css: true,
    exclude: ["node_modules", "e2e/**", "playwright-*/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "test/",
        "*.config.ts",
        "*.config.js",
        "*.stories.tsx",
        "api/graphql-client.tsx",
        "storybook-static/",
        ".storybook/",
        "dist/",
        "coverage/",
        "**/*.d.ts",
        "**/index.ts",
        "**/main.tsx",
      ],
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 70,
        statements: 70,
      },
      watermarks: {
        statements: [70, 85],
        functions: [60, 80],
        branches: [60, 80],
        lines: [70, 85],
      },
    },
    reporters: ["default"],
    outputFile: {
      json: "./test-results/results.json",
      html: "./test-results/index.html",
    },
  },
});
