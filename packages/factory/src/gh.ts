import { execFileSync } from "node:child_process";

/** gh CLI を呼ぶ。{owner}/{repo} のプレースホルダは GH_REPO かカレントリポジトリで解決される。 */
export function gh(args: readonly string[], input?: string): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
}

export function ghJson<T>(args: readonly string[]): T {
  return JSON.parse(gh(args)) as T;
}
