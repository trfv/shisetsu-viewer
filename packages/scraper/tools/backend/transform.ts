import type { FileData, InstitutionKeyMap, ReservationRow } from "./types.ts";

/**
 * FileData 群を institution_id 解決済みの upsert 行に変換する。
 * キーマップに無い施設はスキップして unmatchedKeys に集約（従来は silent drop だったものを可観測化）。
 * (institution_id, date) の重複は先勝ち（Hasura の同一コマンド内重複制約対応。従来ロジック踏襲）。
 */
export function buildReservationRows(
  files: FileData[],
  keyMap: InstitutionKeyMap
): { rows: ReservationRow[]; unmatchedKeys: string[] } {
  const rows: ReservationRow[] = [];
  const seen = new Set<string>();
  const unmatched = new Set<string>();
  for (const { facility_name, data } of files) {
    for (const { room_name, date, reservation } of data) {
      const key = `${facility_name}-${room_name}`;
      const institutionId = keyMap[key];
      if (!institutionId) {
        unmatched.add(key);
        continue;
      }
      const dedupeKey = `${institutionId} ${date}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({ institution_id: institutionId, date, reservation });
    }
  }
  return { rows, unmatchedKeys: [...unmatched] };
}
