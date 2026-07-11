/**
 * `playwright test --list --reporter=list` の出力から、自治体ごとのシャード matrix を組み立てる。
 *
 * 定期実行は自治体数（11）に対し 100 固定シャードで、大半が空シャードだった
 * （空でも checkout + cache restore で ~78 秒/シャード のオーバーヘッドを消費）。
 * テスト数を density で割ってシャード数を決めることで、空シャードを構造的に無くす。
 * テスト 0 件の自治体（CI 除外中など）は matrix に現れない。
 */

export interface ShardMatrixEntry {
  readonly municipality: string;
  readonly shardIndex: number;
  readonly shardTotal: number;
}

/** `--list` 出力のテスト行から自治体別テスト数を数える。 */
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

/**
 * 自治体別テスト数から matrix include 配列を作る。
 * @param density 1 シャードあたりの目標テスト数
 */
export function buildShardMatrix(
  counts: ReadonlyMap<string, number>,
  density: number
): ShardMatrixEntry[] {
  if (!Number.isInteger(density) || density < 1) {
    throw new Error(`density must be a positive integer, got: ${density}`);
  }
  const entries: ShardMatrixEntry[] = [];
  // 自治体名でソートし、出力を決定論的にする（run 間で job 名が安定する）
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

/** `--list` 出力と density から matrix include 配列を得る。 */
export function shardMatrixFromListOutput(listOutput: string, density: number): ShardMatrixEntry[] {
  return buildShardMatrix(countTestsByMunicipality(listOutput), density);
}
