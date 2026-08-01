export interface Env {
  ASSETS: Fetcher;
}

export const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
      return new Response("not implemented", { status: 501 });
    }
    return await env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

export default worker;
