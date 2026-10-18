// Workers Builds のトリガーを builds.json の宣言と比べる。書き込みはしない。
// 差分があれば表示して exit 1 にする。.github/workflows/cloudflare.yml が pull request で呼ぶ。
//
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node builds.ts

import { readFile } from "node:fs/promises";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** 宣言の 1 トリガー。UUID は作り直すと変わるので書かず、Worker 名とトリガー名で特定する */
export type TriggerSpec = {
  trigger_name: string;
  branch_includes: string[];
  branch_excludes: string[];
  path_includes: string[];
  path_excludes: string[];
  build_command: string;
  deploy_command: string;
  root_directory: string;
  build_caching_enabled: boolean;
  // ビルド変数。今は秘密の値が無いので値ごと宣言する
  vars: Record<string, string>;
};

export type BuildsSpec = Record<string, TriggerSpec[]>;

// 比べる項目。API が返すほかの項目（UUID、日時、ビルドトークン）は宣言しない
const FIELDS = [
  "branch_includes",
  "branch_excludes",
  "path_includes",
  "path_excludes",
  "build_command",
  "deploy_command",
  "root_directory",
  "build_caching_enabled",
] as const satisfies readonly (keyof TriggerSpec)[];

type ApiTrigger = Omit<TriggerSpec, "vars"> & { trigger_uuid: string };
type ApiVars = Record<string, { value?: string; is_secret: boolean }>;

/** 本番の状態。宣言と同じ形にそろえる（秘密のビルド変数は値が読めないので印だけ置く） */
export type BuildsState = Record<string, TriggerSpec[] | undefined>;

const SECRET = "(secret)";

export async function loadState(
  workers: string[],
  {
    token,
    accountId,
    fetch: fetchImpl = fetch,
  }: { token: string; accountId: string; fetch?: FetchLike }
): Promise<BuildsState> {
  const get = async <T>(path: string): Promise<T> => {
    const response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const body = (await response.json()) as { success: boolean; result: T; errors: unknown[] };
    if (!response.ok || !body.success) {
      throw new Error(`GET ${path} failed: ${response.status} ${JSON.stringify(body.errors)}`);
    }
    return body.result;
  };

  // Builds の API は Worker 名ではなく tag で引く
  const scripts = await get<{ id: string; tag: string }[]>("/workers/scripts");
  const state: BuildsState = {};
  for (const name of workers) {
    const script = scripts.find((s) => s.id === name);
    if (!script) {
      state[name] = undefined;
      continue;
    }
    const triggers = await get<ApiTrigger[]>(`/builds/workers/${script.tag}/triggers`);
    state[name] = await Promise.all(
      triggers.map(async (trigger) => {
        const vars = await get<ApiVars>(
          `/builds/triggers/${trigger.trigger_uuid}/environment_variables`
        );
        return {
          trigger_name: trigger.trigger_name,
          ...Object.fromEntries(FIELDS.map((field) => [field, trigger[field]])),
          vars: Object.fromEntries(
            Object.entries(vars).map(([key, v]) => [key, v.is_secret ? SECRET : (v.value ?? "")])
          ),
        } as TriggerSpec;
      })
    );
  }
  return state;
}

/** 宣言と本番の違いを、人が読める行の列にする。空なら一致 */
export function diffBuilds(spec: BuildsSpec, state: BuildsState): string[] {
  const lines: string[] = [];
  for (const [worker, declared] of Object.entries(spec)) {
    const actual = state[worker];
    if (!actual) {
      lines.push(`${worker}: Worker が本番に無い`);
      continue;
    }
    for (const want of declared) {
      const got = actual.find((t) => t.trigger_name === want.trigger_name);
      const where = `${worker} / ${want.trigger_name}`;
      if (!got) {
        lines.push(`${where}: トリガーが本番に無い`);
        continue;
      }
      for (const field of FIELDS) {
        if (JSON.stringify(got[field]) !== JSON.stringify(want[field])) {
          lines.push(
            `${where}: ${field} が ${JSON.stringify(got[field])}（宣言は ${JSON.stringify(want[field])}）`
          );
        }
      }
      for (const key of new Set([...Object.keys(want.vars), ...Object.keys(got.vars)])) {
        if (!(key in want.vars)) lines.push(`${where}: ビルド変数 ${key} が本番にだけある`);
        else if (!(key in got.vars)) lines.push(`${where}: ビルド変数 ${key} が本番に無い`);
        else if (got.vars[key] !== want.vars[key]) {
          lines.push(`${where}: ビルド変数 ${key} が ${got.vars[key]}（宣言は ${want.vars[key]}）`);
        }
      }
    }
    for (const extra of actual.filter(
      (t) => !declared.some((d) => d.trigger_name === t.trigger_name)
    )) {
      lines.push(`${worker} / ${extra.trigger_name}: トリガーが本番にだけある`);
    }
  }
  return lines;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が設定されていない`);
  return value;
}

if (import.meta.main) {
  const spec = JSON.parse(
    await readFile(new URL("./builds.json", import.meta.url), "utf8")
  ) as BuildsSpec;
  const state = await loadState(Object.keys(spec), {
    token: env("CLOUDFLARE_API_TOKEN"),
    accountId: env("CLOUDFLARE_ACCOUNT_ID"),
  });
  const lines = diffBuilds(spec, state);
  if (lines.length === 0) {
    console.log("Workers Builds のトリガーは builds.json と一致している");
  } else {
    console.log(`builds.json と本番が ${lines.length} か所で違う:`);
    for (const line of lines) console.log(`- ${line}`);
    process.exitCode = 1;
  }
}
