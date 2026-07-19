// parity tracker Issue のサンプル行から spot check のサンプルキーを選ぶ純関数群。
// 乱数は使わない。同じ Issue 本文からは常に同じサンプルが選ばれる（再実行で比較可能にするため）。

export interface SampleKey {
  target: string; // 例: "tokyo-koutou"
  institutionId: string;
  date: string; // "YYYY-MM-DD"
}

/** 1 実行あたりのサンプル数の上限。コスト規律によるハードキャップ（spec 参照）。 */
export const SAMPLE_CAP = 12;

// Issue 本文のサンプル行: `<target>: MISSING in D1: <institution_id> <date>`
// institution_id は非 RFC UUID を含むため [0-9a-fA-F-]+ で受ける（SQL に埋めるので厳格に検証する）。
const SAMPLE_LINE = /^([a-z]+-[a-z]+): MISSING in D1: ([0-9a-fA-F-]+) (\d{4}-\d{2}-\d{2})$/;

export function parseTrackerSamples(issueBody: string): SampleKey[] {
  const keys: SampleKey[] = [];
  for (const raw of issueBody.split("\n")) {
    const match = SAMPLE_LINE.exec(raw.trim());
    if (!match) continue;
    const [, target, institutionId, date] = match;
    if (target !== undefined && institutionId !== undefined && date !== undefined) {
      keys.push({ target, institutionId, date });
    }
  }
  return keys;
}

function compareKeys(a: SampleKey, b: SampleKey): number {
  return (
    a.target.localeCompare(b.target) ||
    a.institutionId.localeCompare(b.institutionId) ||
    a.date.localeCompare(b.date)
  );
}

export function selectSamples(opts: {
  trackerKeys: SampleKey[];
  explicitKeys: SampleKey[];
  municipalityFilter?: string | undefined;
  cap?: number | undefined;
}): SampleKey[] {
  const cap = Math.min(opts.cap ?? 8, SAMPLE_CAP);
  const pool = opts.explicitKeys.length > 0 ? opts.explicitKeys : opts.trackerKeys;
  const filtered =
    opts.municipalityFilter !== undefined
      ? pool.filter((k) => k.target === opts.municipalityFilter)
      : pool;

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
