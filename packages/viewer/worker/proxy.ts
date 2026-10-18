// Service Binding では host は使われないが、Request の構築に要る。
const INTERNAL_ORIGIN = "https://api.internal";

// Cookie 認証なので admin 系を素通しにできず、パスは列挙で閉じる。
// [^/]+ は id にスラッシュを含めて別経路へ抜ける偽装を防ぐ。
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

// ヘッダを引き継がないのは Cookie と Origin を api へ渡さないため。
// CF-Connecting-IP だけは渡す。無いと api の RATE_LIMITER で全利用者が一つの枠を共有する。
// エッジがクライアント送信の値を上書きするので信用してよい。
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
  const clientIp = params.request.headers.get("CF-Connecting-IP");
  if (clientIp) headers.set("CF-Connecting-IP", clientIp);

  const upstream = new Request(`${INTERNAL_ORIGIN}${params.apiPath}${search}`, {
    method: "GET",
    headers,
  });

  return await params.api.fetch(upstream);
}
