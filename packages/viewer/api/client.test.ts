import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { worker } from "../test/mocks/browser";
import { apiGet } from "./client";

const ENDPOINT = "https://api.test.example";

describe("apiGet", () => {
  it("配列パラメータをカンマ区切りで直列化し、null/undefined/空配列を省略する", async () => {
    let capturedUrl = "";
    worker.use(
      http.get(`${ENDPOINT}/v1/institutions`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
      })
    );

    await apiGet(`${ENDPOINT}/v1/institutions`, {
      municipality: ["MUNICIPALITY_KOUTOU", "MUNICIPALITY_BUNKYO"],
      isAvailableBrass: true,
      institutionSizes: undefined,
      cursor: null,
      emptyList: [],
      limit: 100,
    });

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("municipality")).toBe("MUNICIPALITY_KOUTOU,MUNICIPALITY_BUNKYO");
    expect(url.searchParams.get("isAvailableBrass")).toBe("true");
    expect(url.searchParams.has("institutionSizes")).toBe(false);
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.has("emptyList")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("boolean は true のときだけ付与し、false は省略する", async () => {
    let capturedUrl = "";
    worker.use(
      http.get(`${ENDPOINT}/v1/institutions`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [] });
      })
    );

    await apiGet(`${ENDPOINT}/v1/institutions`, { isAvailableBrass: false, isHoliday: true });

    const url = new URL(capturedUrl);
    expect(url.searchParams.has("isAvailableBrass")).toBe(false);
    expect(url.searchParams.get("isHoliday")).toBe("true");
  });

  it("token があれば Authorization ヘッダを付ける", async () => {
    let auth: string | null = null;
    worker.use(
      http.get(`${ENDPOINT}/v1/x`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({});
      })
    );

    await apiGet(`${ENDPOINT}/v1/x`, {}, "tok-123");

    expect(auth).toBe("Bearer tok-123");
  });

  it("token がなければ Authorization ヘッダを付けない", async () => {
    let auth: string | null = "unset";
    worker.use(
      http.get(`${ENDPOINT}/v1/x`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({});
      })
    );

    await apiGet(`${ENDPOINT}/v1/x`, {});

    expect(auth).toBeNull();
  });

  it("非 2xx はステータスと本文つきで throw する", async () => {
    worker.use(
      http.get(`${ENDPOINT}/v1/x`, () => HttpResponse.json({ error: "forbidden" }, { status: 403 }))
    );

    await expect(apiGet(`${ENDPOINT}/v1/x`, {})).rejects.toThrow(/403/);
  });

  it("2xx は JSON を返す", async () => {
    const body = { items: [{ id: "abc" }], pageInfo: { hasNextPage: true, endCursor: "c1" } };
    worker.use(http.get(`${ENDPOINT}/v1/institutions`, () => HttpResponse.json(body)));

    const result = await apiGet(`${ENDPOINT}/v1/institutions`, {});

    expect(result).toEqual(body);
  });
});
