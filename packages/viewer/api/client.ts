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

export async function apiGet<T>(url: string, params: QueryParams, token?: string): Promise<T> {
  const sp = buildSearchParams(params);
  const qs = sp.size > 0 ? `?${sp.toString()}` : "";
  const res = await fetch(`${url}${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
