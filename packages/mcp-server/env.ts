const graphqlEndpoint = process.env["GRAPHQL_ENDPOINT"];
const auth0Domain = process.env["AUTH0_DOMAIN"];
const auth0ClientId = process.env["AUTH0_CLIENT_ID"];
const auth0ClientSecret = process.env["AUTH0_CLIENT_SECRET"];
const auth0Audience = process.env["AUTH0_AUDIENCE"];

if (!graphqlEndpoint) throw new Error("GRAPHQL_ENDPOINT is required");
if (!auth0Domain) throw new Error("AUTH0_DOMAIN is required");
if (!auth0ClientId) throw new Error("AUTH0_CLIENT_ID is required");
if (!auth0ClientSecret) throw new Error("AUTH0_CLIENT_SECRET is required");
if (!auth0Audience) throw new Error("AUTH0_AUDIENCE is required");

export const GRAPHQL_ENDPOINT: string = graphqlEndpoint;
export const AUTH0_DOMAIN: string = auth0Domain;
export const AUTH0_CLIENT_ID: string = auth0ClientId;
export const AUTH0_CLIENT_SECRET: string = auth0ClientSecret;
export const AUTH0_AUDIENCE: string = auth0Audience;
