async function globalTeardown() {
  console.log("🧹 Starting global teardown...");

  try {
    // Clean up test data, close connections, etc.
    // This could include:
    // - Cleaning up test database records
    // - Closing external service connections
    // - Removing temporary files

    console.log("✅ Global teardown completed successfully");
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
    // Don't throw the error to avoid masking test failures
  }
}

export default globalTeardown;
