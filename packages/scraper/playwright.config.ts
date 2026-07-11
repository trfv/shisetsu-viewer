import { defineConfig } from "@playwright/test";
import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";

const isCI = !!process.env.CI;

// CI 除外の単一ソースは registry の scraperCiExcluded。
// SCRAPER_FORCE_INCLUDE（カンマ区切りの target 名）で個別解除できる —
// workflow_dispatch では対象自治体を渡し、除外中でも実サイト検証を可能にする。
const forceInclude = (process.env["SCRAPER_FORCE_INCLUDE"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ciExcludedTargets = Object.values<MunicipalityConfig>(MUNICIPALITIES)
  .filter((m) => m.scraperCiExcluded)
  .map((m) => `${m.prefecture}-${m.slug}`)
  .filter((target) => !forceInclude.includes(target));

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  tsconfig: "./tsconfig.json",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 3 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : isCI ? 1 : 4,
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
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 100,
    },
    trace: process.env.CI ? "off" : "on-first-retry",
  },
  testMatch: ["**/index.test.ts"],
  testIgnore: isCI ? ciExcludedTargets.map((target) => `**/${target}/**`) : [],
});
