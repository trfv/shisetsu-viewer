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
    // 位置引数はファイルパスへの正規表現。末尾 `/` でディレクトリ境界に固定しないと、
    // "tokyo-kita" が "tokyo-kita-genkiplaza/index.test.ts" にも一致する
    args.push(`${municipality}/`);
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
  // 空 include を返すと dispatch のタイポや testIgnore の全除外が無言のスキップになる
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
