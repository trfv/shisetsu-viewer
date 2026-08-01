// spot check のサンプルキーを選ぶ純関数群。
// 乱数は使わない。同じ入力からは常に同じサンプルが選ばれる（再実行で比較可能にするため）。

export interface SampleKey {
  target: string; // 例: "tokyo-koutou"
  institutionId: string;
  date: string; // "YYYY-MM-DD"
}

/** 1 実行あたりのサンプル数の上限。コスト規律によるハードキャップ（spec 参照）。 */
export const SAMPLE_CAP = 12;

function compareKeys(a: SampleKey, b: SampleKey): number {
  return (
    a.target.localeCompare(b.target) ||
    a.institutionId.localeCompare(b.institutionId) ||
    a.date.localeCompare(b.date)
  );
}

export function selectSamples(opts: {
  explicitKeys: SampleKey[];
  municipalityFilter?: string | undefined;
  cap?: number | undefined;
}): SampleKey[] {
  const cap = Math.min(opts.cap ?? 8, SAMPLE_CAP);
  const filtered =
    opts.municipalityFilter !== undefined
      ? opts.explicitKeys.filter((k) => k.target === opts.municipalityFilter)
      : opts.explicitKeys;

  // 自治体間で偏らないよう、ソートしてからラウンドロビンで詰める。
  const byTarget = new Map<string, SampleKey[]>();
  for (const key of [...filtered].sort(compareKeys)) {
    const group = byTarget.get(key.target);
    if (group) {
      group.push(key);
    } else {
      byTarget.set(key.target, [key]);
    }
  }
  const groups = [...byTarget.values()];
  const picked: SampleKey[] = [];
  for (let round = 0; picked.length < cap; round++) {
    let added = false;
    for (const group of groups) {
      if (picked.length >= cap) break;
      const item = group[round];
      if (item !== undefined) {
        picked.push(item);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked;
}
