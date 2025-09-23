import { test, expect } from "@playwright/test";

test.describe("Shisetsu Viewer Application", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    // ページタイトルが存在することを確認
    await expect(page).toHaveTitle(/施設|Shisetsu/i);
  });

  test("displays main content", async ({ page }) => {
    // メインコンテンツエリアが表示されることを確認
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // 主要な見出しが表示されることを確認
    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();
  });

  test("has proper heading structure", async ({ page }) => {
    // h2見出しが存在することを確認
    const h2Headings = page.locator("h2");
    await expect(h2Headings).toHaveCount(4);

    // 特定の見出しが存在することを確認
    await expect(page.locator("h2#introduction")).toBeVisible();
    await expect(page.locator("h2#features")).toBeVisible();
    await expect(page.locator("h2#supported-municipalities")).toBeVisible();
    await expect(page.locator("h2#notes")).toBeVisible();
  });

  test("displays supported municipalities", async ({ page }) => {
    // 対応地区のリストが表示されることを確認
    const municipalityList = page.locator("ul").filter({ hasText: "荒川区" });
    await expect(municipalityList).toBeVisible();

    // いくつかの地区が表示されていることを確認
    await expect(page.locator("text=荒川区")).toBeVisible();
    await expect(page.locator("text=北区")).toBeVisible();
    await expect(page.locator("text=江東区")).toBeVisible();
  });

  test("displays copyright information", async ({ page }) => {
    // 著作権表示が存在することを確認
    const copyright = page.locator("text=Copyright");
    await expect(copyright).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("page should be accessible by keyboard", async ({ page }) => {
    await page.goto("/");

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState("networkidle");

    // body要素にフォーカスを設定
    await page.locator("body").focus();

    // Tabキーでナビゲーション可能であることを確認
    await page.keyboard.press("Tab");

    // 少し待機
    await page.waitForTimeout(100);

    // フォーカスされた要素が存在することを確認
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test("has proper semantic HTML structure", async ({ page }) => {
    await page.goto("/");

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState("networkidle");

    // mainランドマークが存在することを確認
    await expect(page.locator("main")).toBeVisible();

    // 見出しの階層構造が適切であることを確認
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

    // モバイルビューでもメインコンテンツが表示されることを確認
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // 見出しが表示されることを確認
    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();

    // コンテンツがビューポート内に収まっていることを確認
    const viewportSize = page.viewportSize();
    const mainBox = await main.boundingBox();

    if (mainBox && viewportSize) {
      expect(mainBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });
});
