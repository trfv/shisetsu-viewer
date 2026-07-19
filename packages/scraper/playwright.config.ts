import { defineConfig } from "@playwright/test";
import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";

const isCI = !!process.env.CI;

// GitHub Actions から遮断されている自治体（registry の scraperViaJpProxy）向けに、
// scrape アクションが対象ジョブでのみ設定する。未設定なら従来どおり直接続。
const scraperProxy = process.env["SCRAPER_PROXY"];

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
    ...(scraperProxy ? { proxy: { server: scraperProxy } } : {}),
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
        "--start-maximized",
        // SCRAPER_PROXY 未設定時は直接続を強制する（proxy 利用時は use.proxy に任せる）
        ...(scraperProxy ? [] : ["--proxy-bypass-list=*", '--proxy-server="direct://"']),
      ],
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 100,
    },
    trace: process.env.CI ? "off" : "on-first-retry",
  },
  testMatch: ["**/index.test.ts"],
  testIgnore: isCI ? ciExcludedTargets.map((target) => `**/${target}/**`) : [],
});
