import type { FileData, InstitutionKeyMap, ReservationRow } from "./types.ts";

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
