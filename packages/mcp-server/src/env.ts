const apiEndpoint = process.env["API_ENDPOINT"];
const adminApiKey = process.env["ADMIN_API_KEY"];

if (!apiEndpoint) throw new Error("API_ENDPOINT is required");
if (!adminApiKey) throw new Error("ADMIN_API_KEY is required");

export const API_ENDPOINT: string = apiEndpoint;
export const ADMIN_API_KEY: string = adminApiKey;
