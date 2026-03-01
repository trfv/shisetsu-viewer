import { graphqlRequest } from "./graphqlClient.ts";

const VALIDATE_TOKEN_QUERY = `
query validateApiToken($tokenHash: String!) {
  api_tokens_connection(where: { token_hash: { _eq: $tokenHash } }, first: 1) {
    edges {
      node {
        id
        expires_at
      }
    }
  }
}`;

const UPDATE_LAST_USED_MUTATION = `
mutation updateLastUsed($id: uuid!, $now: timestamptz!) {
  update_api_tokens_by_pk(pk_columns: { id: $id }, _set: { last_used_at: $now }) {
    id
  }
}`;

interface ValidateTokenResult {
  api_tokens_connection: {
    edges: Array<{ node: { id: string; expires_at: string | null } }>;
  };
}

async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateApiToken(token: string): Promise<boolean> {
  const hash = await sha256(token);
  const result = await graphqlRequest<ValidateTokenResult>(VALIDATE_TOKEN_QUERY, {
    tokenHash: hash,
  });

  const record = result.api_tokens_connection.edges[0]?.node;
  if (!record) return false;

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return false;
  }

  // Update last_used_at (fire and forget)
  graphqlRequest(UPDATE_LAST_USED_MUTATION, {
    id: record.id,
    now: new Date().toISOString(),
  }).catch(() => {});

  return true;
}
