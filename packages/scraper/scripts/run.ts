import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const testOnly = args.includes("--test-only");
const filteredArgs = args.filter((arg) => arg !== "--test-only");
const municipality = filteredArgs[0];

const playwrightArgs = ["playwright", "test"];
if (municipality) playwrightArgs.push(municipality);
if (process.env.WORKERS) playwrightArgs.push(`--workers=${process.env.WORKERS}`);

execFileSync("npx", playwrightArgs, { stdio: "inherit" });

if (!testOnly) {
  if (!process.env.M2M_TOKEN) {
    const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE } = process.env;
    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET || !AUTH0_AUDIENCE) {
      console.error(
        "Missing required environment variables: set M2M_TOKEN, or AUTH0_DOMAIN + AUTH0_CLIENT_ID + AUTH0_CLIENT_SECRET + AUTH0_AUDIENCE"
      );
      process.exit(1);
    }
    console.log("M2M_TOKEN not set, fetching from Auth0...");
    const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: AUTH0_AUDIENCE,
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) {
      console.error(`Auth0 token fetch failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const { access_token } = (await res.json()) as { access_token: string };
    process.env.M2M_TOKEN = access_token;
    console.log("M2M_TOKEN fetched successfully.");
  }

  const uploadArgs = ["tools/updateReservations.ts"];
  if (municipality) uploadArgs.push(municipality);
  execFileSync("node", uploadArgs, { stdio: "inherit" });
}
