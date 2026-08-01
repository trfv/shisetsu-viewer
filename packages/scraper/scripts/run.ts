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
  const uploadArgs = ["tools/updateReservations.ts"];
  if (municipality) uploadArgs.push(municipality);
  execFileSync("node", uploadArgs, { stdio: "inherit" });
}

if (testsFailed) {
  process.exit(1);
}
