// auth0PostLogin.cjs を Auth0 の Post Login Action に反映する（Management API）。
// GitHub Actions（.github/workflows/auth0.yml）から呼ぶ。M2M の権限は read:actions と update:actions だけ。
//
//   node auth0Deploy.ts          差分があれば更新して Deploy する
//   node auth0Deploy.ts --check  本番と原本がずれていれば失敗する（管理画面での直接編集の検出）

import { readFile } from "node:fs/promises";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type DeployConfig = {
  // Management API はカスタムドメインではなくテナント本来のドメインで呼ぶ（例：trfv.jp.auth0.com）
  tenantDomain: string;
  clientId: string;
  clientSecret: string;
  code: string;
  fetch?: FetchLike;
  // ビルド完了を待つ間隔。テストで 0 にする
  pollIntervalMs?: number;
};

export type DeployResult = "unchanged" | "deployed" | "drifted";

const RUNTIME = "node22";

type Action = {
  id: string;
  name: string;
  code: string;
  runtime: string;
  status: string;
  all_changes_deployed: boolean;
};

type ManagementApi = <T>(method: string, path: string, json?: unknown) => Promise<T>;

async function send<T>(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<T> {
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    // 資格情報はヘッダーと本文にしか載せないので、メソッドとパスと応答だけを出す
    throw new Error(
      `${init.method} ${new URL(url).pathname} failed: ${response.status} ${await response.text()}`
    );
  }
  return (await response.json()) as T;
}

/** client credentials で Management API のトークンを取り、それを付けて呼ぶ関数を返す */
async function connect(config: DeployConfig): Promise<ManagementApi> {
  const fetchImpl = config.fetch ?? fetch;
  const { tenantDomain, clientId, clientSecret } = config;
  const { access_token: token } = await send<{ access_token: string }>(
    fetchImpl,
    `https://${tenantDomain}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${tenantDomain}/api/v2/`,
      }),
    }
  );
  return (method, path, json) =>
    send(
      fetchImpl,
      `https://${tenantDomain}/api/v2${path}`,
      json === undefined
        ? { method, headers: { Authorization: `Bearer ${token}` } }
        : {
            method,
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(json),
          }
    );
}

/** post-login に紐づく Action を 1 つだけ特定する。複数あれば、どれを更新すべきか決められないので失敗させる */
async function findPostLoginAction(api: ManagementApi): Promise<Action> {
  const { bindings } = await api<{ bindings: { action: { id: string; name: string } }[] }>(
    "GET",
    "/actions/triggers/post-login/bindings"
  );
  if (bindings.length !== 1) {
    throw new Error(
      `post-login に紐づく Action が ${bindings.length} 個ある（1 個を想定）: ${bindings.map((b) => b.action.name).join(", ")}`
    );
  }
  return api<Action>("GET", `/actions/actions/${bindings[0]!.action.id}`);
}

function inSync(action: Action, code: string): boolean {
  return action.code === code && action.runtime === RUNTIME && action.all_changes_deployed;
}

export async function deployPostLoginAction(
  config: DeployConfig,
  { check = false }: { check?: boolean } = {}
): Promise<DeployResult> {
  const api = await connect(config);
  const action = await findPostLoginAction(api);

  if (inSync(action, config.code)) return "unchanged";
  if (check) return "drifted";

  // dependencies を空にするのは、原本が外部パッケージを使わないため（旧版の axios を残さない）。
  // secrets は送らない。送ると管理画面で設定した Slack のトークンが消える。
  await api("PATCH", `/actions/actions/${action.id}`, {
    code: config.code,
    runtime: RUNTIME,
    dependencies: [],
  });

  // 更新直後はビルド中で、built になるまで Deploy できない
  for (let attempt = 0; ; attempt++) {
    const { status } = await api<Action>("GET", `/actions/actions/${action.id}`);
    if (status === "built") break;
    if (status === "failed") throw new Error("Action のビルドに失敗した");
    if (attempt >= 30) throw new Error(`Action のビルドが終わらない（status: ${status}）`);
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs ?? 2000));
  }

  await api("POST", `/actions/actions/${action.id}/deploy`);
  return "deployed";
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が設定されていない`);
  return value;
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  const result = await deployPostLoginAction(
    {
      tenantDomain: env("AUTH0_TENANT_DOMAIN"),
      clientId: env("AUTH0_DEPLOY_CLIENT_ID"),
      clientSecret: env("AUTH0_DEPLOY_CLIENT_SECRET"),
      code: await readFile(new URL("./auth0PostLogin.cjs", import.meta.url), "utf8"),
    },
    { check }
  );
  console.log(`post-login Action: ${result}`);
  if (result === "drifted") {
    console.error(
      "本番の Action が auth0PostLogin.cjs と一致しない。管理画面で直接編集されていないか確かめる"
    );
    process.exitCode = 1;
  }
}
