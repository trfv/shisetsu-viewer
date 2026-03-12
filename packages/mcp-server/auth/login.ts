import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { writeTokens } from "./tokenStore.ts";

const CALLBACK_PORT = 19876;

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function openBrowser(url: string): void {
  const onError = (error: Error | null) => {
    if (error) {
      process.stderr.write(
        `ブラウザを開けませんでした。以下のURLを手動で開いてください:\n${url}\n`
      );
    }
  };

  if (process.platform === "darwin") {
    execFile("open", [url], onError);
  } else if (process.platform === "win32") {
    execFile("cmd", ["/c", "start", url], onError);
  } else {
    execFile("xdg-open", [url], onError);
  }
}

function successHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Login</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px">
<h1>ログイン成功</h1><p>このタブを閉じてCLIに戻ってください。</p></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Login Error</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px">
<h1>ログインエラー</h1><p>${escapeHtml(message)}</p></body></html>`;
}

export async function login(): Promise<void> {
  const domain = process.env["AUTH0_DOMAIN"];
  const clientId = process.env["AUTH0_CLIENT_ID"];
  const clientSecret = process.env["AUTH0_CLIENT_SECRET"];
  const audience = process.env["AUTH0_AUDIENCE"];

  if (!domain || !clientId || !clientSecret || !audience) {
    throw new Error("AUTH0_* 環境変数が必要です (.env を確認してください)");
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString("hex");
  const redirectUri = `http://localhost:${CALLBACK_PORT}/callback`;

  const result = await new Promise<{ code: string }>((resolve, reject) => {
    const TIMEOUT_MS = 120_000;

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        const desc = url.searchParams.get("error_description") ?? "";
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml(`${error}: ${desc}`));
        server.close();
        reject(new Error(`Auth0: ${error} — ${desc}`));
        return;
      }

      const code = url.searchParams.get("code");
      const callbackState = url.searchParams.get("state");

      if (!code || !callbackState) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml("予期しないコールバックパラメータ"));
        server.close();
        reject(new Error("予期しないコールバックパラメータ"));
        return;
      }

      if (callbackState !== state) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml("state パラメータが一致しません"));
        server.close();
        reject(new Error("state パラメータが一致しません"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(successHtml());
      server.close();
      resolve({ code });
    });

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("ログインがタイムアウトしました"));
    }, TIMEOUT_MS);

    server.on("close", () => clearTimeout(timeout));

    server.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "EADDRINUSE") {
        reject(new Error(`ポート ${CALLBACK_PORT} が使用中です。他のプロセスを終了してください`));
      } else {
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, () => {
      const authorizeUrl = new URL(`https://${domain}/authorize`);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", clientId);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("audience", audience);
      authorizeUrl.searchParams.set("scope", "openid offline_access");
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", codeChallenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");

      openBrowser(authorizeUrl.toString());
    });
  });

  // Exchange authorization code for tokens
  const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: result.code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`トークン交換に失敗しました: ${tokenResponse.status} ${text}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!tokenData.refresh_token) {
    throw new Error(
      "Auth0 からリフレッシュトークンが返されませんでした。offline_access スコープを確認してください"
    );
  }

  await writeTokens({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in,
  });

  process.stderr.write("Login successful\n");
}
