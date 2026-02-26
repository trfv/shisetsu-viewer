import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["web-vitals", "@apollo/client/react", "@mui/icons-material/OpenInNew"],
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      instances: [
        {
          browser: "chromium",
        },
      ],
      provider: playwright(),
      headless: true,
    },
    setupFiles: ["./test/browser-setup.ts"],
    css: true,
    exclude: ["node_modules", "e2e/**", "playwright-*/**"],
    silent: true,
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
  define: {
    global: "window",
  },
});
