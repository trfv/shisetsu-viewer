import type { Page } from "@shisetsu-viewer/shared";
import { http, HttpResponse } from "msw";
import { Suspense, useCallback } from "react";
import { describe, expect, it } from "vitest";

import { apiGet } from "../api/client";
import { worker } from "../test/mocks/browser";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import { usePages } from "./usePages";

const BASE = "/api";

type Item = { id: string; name: string };

const makePage = (items: Item[], hasNextPage: boolean, endCursor: string | null): Page<Item> => ({
  items,
  pageInfo: { hasNextPage, endCursor },
});

const Items = ({ filter }: { filter: string }) => {
  const fetchPage = useCallback(
    (cursor: string | null) => apiGet<Page<Item>>(`${BASE}/v1/items`, { cursor, filter }),
    [filter]
  );
  const { items, hasNextPage, fetchMore, fetchingMore } = usePages(`items:${filter}`, fetchPage);

  return (
    <div>
      {fetchingMore && <div>fetching-more</div>}
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
      <button onClick={fetchMore} disabled={!hasNextPage}>
        load more
      </button>
    </div>
  );
};

const TestComponent = ({ filter = "X" }: { filter?: string }) => (
  <Suspense fallback={<div>loading</div>}>
    <Items key={filter} filter={filter} />
  </Suspense>
);

describe("usePages", () => {
  it("取得中は Suspense の fallback を表示する", async () => {
    worker.use(
      http.get(`${BASE}/v1/items`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json(makePage([{ id: "1", name: "Item A" }], false, null));
      })
    );

    await renderWithProviders(<TestComponent />);

    await expect.element(screen.getByText("loading")).toBeInTheDocument();
    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
  });

  it("fetchMore で次ページを endCursor 付きで後ろに足す", async () => {
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

    const { user } = await renderWithProviders(<TestComponent />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await user.click(screen.getByText("load more"));

    await expect.element(screen.getByText("Item B")).toBeInTheDocument();
    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    expect(secondCursor).toBe("cursor-0");
  });

  it("次ページの取得中も既存の行を表示したままにする", async () => {
    worker.use(
      http.get(`${BASE}/v1/items`, async ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (!cursor) {
          return HttpResponse.json(makePage([{ id: "1", name: "Item A" }], true, "cursor-0"));
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json(makePage([{ id: "2", name: "Item B" }], false, null));
      })
    );

    const { user } = await renderWithProviders(<TestComponent />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await user.click(screen.getByText("load more"));

    await expect.element(screen.getByText("fetching-more")).toBeInTheDocument();
    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await expect.element(screen.getByText("loading")).not.toBeInTheDocument();
    await expect.element(screen.getByText("Item B")).toBeInTheDocument();
  });

  it("hasNextPage が false のとき load more ボタンが無効になる", async () => {
    worker.use(
      http.get(`${BASE}/v1/items`, () =>
        HttpResponse.json(makePage([{ id: "1", name: "Item A" }], false, null))
      )
    );

    await renderWithProviders(<TestComponent />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await expect.element(screen.getByText("load more")).toBeDisabled();
  });

  it("同じ cursor で fetchMore を続けて呼んでも 1 回しか取得しない", async () => {
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

    const { user } = await renderWithProviders(<TestComponent />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await user.click(screen.getByText("load more"));
    await user.click(screen.getByText("load more"));

    await expect.element(screen.getByText("Item B")).toBeInTheDocument();
    expect(callCount).toBe(2);
  });

  it("key が変わると 1 ページ目から取り直す", async () => {
    worker.use(
      http.get(`${BASE}/v1/items`, ({ request }) => {
        const filter = new URL(request.url).searchParams.get("filter");
        return HttpResponse.json(makePage([{ id: "1", name: `Filtered ${filter}` }], false, null));
      })
    );

    const { rerender } = await renderWithProviders(<TestComponent filter="X" />);
    await expect.element(screen.getByText("Filtered X")).toBeInTheDocument();

    await rerender(<TestComponent filter="Y" />);

    await expect.element(screen.getByText("Filtered Y")).toBeInTheDocument();
    await expect.element(screen.getByText("Filtered X")).not.toBeInTheDocument();
  });
});
