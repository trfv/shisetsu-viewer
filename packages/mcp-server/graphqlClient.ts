import { getM2MToken } from "./m2mToken.ts";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let _endpoint = "";

export function configureGraphQL(endpoint: string): void {
  _endpoint = endpoint;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error && error.message.startsWith("HTTP error!")) {
    const status = Number(error.message.match(/status: (\d+)/)?.[1]);
    return status >= 500;
  }
  return !(error instanceof Error && error.message.startsWith("GraphQL errors:"));
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getM2MToken()}`,
      };

      const response = await fetch(_endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as { data: T; errors?: unknown[] };

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}
