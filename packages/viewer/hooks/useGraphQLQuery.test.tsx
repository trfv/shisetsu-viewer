import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { worker } from "../test/mocks/browser";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { useGraphQLQuery } from "./useGraphQLQuery";

const TEST_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT;
const QUERY = `query { items { id name } }`;

const TestComponent = ({
  query,
  variables,
}: {
  query: string;
  variables: Record<string, unknown>;
}) => {
  const { data, loading, error } = useGraphQLQuery<{ items: { id: string; name: string }[] }>(
    query,
    variables
  );

  if (loading) return <div>loading</div>;
  if (error) return <div>error: {error.message}</div>;
  return (
    <div>
      {data?.items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};

describe("useGraphQLQuery", () => {
  it("初期状態でloading=trueを返す", async () => {
    worker.use(
      http.post(TEST_ENDPOINT, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ data: { items: [] } });
      })
    );

    renderWithProviders(<TestComponent query={QUERY} variables={{}} />);

    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("フェッチ成功後にdataを返す", async () => {
    worker.use(
      http.post(TEST_ENDPOINT, () => {
        return HttpResponse.json({
          data: { items: [{ id: "1", name: "Item A" }] },
        });
      })
    );

    renderWithProviders(<TestComponent query={QUERY} variables={{}} />);

    await waitFor(() => {
      expect(screen.getByText("Item A")).toBeInTheDocument();
    });
  });

  it("エラー時にerrorを返す", async () => {
    worker.use(
      http.post(TEST_ENDPOINT, () => {
        return HttpResponse.json({
          errors: [{ message: "Something went wrong" }],
        });
      })
    );

    renderWithProviders(<TestComponent query={QUERY} variables={{}} />);

    await waitFor(() => {
      expect(screen.getByText("error: Something went wrong")).toBeInTheDocument();
    });
  });
});
