import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const testOnly = args.includes("--test-only");
const filteredArgs = args.filter((arg) => arg !== "--test-only");
const municipality = filteredArgs[0];

const playwrightArgs = ["playwright", "test"];
if (municipality) {
  playwrightArgs.push(municipality);
}
if (process.env.WORKERS) {
  playwrightArgs.push(`--workers=${process.env.WORKERS}`);
}

console.log(`Running: npx ${playwrightArgs.join(" ")}`);
execFileSync("npx", playwrightArgs, { stdio: "inherit" });

if (!testOnly) {
  const uploadArgs = ["tools/updateReservations.ts"];
  if (municipality) {
    uploadArgs.push(municipality);
  }
  console.log(`Running: node ${uploadArgs.join(" ")}`);
  execFileSync("node", uploadArgs, { stdio: "inherit" });
}
