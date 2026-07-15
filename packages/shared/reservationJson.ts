/**
 * reservation マップを正規形（キー辞書順・空白なし）の JSON 文字列にする。
 * D1 の差分 upsert はテキスト比較で変化を検知するため、書き込み経路は必ずこれを通す。
 * 値のドメインは division キー → status 文字列のフラットなマップのみ（ネストしない）。
 */
export function canonicalizeReservation(reservation: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(reservation).sort()) {
    sorted[key] = reservation[key] as string;
  }
  return JSON.stringify(sorted);
}
