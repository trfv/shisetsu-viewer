/** windowJst は JST の時の半開区間 [start, end) */
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
