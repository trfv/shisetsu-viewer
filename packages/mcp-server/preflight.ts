/**
 * OAuthProvider に渡す前のリクエスト短絡判定。
 *
 * OAuthProvider はハンドラを呼ぶ前に必ずトークンを KV から引く。つまり OAuthProvider に
 * 到達した時点で KV read が 1 回確定する。ここで先に弾けるものを弾くことで read を節約する。
 *
 * 短絡すべきリクエストには Response を、通すべきリクエストには null を返す。
 */

const ALLOWED_PATHS = new Set([
  "/mcp",
  "/authorize",
  "/callback",
  "/oauth/token",
  "/oauth/register",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
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

  // 3. GET（サーバー発通知用の SSE ストリーム開設）を弾く。
  //    このサーバーはリクエストごとに transport を作り直すステートレス構成で、
  //    sessionIdGenerator を持たない。よって GET が開いたストリームに書き込む主体が
  //    存在せず、SDK が返す ReadableStream は永久に無音のままになる。Workers ランタイムは
  //    これを「応答を生成しえないハング」と判定してリクエストを強制終了し、クライアントは
  //    即座に再接続する。この再接続ループが 1 回ごとに KV read を焼く。
  //    MCP 仕様は SSE ストリームを提供しないサーバーが 405 を返すことを認めており、
  //    クライアントは 405 を受けると再接続せず静かに諦める。
  if (request.method === "GET") {
    return jsonRpcError(405, "Method Not Allowed: this server does not offer an SSE stream", {
      Allow: "POST",
    });
  }

  return null;
}
