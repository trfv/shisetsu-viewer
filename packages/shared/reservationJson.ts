/** D1 の差分 upsert はテキスト比較で変化を検知するので、書き込み経路は必ずこれを通す */
export function canonicalizeReservation(reservation: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(reservation).sort()) {
    sorted[key] = reservation[key] as string;
  }
  return JSON.stringify(sorted);
}
