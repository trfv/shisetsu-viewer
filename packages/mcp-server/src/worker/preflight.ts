import { originValidationResponse } from "@modelcontextprotocol/server";

/**
 * OAuthProvider に渡す前のリクエスト短絡判定。
 *
 * OAuthProvider はハンドラを呼ぶ前に必ずトークンを KV から引く。つまり OAuthProvider に
 * 到達した時点で KV read が 1 回確定する。ここで先に弾けるものを弾くことで read を節約する。
 *
 * 短絡すべきリクエストには Response を、通すべきリクエストには null を返す。
 */

/** /mcp をブラウザから呼んでよいオリジン（自分自身に加えて）。Claude の Web アプリを想定する */
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

/**
 * OAuthProvider issues tokens in `userId:grantId:hash` format (3 colon-separated parts).
 * Reject tokens that don't match this format before OAuthProvider attempts a KV read.
 */
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

  // 1. 未知のパスを弾く（脆弱性スキャナの巡回など）
  if (!ALLOWED_PATHS.has(url.pathname)) {
    return new Response("Not Found", { status: 404 });
  }

  if (url.pathname !== "/mcp") return null;

  // 2. OAuthProvider 形式に合わないトークンを弾く
  const authHeader = request.headers.get("authorization");
  if (authHeader && !hasValidInternalTokenFormat(authHeader)) {
    return Response.json(
      { error: "invalid_token", error_description: "Invalid token format" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } }
    );
  }

  // 3. ブラウザからの別オリジンの要求を弾く（MCP 仕様の MUST）。Origin の無い要求
  //    （claude.ai のバックエンド、Claude Code など非ブラウザのクライアント）は通す
  const rejected = originValidationResponse(request, [url.hostname, ...ALLOWED_ORIGIN_HOSTNAMES]);
  if (rejected) return rejected;

  // 4. GET（2025 系のサーバー発通知用 SSE ストリーム）を弾く。
  //    2026-07-28 で GET のストリームは廃止され、SDK もステートレス構成では 405 を返す。
  //    ただし OAuthProvider を通すとトークンの KV read が 1 回かかるので、ここで先に返す。
  //    2025 系のクライアントは 405 を受けると再接続せずに諦める。
  if (request.method === "GET") {
    return jsonRpcError(405, "Method Not Allowed: this server does not offer an SSE stream", {
      Allow: "POST",
    });
  }

  return null;
}
