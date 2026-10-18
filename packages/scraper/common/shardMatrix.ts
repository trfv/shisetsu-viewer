export interface ShardMatrixEntry {
  readonly municipality: string;
  readonly shardIndex: number;
  readonly shardTotal: number;
}

export function countTestsByMunicipality(listOutput: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of listOutput.split("\n")) {
    // 例: "  tokyo-koutou/index.test.ts:6:3 › 総合区民センター 第一和室"
    const match = line.match(/^\s*(\S+?)\/index\.test\.ts:\d+:\d+\s/);
    const municipality = match?.[1];
    if (municipality === undefined) continue;
    counts.set(municipality, (counts.get(municipality) ?? 0) + 1);
  }
  return counts;
}

/** density は 1 シャードあたりの目標テスト数 */
export function buildShardMatrix(
  counts: ReadonlyMap<string, number>,
  density: number
): ShardMatrixEntry[] {
  if (!Number.isInteger(density) || density < 1) {
    throw new Error(`density must be a positive integer, got: ${density}`);
  }
  const entries: ShardMatrixEntry[] = [];
  // run 間で job 名を安定させる
  for (const municipality of [...counts.keys()].sort()) {
    const count = counts.get(municipality) ?? 0;
    if (count <= 0) continue;
    const shardTotal = Math.ceil(count / density);
    for (let shardIndex = 1; shardIndex <= shardTotal; shardIndex++) {
      entries.push({ municipality, shardIndex, shardTotal });
    }
  }
  return entries;
}

export function shardMatrixFromListOutput(listOutput: string, density: number): ShardMatrixEntry[] {
  return buildShardMatrix(countTestsByMunicipality(listOutput), density);
}
