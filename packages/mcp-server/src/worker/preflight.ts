import { originValidationResponse } from "@modelcontextprotocol/server";

// OAuthProvider はハンドラを呼ぶ前に必ず KV を read するので、弾けるものはその前に弾く。

const ALLOWED_ORIGIN_HOSTNAMES = ["claude.ai", "claude.com"];

const ALLOWED_PATHS = new Set([
  "/mcp",
  "/authorize",
  "/callback",
  "/oauth/token",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
]);

// OAuthProvider のトークンは `userId:grantId:hash` 形式
function hasValidInternalTokenFormat(authHeader: string): boolean {
  if (!authHeader.startsWith("Bearer ")) return true; // no Bearer → let OAuthProvider return 401
  const token = authHeader.substring(7);
  return token.split(":").length === 3;
}

function jsonRpcError(status: number, message: string, headers: HeadersInit): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
    { status, headers }
  );
}

export function preflight(request: Request): Response | null {
  const url = new URL(request.url);

  if (!ALLOWED_PATHS.has(url.pathname)) {
    return new Response("Not Found", { status: 404 });
  }

  if (url.pathname !== "/mcp") return null;

  const authHeader = request.headers.get("authorization");
  if (authHeader && !hasValidInternalTokenFormat(authHeader)) {
    return Response.json(
      { error: "invalid_token", error_description: "Invalid token format" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } }
    );
  }

  // Origin の無い要求は通す（claude.ai のバックエンドや Claude Code など非ブラウザのクライアント）
  const rejected = originValidationResponse(request, [url.hostname, ...ALLOWED_ORIGIN_HOSTNAMES]);
  if (rejected) return rejected;

  // SDK も GET に 405 を返すが、OAuthProvider を通すと KV read がかかるのでここで返す。
  // 2025 系のクライアントは 405 を受けると再接続せずに諦める。
  if (request.method === "GET") {
    return jsonRpcError(405, "Method Not Allowed: this server does not offer an SSE stream", {
      Allow: "POST",
    });
  }

  return null;
}
