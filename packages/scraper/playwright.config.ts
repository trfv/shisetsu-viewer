import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  tsconfig: "./tsconfig.json",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 3 : 0,
  workers: isCI ? 1 : 4,
  reporter: isCI ? "html" : "line",
  timeout: isCI ? 60 * 60 * 1000 : 15 * 60 * 1000,
  use: {
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
    launchOptions: {
      args: [
        "--disable-application-cache",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-images",
        "--disable-sync",
        "--disable-translate",
        "--ignore-certificate-errors",
        "--no-first-run",
        "--proxy-bypass-list=*",
        '--proxy-server="direct://"',
        "--start-maximized",
      ],
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 500,
    },
    trace: process.env.CI ? "off" : "on-first-retry",
  },
  testMatch: ["**/index.test.ts"],
  testIgnore: isCI ? ["**/tokyo-sumida/**"] : [],
});
