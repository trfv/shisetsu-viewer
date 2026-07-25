import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { apiGet } from "../api/client";
import { worker } from "../test/mocks/browser";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import { useApiQuery } from "./useApiQuery";

const BASE = import.meta.env.VITE_API_ENDPOINT;

const TestComponent = ({
  fetcher,
  queryKey,
}: {
  fetcher: (token: string) => Promise<{ name: string }>;
  queryKey: string;
}) => {
  const { data, loading, error } = useApiQuery(fetcher, queryKey);

  if (loading) return <div>loading</div>;
  if (error) return <div>error: {error.message}</div>;
  return <div>{data?.name}</div>;
};

describe("useApiQuery", () => {
  it("初期状態で loading=true を返す", async () => {
    worker.use(
      http.get(`${BASE}/v1/x`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ name: "A" });
      })
    );

    await renderWithProviders(
      <TestComponent fetcher={(token) => apiGet(`${BASE}/v1/x`, {}, token)} queryKey="x" />
    );

    await expect.element(screen.getByText("loading")).toBeInTheDocument();
  });

  it("フェッチ成功後に data を返す", async () => {
    worker.use(http.get(`${BASE}/v1/x`, () => HttpResponse.json({ name: "Item A" })));

    await renderWithProviders(
      <TestComponent fetcher={(token) => apiGet(`${BASE}/v1/x`, {}, token)} queryKey="x" />
    );

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
  });

  it("Auth0 ロード中はフェッチしない", async () => {
    let requestCount = 0;
    worker.use(
      http.get(`${BASE}/v1/x`, () => {
        requestCount++;
        return HttpResponse.json({ name: "A" });
      })
    );

    await renderWithProviders(
      <TestComponent fetcher={(token) => apiGet(`${BASE}/v1/x`, {}, token)} queryKey="x" />,
      { auth0Config: { isLoading: true, token: "" } }
    );

    await expect.element(screen.getByText("loading")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(requestCount).toBe(0);
    });
  });

  it("エラー時に error を返す", async () => {
    worker.use(http.get(`${BASE}/v1/x`, () => HttpResponse.json({}, { status: 500 })));

    await renderWithProviders(
      <TestComponent fetcher={(token) => apiGet(`${BASE}/v1/x`, {}, token)} queryKey="x" />
    );

    await expect.element(screen.getByText(/error: /)).toBeInTheDocument();
  });

  it("認証済みトークンを fetcher に渡す", async () => {
    let auth: string | null = null;
    worker.use(
      http.get(`${BASE}/v1/secure`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ name: "secure" });
      })
    );

    await renderWithProviders(
      <TestComponent
        fetcher={(token) => apiGet(`${BASE}/v1/secure`, {}, token)}
        queryKey="secure"
      />,
      { auth0Config: { isLoading: false, token: "tok-42" } }
    );

    await expect.element(screen.getByText("secure")).toBeInTheDocument();
    expect(auth).toBe("Bearer tok-42");
  });
});
