import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { worker } from "../test/mocks/browser";
import { graphqlQuery } from "./graphqlClient";

const TEST_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT;
const TEST_QUERY = `query { institutions_connection { edges { node { id } } } }`;

describe("graphqlQuery", () => {
  it("クエリとvariablesでPOSTリクエストを送信する", async () => {
    let capturedBody: unknown;
    let capturedHeaders: Headers;

    worker.use(
      http.post(TEST_ENDPOINT, async ({ request }) => {
        capturedHeaders = request.headers;
        capturedBody = await request.json();
        return HttpResponse.json({ data: { result: "ok" } });
      })
    );

    await graphqlQuery(TEST_QUERY, { first: 10 });

    expect(capturedBody).toEqual({ query: TEST_QUERY, variables: { first: 10 } });
    expect(capturedHeaders!.get("Content-Type")).toBe("application/json");
  });

  it("トークンがある場合Authorizationヘッダーを含む", async () => {
    let capturedHeaders: Headers;

    worker.use(
      http.post(TEST_ENDPOINT, async ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json({ data: { result: "ok" } });
      })
    );

    await graphqlQuery(TEST_QUERY, {}, "my-token");

    expect(capturedHeaders!.get("Authorization")).toBe("Bearer my-token");
  });

  it("トークンがない場合Authorizationヘッダーを含まない", async () => {
    let capturedHeaders: Headers;

    worker.use(
      http.post(TEST_ENDPOINT, async ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json({ data: { result: "ok" } });
      })
    );

    await graphqlQuery(TEST_QUERY, {});

    expect(capturedHeaders!.get("Authorization")).toBeNull();
  });

  it("成功時にdataを返す", async () => {
    const mockData = { institutions_connection: { edges: [] } };

    worker.use(
      http.post(TEST_ENDPOINT, () => {
        return HttpResponse.json({ data: mockData });
      })
    );

    const result = await graphqlQuery(TEST_QUERY, {});

    expect(result).toEqual(mockData);
  });

  it("GraphQLエラー時にエラーをスローする", async () => {
    worker.use(
      http.post(TEST_ENDPOINT, () => {
        return HttpResponse.json({
          errors: [{ message: "Field 'foo' not found" }],
        });
      })
    );

    await expect(graphqlQuery(TEST_QUERY, {})).rejects.toThrow("Field 'foo' not found");
  });
});
