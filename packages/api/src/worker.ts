export interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  GITHUB_REPOSITORY: string;
  OIDC_AUDIENCE: string;
  ADMIN_API_KEY?: string;
}

export default {
  // env / ctx はルーティング実装（Task 3-1-5）で使う。fewer-params は ExportedHandler を満たす。
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/v1/health") {
      return Response.json({ ok: true });
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
