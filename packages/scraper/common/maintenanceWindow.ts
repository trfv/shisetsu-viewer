/**
 * registry の `maintenanceWindowJst`（JST の時、半開区間 [start, end)）に
 * 現在時刻が入っているかを判定する純関数。
 *
 * end < start の場合は日を跨ぐ窓として扱う（例 [22, 5) = 22 時〜翌 5 時）。
 */
export function isWithinMaintenanceWindow(
  windowJst: readonly [number, number],
  date: Date = new Date()
): boolean {
  const [start, end] = windowJst;
  const jstHour = (date.getUTCHours() + 9) % 24;
  if (start <= end) {
    return jstHour >= start && jstHour < end;
  }
  // 日跨ぎ窓
  return jstHour >= start || jstHour < end;
}
