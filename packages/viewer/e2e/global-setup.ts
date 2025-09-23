import { chromium } from "@playwright/test";

async function globalSetup() {
  console.log("🚀 Starting global setup...");

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    console.log("⏳ Waiting for dev server to be ready...");
    await page.goto("http://localhost:3000", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Verify the app is working
    const title = await page.title();
    console.log(`✅ App is ready with title: ${title}`);

    // Optionally seed test data or authenticate
    // This could include:
    // - Creating test users
    // - Seeding database with test data
    // - Setting up test environment variables

    // Example: Set up authentication state if needed
    // await authenticateTestUser(page);

    console.log("✅ Global setup completed successfully");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
