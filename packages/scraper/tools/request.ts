import { getM2MToken, resetTokenCache } from "./m2mToken.ts";

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT as string;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isRetryable(error: unknown): boolean {
  if (error instanceof Error && error.message.startsWith("HTTP error!")) {
    const status = Number(error.message.match(/status: (\d+)/)?.[1]);
    return status >= 500 || status === 401;
  }
  return !(error instanceof Error && error.message.startsWith("GraphQL errors:"));
}

/**
 * Execute a GraphQL request using fetch API with retry for transient failures.
 */
export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getM2MToken()}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
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
        if (error instanceof Error && error.message.includes("status: 401")) {
          resetTokenCache();
        }
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}
