import type { CiConclusion, DependabotPr } from "./types.ts";

export type DependabotDecision = "auto-merge" | "needs-human" | "investigate" | "wait";

// 同日公開の組で揃える必要があり、単独で上げると workerd が多重化する。
// マージがそのまま Workers のデプロイにもなる。
const CF_TOOLCHAIN = [
  "wrangler",
  "miniflare",
  "@cloudflare/vitest-plugin",
  "@cloudflare/vitest-pool-workers",
];
const VERSION_RE = /from v?(\d+)\.(\d+)\S* to v?(\d+)\.(\d+)/g;

/** タイトルと、本文の Updates/Bumps 行だけを判定対象にする（リリースノートの誤検知を避ける）。 */
function relevantText(pr: DependabotPr): string {
  const lines = pr.body.split("\n").filter((line) => /^(Updates|Bumps) /.test(line.trim()));
  return [pr.title, ...lines].join("\n");
}

/** 破壊的更新を含めば true、含まなければ false、バージョンが読めなければ null。 */
function hasBreakingBump(text: string): boolean | null {
  const matches = [...text.matchAll(VERSION_RE)];
  if (matches.length === 0) return null;
  return matches.some((m) => {
    const fromMajor = Number(m[1]);
    const fromMinor = Number(m[2]);
    const toMajor = Number(m[3]);
    const toMinor = Number(m[4]);
    // semver では 0.x の minor 更新も破壊的でありうる。
    return toMajor !== fromMajor || (fromMajor === 0 && toMinor !== fromMinor);
  });
}

export function classifyDependabotPr(pr: DependabotPr): DependabotDecision {
  const text = relevantText(pr);
  if (CF_TOOLCHAIN.some((name) => text.includes(name))) return "needs-human";
  if (hasBreakingBump(text) !== false) return "needs-human";
  if (pr.ci === "failure") return "investigate";
  if (pr.ci === "pending") return "wait";
  return "auto-merge";
}

/** Node CI の集約ジョブ ci-success の結果だけを見る（必須チェックと同じ基準）。 */
export function ciFromRollup(
  rollup: readonly { name?: string; conclusion?: string | null }[]
): CiConclusion {
  const check = rollup.find((c) => c.name === "ci-success");
  if (check?.conclusion === "SUCCESS") return "success";
  if (check?.conclusion === "FAILURE") return "failure";
  return "pending";
}
