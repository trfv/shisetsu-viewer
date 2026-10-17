import type { ConsentDescription } from "@cloudflare/workers-oauth-provider";

/**
 * 認可のたびに出す同意画面。
 *
 * 動的に登録・提示されたクライアントを確認なしで Auth0 へ流すと confused deputy になる
 * （攻撃者のクライアントにログイン済みユーザーのトークンが渡る）。MCP 仕様はプロキシ型の
 * サーバーにクライアントごとの同意を MUST として課している。表示項目は仕様の要求に従う：
 * クライアント名、CIMD ならその発行ドメイン、トークンの送り先ホスト、localhost 宛ての警告。
 */

// クライアント名やホストは攻撃者が選べる値なので、すべてエスケープする
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function renderConsentPage(details: ConsentDescription, handle: string): string {
  const name = escape(details.clientName);
  const publisher = details.clientDomain
    ? `<p>発行元：<strong>${escape(details.clientDomain)}</strong></p>`
    : "<p>このアプリの名前は検証されていません。</p>";
  const loopbackWarning = details.redirectIsLoopback
    ? '<p class="warn"><strong>このパソコン上のアプリにアクセス権を渡します。</strong>自分でいま接続を始めた場合だけ許可してください。</p>'
    : "";
  return `<!doctype html>
<html lang="ja">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} にアクセスを許可しますか</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }
  .warn { color: #b3261e; }
  button { font-size: 1rem; padding: 0.5rem 1.25rem; margin-right: 0.5rem; }
</style>
<h1>${name} に施設予約データへのアクセスを許可しますか</h1>
${publisher}
<p>アクセス権の送り先：<strong>${escape(details.redirectHost)}</strong></p>
${loopbackWarning}
<p>許可するとログイン画面へ進みます。</p>
<form method="post">
  <input type="hidden" name="handle" value="${escape(handle)}">
  <button name="decision" value="approve">許可する</button>
  <button name="decision" value="deny">拒否する</button>
</form>
</html>`;
}
