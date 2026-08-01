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

/**
 * BFF 経由で api を叩く。同一オリジンのため Cookie は自動で載り、
 * Authorization ヘッダは BFF が付け替える。ブラウザはトークンを持たない。
 */
export async function apiGet<T>(url: string, params: QueryParams): Promise<T> {
  const sp = buildSearchParams(params);
  const qs = sp.size > 0 ? `?${sp.toString()}` : "";
  const res = await fetch(`${url}${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }
  // 2xx でも JSON でない応答（BFF を経由せず SPA の index.html を掴んだ場合など）は、
  // res.json() の "Unexpected token '<'" ではなく原因が分かるメッセージで弾く。
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
