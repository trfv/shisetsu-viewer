import type { Page } from "@shisetsu-viewer/shared";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { apiGet } from "../api/client";
import { worker } from "../test/mocks/browser";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import { usePaginatedQuery } from "./usePaginatedQuery";

const BASE = import.meta.env.VITE_API_ENDPOINT;

type Item = { id: string; name: string };

const makePage = (items: Item[], hasNextPage: boolean, endCursor: string | null): Page<Item> => ({
  items,
  pageInfo: { hasNextPage, endCursor },
});

const TestComponent = ({ queryKey, filter }: { queryKey: string; filter?: string }) => {
  const { data, loading, hasNextPage, fetchMore, fetchingMore } = usePaginatedQuery<Item>(
    (token, cursor) => apiGet(`${BASE}/v1/items`, { cursor, filter }, token),
    queryKey
  );

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
  it("初回ページの items を返す", async () => {
    worker.use(
      http.get(`${BASE}/v1/items`, () =>
        HttpResponse.json(makePage([{ id: "1", name: "Item A" }], true, "cursor-0"))
      )
    );

    await renderWithProviders(<TestComponent queryKey="k" />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
  });

  it("Auth0 ロード中はフェッチしない", async () => {
    let requestCount = 0;
    worker.use(
      http.get(`${BASE}/v1/items`, () => {
        requestCount++;
        return HttpResponse.json(makePage([{ id: "1", name: "Item A" }], false, null));
      })
    );

    await renderWithProviders(<TestComponent queryKey="k" />, {
      auth0Config: { isLoading: true, token: "" },
    });

    await expect.element(screen.getByText("loading")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(requestCount).toBe(0);
    });
  });

  it("fetchMore で次ページを endCursor 付きで追加読み込みする", async () => {
    let secondCursor: string | null = null;
    worker.use(
      http.get(`${BASE}/v1/items`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (!cursor) {
          return HttpResponse.json(makePage([{ id: "1", name: "Item A" }], true, "cursor-0"));
        }
        secondCursor = cursor;
        return HttpResponse.json(makePage([{ id: "2", name: "Item B" }], false, null));
      })
    );

    const { user } = await renderWithProviders(<TestComponent queryKey="k" />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await user.click(screen.getByText("load more"));

    await expect.element(screen.getByText("Item B")).toBeInTheDocument();
    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    expect(secondCursor).toBe("cursor-0");
  });

  it("hasNextPage が false のとき load more ボタンが無効になる", async () => {
    worker.use(
      http.get(`${BASE}/v1/items`, () =>
        HttpResponse.json(makePage([{ id: "1", name: "Item A" }], false, null))
      )
    );

    await renderWithProviders(<TestComponent queryKey="k" />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await expect.element(screen.getByText("load more")).toBeDisabled();
  });

  it("fetchMore 中の重複呼び出しを防止する", async () => {
    let callCount = 0;
    worker.use(
      http.get(`${BASE}/v1/items`, async ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        callCount++;
        if (!cursor) {
          return HttpResponse.json(makePage([{ id: "1", name: "Item A" }], true, "cursor-0"));
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json(makePage([{ id: "2", name: "Item B" }], false, null));
      })
    );

    const { user } = await renderWithProviders(<TestComponent queryKey="k" />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await user.click(screen.getByText("load more"));
    await user.click(screen.getByText("load more"));

    await expect.element(screen.getByText("Item B")).toBeInTheDocument();
    expect(callCount).toBe(2);
  });

  it("key が変わるとデータをリセットして再取得する", async () => {
    let capturedFilter: string | null = null;
    worker.use(
      http.get(`${BASE}/v1/items`, ({ request }) => {
        const filter = new URL(request.url).searchParams.get("filter");
        capturedFilter = filter;
        const name = filter === "X" ? "Filtered X" : "Filtered Y";
        return HttpResponse.json(makePage([{ id: "1", name }], false, null));
      })
    );

    const { rerender } = await renderWithProviders(<TestComponent queryKey="X" filter="X" />);

    await expect.element(screen.getByText("Filtered X")).toBeInTheDocument();

    await rerender(<TestComponent queryKey="Y" filter="Y" />);

    await vi.waitFor(() => {
      expect(capturedFilter).toBe("Y");
    });
  });
});
