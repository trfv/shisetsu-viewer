/**
 * `playwright test [<municipality>] --list` を実行し、シャード matrix を JSON で出力する。
 * GitHub Actions の prepare ジョブから呼ばれ、出力を `strategy.matrix.include` に流し込む。
 *
 * 使い方:
 *   node scripts/shardMatrix.ts [<municipality>] [--density N]
 *   （municipality 省略時は全対象。--density の既定は 5）
 *
 * 出力（1 行の JSON）:
 *   { "include": [ { "municipality": "...", "shardIndex": 1, "shardTotal": 2 }, ... ] }
 *
 * テストが 1 件も無い場合は空 include を返さず exit 1 で落とす
 * （dispatch のタイポや testIgnore の全除外を、無言のスキップにせず気付けるようにする）。
 */
import { execFileSync } from "node:child_process";

import { shardMatrixFromListOutput } from "../common/shardMatrix.ts";

function parseArgs(argv: string[]): { municipality: string; density: number } {
  let municipality = "";
  let density = 5;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--density") {
      density = Number(argv[++i]);
    } else if (arg && !arg.startsWith("--")) {
      municipality = arg;
    }
  }
  if (!Number.isInteger(density) || density < 1) {
    throw new Error(`--density must be a positive integer, got: ${density}`);
  }
  return { municipality, density };
}

function main(): void {
  const { municipality, density } = parseArgs(process.argv.slice(2));

  const args = ["playwright", "test", "--list", "--reporter=list"];
  if (municipality && municipality !== "all") {
    args.push(municipality);
  }

  // --list は tests があると exit 0、0 件だと非ゼロで終わるため、出力は常に受け取る
  let listOutput: string;
  try {
    listOutput = execFileSync("npx", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
  } catch (error) {
    const err = error as { stdout?: string };
    listOutput = err.stdout ?? "";
  }

  const include = shardMatrixFromListOutput(listOutput, density);
  if (include.length === 0) {
    console.error(
      `No tests found for municipality=${municipality || "all"}. ` +
        `Check the municipality name and playwright testIgnore (registry scraperCiExcluded).`
    );
    process.exit(1);
  }

  const totalTests = new Set(include.map((e) => e.municipality)).size;
  console.error(
    `Sharding ${include.length} shard(s) across ${totalTests} municipalit(ies) at density=${density}`
  );
  process.stdout.write(JSON.stringify({ include }));
}

main();
