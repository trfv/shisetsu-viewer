import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { worker } from "../test/mocks/browser";
import {
  fetchInstitutionDetail,
  fetchInstitutionReservations,
  fetchInstitutions,
  fetchScrapeRuns,
  searchReservations,
} from "./endpoints";

const BASE = import.meta.env.VITE_API_ENDPOINT;

describe("endpoints", () => {
  it("fetchInstitutions は params と cursor を /v1/institutions に載せる", async () => {
    let captured = "";
    worker.use(
      http.get(`${BASE}/v1/institutions`, ({ request }) => {
        captured = request.url;
        return HttpResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
      })
    );

    await fetchInstitutions({ municipality: ["MUNICIPALITY_KOUTOU"], limit: 100 }, "cur-1");

    const url = new URL(captured);
    expect(url.searchParams.get("municipality")).toBe("MUNICIPALITY_KOUTOU");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("cursor")).toBe("cur-1");
  });

  it("fetchInstitutionDetail は id をパスに埋める", async () => {
    let captured = "";
    worker.use(
      http.get(`${BASE}/v1/institutions/:id`, ({ request, params }) => {
        captured = params["id"] as string;
        return HttpResponse.json({ id: request.url });
      })
    );

    await fetchInstitutionDetail("abc-123");

    expect(captured).toBe("abc-123");
  });

  it("fetchInstitutionReservations は token を Authorization に載せる", async () => {
    let auth: string | null = null;
    worker.use(
      http.get(`${BASE}/v1/institutions/:id/reservations`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
      })
    );

    await fetchInstitutionReservations(
      "abc-123",
      { startDate: "2026-08-01", endDate: "2026-08-31" },
      null,
      "tok-xyz"
    );

    expect(auth).toBe("Bearer tok-xyz");
  });

  it("searchReservations は token を載せて /v1/reservations/search を叩く", async () => {
    let auth: string | null = null;
    worker.use(
      http.get(`${BASE}/v1/reservations/search`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
      })
    );

    await searchReservations(
      { startDate: "2026-08-01", endDate: "2026-08-07", isHoliday: true },
      null,
      "tok-abc"
    );

    expect(auth).toBe("Bearer tok-abc");
  });

  it("fetchScrapeRuns は /v1/scrape-runs から items を返す", async () => {
    worker.use(
      http.get(`${BASE}/v1/scrape-runs`, () =>
        HttpResponse.json({ items: [{ municipality: "MUNICIPALITY_KOUTOU", fetched_at: "x" }] })
      )
    );

    const result = await fetchScrapeRuns();

    expect(result.items).toHaveLength(1);
  });
});
