import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHttpDataSource } from "./httpDataSource.ts";

const ENDPOINT = "https://api.example.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createHttpDataSource", () => {
  it("builds the institutions query with comma-joined and boolean params", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], pageInfo: { hasNextPage: false, endCursor: null } })
    );
    const ds = createHttpDataSource(ENDPOINT, { bearer: "tok" });
    await ds.listInstitutions({
      municipality: ["MUNICIPALITY_KOUTO", "MUNICIPALITY_KITA"],
      isAvailableStrings: true,
      isAvailablePercussion: false,
      limit: 100,
    });
    const [reqUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(reqUrl);
    expect(url.pathname).toBe("/v1/institutions");
    expect(url.searchParams.get("municipality")).toBe("MUNICIPALITY_KOUTO,MUNICIPALITY_KITA");
    expect(url.searchParams.get("isAvailableStrings")).toBe("true");
    expect(url.searchParams.has("isAvailablePercussion")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("100");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer tok");
  });

  it("returns null for a 404 institution detail", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "not found" }, 404));
    const ds = createHttpDataSource(ENDPOINT, {});
    expect(await ds.getInstitutionDetail("id1")).toBeNull();
  });

  it("drains reservation pages", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ date: "2026-08-01" }],
          pageInfo: { hasNextPage: true, endCursor: "c1" },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ date: "2026-08-02" }],
          pageInfo: { hasNextPage: false, endCursor: null },
        })
      );
    const ds = createHttpDataSource(ENDPOINT, { bearer: "tok" });
    const rows = await ds.getInstitutionReservations("id1", {
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(rows.map((r) => r.date)).toEqual(["2026-08-01", "2026-08-02"]);
    const [secondReqUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    const secondUrl = new URL(secondReqUrl);
    expect(secondUrl.searchParams.get("cursor")).toBe("c1");
  });

  it("sends the admin key and body on upsertReservations", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ received: 1, rowsWritten: 1, deferred: false }));
    const ds = createHttpDataSource(ENDPOINT, { adminKey: "secret" });
    const res = await ds.upsertReservations({
      municipality: "MUNICIPALITY_KITA",
      runId: "run1",
      rows: [{ institution_id: "i1", date: "2026-08-01", reservation: {} }],
    });
    expect(res).toEqual({ received: 1, rowsWritten: 1, deferred: false });
    const [reqUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(reqUrl).toBe(`${ENDPOINT}/v1/admin/reservations`);
    expect(init.method).toBe("PUT");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Admin-Key"]).toBe("secret");
    expect(JSON.parse(init.body as string).runId).toBe("run1");
  });

  it("throws on a non-ok response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    const ds = createHttpDataSource(ENDPOINT, {});
    await expect(
      ds.searchReservations({ startDate: "2026-08-01", endDate: "2026-08-07" })
    ).rejects.toThrow(/API request failed: 500/);
  });
});
