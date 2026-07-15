import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const testOnly = args.includes("--test-only");
const filteredArgs = args.filter((arg) => arg !== "--test-only");
const municipality = filteredArgs[0];

const playwrightArgs = ["playwright", "test"];
if (municipality) playwrightArgs.push(municipality);
if (process.env.WORKERS) playwrightArgs.push(`--workers=${process.env.WORKERS}`);

let testsFailed = false;

try {
  execFileSync("npx", playwrightArgs, { stdio: "inherit" });
} catch {
  testsFailed = true;
  console.error("Some tests failed. Will attempt to upload successful results.");
}

if (!testOnly) {
  if (!process.env.M2M_TOKEN) {
    console.log("M2M_TOKEN not set, fetching from Auth0...");
    const { fetchM2MToken } = await import("../tools/m2mAuth.ts");
    try {
      process.env.M2M_TOKEN = await fetchM2MToken();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
    console.log("M2M_TOKEN fetched successfully.");
  }

  const uploadArgs = ["tools/updateReservations.ts"];
  if (municipality) uploadArgs.push(municipality);
  execFileSync("node", uploadArgs, { stdio: "inherit" });
}

if (testsFailed) {
  process.exit(1);
}
