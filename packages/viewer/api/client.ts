export type QueryParams = Record<string, string | number | boolean | string[] | null | undefined>;

function buildSearchParams(params: QueryParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean") {
      if (value) sp.set(key, "true");
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) sp.set(key, value.join(","));
      continue;
    }
    sp.set(key, String(value));
  }
  return sp;
}

export async function apiGet<T>(url: string, params: QueryParams): Promise<T> {
  const sp = buildSearchParams(params);
  const qs = sp.size > 0 ? `?${sp.toString()}` : "";
  const res = await fetch(`${url}${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }
  // BFF を経由せず SPA の index.html を掴むと 2xx の HTML が返る。
  // res.json() の "Unexpected token '<'" では原因が分からない。
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `API が JSON を返しませんでした (content-type: ${contentType || "なし"}, status: ${res.status}). ` +
        `url=${url} body=${body.slice(0, 120)}`
    );
  }
  return (await res.json()) as T;
}
