import { test, expect } from "@playwright/test";

test.describe("Shisetsu Viewer Application", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/施設|Shisetsu/i);
  });

  test("displays main content", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible();

    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();
  });

  test("has proper heading structure", async ({ page }) => {
    const h2Headings = page.locator("h2");
    await expect(h2Headings).toHaveCount(5);

    await expect(page.locator("h2#introduction")).toBeVisible();
    await expect(page.locator("h2#features")).toBeVisible();
    await expect(page.locator("h2#ai-integration")).toBeVisible();
    await expect(page.locator("h2#supported-municipalities")).toBeVisible();
    await expect(page.locator("h2#notes")).toBeVisible();
  });

  test("displays supported municipalities", async ({ page }) => {
    const municipalityList = page.locator("ul").filter({ hasText: "荒川区" });
    await expect(municipalityList).toBeVisible();

    await expect(page.locator("text=荒川区")).toBeVisible();
    await expect(page.locator("text=北区")).toBeVisible();
    await expect(page.locator("text=江東区")).toBeVisible();
  });

  test("displays copyright information", async ({ page }) => {
    const copyright = page.locator("text=Copyright");
    await expect(copyright).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("page should be accessible by keyboard", async ({ page }) => {
    await page.goto("/");

    await page.waitForLoadState("networkidle");

    await page.locator("body").focus();

    await page.keyboard.press("Tab");

    await page.waitForTimeout(100);

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test("has proper semantic HTML structure", async ({ page }) => {
    await page.goto("/");

    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toBeVisible();

    await page.waitForSelector("h2");
    const h2Count = await page.locator("h2").count();

    await page.waitForSelector("h3");
    const h3Count = await page.locator("h3").count();

    expect(h2Count).toBeGreaterThan(0);
    expect(h3Count).toBeGreaterThan(0);
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test("should display content on mobile viewport", async ({ page }) => {
    await page.goto("/");

    const main = page.locator("main");
    await expect(main).toBeVisible();

    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();

    const viewportSize = page.viewportSize();
    const mainBox = await main.boundingBox();

    if (mainBox && viewportSize) {
      expect(mainBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });

  test("should show hamburger menu on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const menuButton = page.getByRole("button", { name: "メニュー" });
    await expect(menuButton).toBeVisible();
  });
});

test.describe("Institution Search Page", () => {
  test("displays search form or error state", async ({ page }) => {
    await page.goto("/institution");
    await page.waitForLoadState("networkidle");

    const searchButton = page.getByRole("button", { name: "絞り込み" });
    const errorMessage = page.locator("text=予期せぬエラーが発生しました");
    await expect(searchButton.or(errorMessage)).toBeVisible();
  });
});

test.describe("Detail Page", () => {
  test("redirects to top on invalid UUID", async ({ page }) => {
    await page.goto("/institution/invalid-uuid");

    await page.waitForURL("/");
    expect(page.url()).toContain("/");
  });
});

test.describe("Navigation", () => {
  test("navigate from top to institution search", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const institutionLink = page.locator('a[href="/institution"]').first();
    await expect(institutionLink).toBeVisible();
    await institutionLink.click();

    await page.waitForURL("/institution");
    expect(page.url()).toContain("/institution");
  });
});

test.describe("Color Mode", () => {
  test("toggle changes theme", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsButton = page.getByRole("button", { name: "設定" });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    const themeOption = page.getByRole("menuitemradio", { name: "ライト" });
    await expect(themeOption).toBeVisible();
    await themeOption.click();

    await expect(themeOption).toHaveAttribute("aria-checked", "true");
  });
});
