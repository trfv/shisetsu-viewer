// api の内部 URL。Service Binding では host は使われないが、Request の構築に必要である。
const INTERNAL_ORIGIN = "https://api.internal";

// BFF が転送してよい読み取り経路。Cookie 認証である以上、admin 系の PUT を
// 素通しにできないため、パスは列挙で閉じる。SameSite=Lax は第二の防壁にすぎない。
// [^/]+ にしているのは、id にスラッシュを含めて別経路へ抜ける偽装を防ぐため。
const ALLOWED_PATHS: RegExp[] = [
  /^\/v1\/institutions$/,
  /^\/v1\/institutions\/[^/]+$/,
  /^\/v1\/institutions\/[^/]+\/reservations$/,
  /^\/v1\/reservations\/search$/,
  /^\/v1\/scrape-runs$/,
];

export function isAllowedApiPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

/**
 * api へ転送する。ヘッダを引き継がず新規に組み立てているのは、Cookie と Origin を
 * api 側へ渡さないためである。api の認可は Authorization の JWT だけで決まる。
 */
export async function proxyToApi(params: {
  api: Fetcher;
  request: Request;
  apiPath: string;
  token: string | null;
}): Promise<Response> {
  const { search } = new URL(params.request.url);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (params.token) headers.set("Authorization", `Bearer ${params.token}`);

  const upstream = new Request(`${INTERNAL_ORIGIN}${params.apiPath}${search}`, {
    method: "GET",
    headers,
  });

  return await params.api.fetch(upstream);
}
