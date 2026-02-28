import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { worker } from "../test/mocks/browser";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { usePaginatedQuery, type RelayConnection } from "./usePaginatedQuery";

const TEST_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT;
const QUERY = `query ($first: Int, $after: String) { items_connection(first: $first, after: $after) { edges { node { id name } cursor } pageInfo { hasNextPage endCursor } } }`;

type ItemNode = { id: string; name: string };

const makeConnection = (
  items: { id: string; name: string }[],
  hasNextPage: boolean,
  endCursor: string
): { data: { items_connection: RelayConnection<ItemNode> } } => ({
  data: {
    items_connection: {
      edges: items.map((item, i) => ({ node: item, cursor: `cursor-${i}` })),
      pageInfo: { hasNextPage, endCursor },
    },
  },
});

const TestComponent = ({ variables }: { variables: Record<string, unknown> }) => {
  const { data, loading, hasNextPage, fetchMore, fetchingMore } = usePaginatedQuery<
    { items_connection: RelayConnection<ItemNode> },
    ItemNode
  >(QUERY, variables, (d) => d.items_connection);

  return (
    <div>
      {loading && <div>loading</div>}
      {fetchingMore && <div>fetching-more</div>}
      {data?.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
      <button onClick={fetchMore} disabled={!hasNextPage}>
        load more
      </button>
    </div>
  );
};

describe("usePaginatedQuery", () => {
  it("初回ページのデータを返す", async () => {
    worker.use(
      http.post(TEST_ENDPOINT, () => {
        return HttpResponse.json(makeConnection([{ id: "1", name: "Item A" }], true, "cursor-0"));
      })
    );

    renderWithProviders(<TestComponent variables={{ first: 10 }} />);

    await waitFor(() => {
      expect(screen.getByText("Item A")).toBeInTheDocument();
    });
  });

  it("fetchMoreで次のページを追加読み込みする", async () => {
    let callCount = 0;

    worker.use(
      http.post(TEST_ENDPOINT, () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(makeConnection([{ id: "1", name: "Item A" }], true, "cursor-0"));
        }
        return HttpResponse.json(makeConnection([{ id: "2", name: "Item B" }], false, "cursor-1"));
      })
    );

    const { user } = renderWithProviders(<TestComponent variables={{ first: 10 }} />);

    await waitFor(() => {
      expect(screen.getByText("Item A")).toBeInTheDocument();
    });

    await user.click(screen.getByText("load more"));

    await waitFor(() => {
      expect(screen.getByText("Item B")).toBeInTheDocument();
    });

    // Both items should be present
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
  });

  it("hasNextPageがfalseの場合fetchMoreボタンが無効になる", async () => {
    worker.use(
      http.post(TEST_ENDPOINT, () => {
        return HttpResponse.json(makeConnection([{ id: "1", name: "Item A" }], false, "cursor-0"));
      })
    );

    renderWithProviders(<TestComponent variables={{ first: 10 }} />);

    await waitFor(() => {
      expect(screen.getByText("Item A")).toBeInTheDocument();
    });

    expect(screen.getByText("load more")).toBeDisabled();
  });

  it("variablesが変更されるとデータをリセットして再取得する", async () => {
    let capturedVariables: Record<string, unknown> = {};

    worker.use(
      http.post(TEST_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as { variables: Record<string, unknown> };
        capturedVariables = body.variables;
        const name = body.variables.filter === "X" ? "Filtered X" : "All Items";
        return HttpResponse.json(makeConnection([{ id: "1", name }], false, "cursor-0"));
      })
    );

    const { rerender } = renderWithProviders(
      <TestComponent variables={{ first: 10, filter: "X" }} />
    );

    await waitFor(() => {
      expect(screen.getByText("Filtered X")).toBeInTheDocument();
    });

    rerender(<TestComponent variables={{ first: 10, filter: "Y" }} />);

    await waitFor(() => {
      expect(capturedVariables.filter).toBe("Y");
    });
  });
});
