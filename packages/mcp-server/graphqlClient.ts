import { getM2MToken } from "./m2mToken.ts";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * GraphQL クライアント。
 *
 * エンドポイントとトークンは必ずインスタンスに閉じ込め、モジュールスコープには置かない。
 * Cloudflare Workers の isolate は複数リクエストを並行処理し、`await` のたびに他リクエストへ
 * 制御が移るため、モジュール変数に持たせると全ユーザー共有のグローバルになる。
 * 実際に worker.ts がリクエストごとに上書きしており、ユーザー間でトークンが混線していた。
 */
export interface GraphQLClient {
  request<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error && error.message.startsWith("HTTP error!")) {
    const status = Number(error.message.match(/status: (\d+)/)?.[1]);
    return status >= 500;
  }
  return !(error instanceof Error && error.message.startsWith("GraphQL errors:"));
}

/**
 * @param endpoint GraphQL エンドポイント
 * @param bearerToken 転送するユーザートークン。省略時は Auth0 M2M トークンにフォールバックする
 *   （stdio / CLI 用。Workers では必ず呼び出し元のトークンを渡すこと）
 */
export function createGraphQLClient(endpoint: string, bearerToken?: string): GraphQLClient {
  return {
    async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
      let lastError: unknown;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearerToken || (await getM2MToken())}`,
          };

          const response = await fetch(endpoint, {
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
    },
  };
}
