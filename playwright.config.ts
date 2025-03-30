import { defineConfig } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  tsconfig: "./tsconfig.json",
  /* Directory to search for tests */
  testDir: "./packages/scraper",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : undefined,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Timeout setting. See https://playwright.dev/docs/test-timeouts */
  timeout: process.env.CI ? 60 * 60 * 1000 : 15 * 60 * 1000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
    /* Launch setting.. See https://playwright.dev/docs/api/class-browsertype#browser-type-launch. */
    launchOptions: {
      args: [
        "--disable-application-cache",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-images",
        "--ignore-certificate-errors",
        "--proxy-bypass-list=*",
        '--proxy-server="direct://"',
        "--start-maximized",
      ],
      slowMo: 500,
    },
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? "off" : "on-first-retry",
  },
});
