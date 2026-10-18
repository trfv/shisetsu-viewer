// scraper の DIVISION_MAP は参照しない。参照すると変換テーブルの誤りを判定器が再現し、
// silent failure 検出器としての独立性を失う。

export type Band = "morning" | "afternoon" | "evening";

const DIVISION_PREFIX = "RESERVATION_DIVISION_";

function normalizeRange(label: string): string {
  return label
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .replace(/[～〜\-−ー]/g, "-")
    .replace(/\s+/g, "");
}

// 片側だけの "9:00" や「午後1」を時刻と誤読しないよう、開始と終了の両方を要求する。
const RANGE_PATTERN = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

export function parseStartHour(label: string): number | null {
  const matched = RANGE_PATTERN.exec(normalizeRange(label));
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  const endHour = Number(matched[3]);
  const endMinute = Number(matched[4]);
  if (hour > 23 || minute > 59 || endHour > 23 || endMinute > 59) return null;
  return hour;
}

// 境界 12 / 17 は 3 自治体の実データで enum 名由来の band と矛盾しないことを確かめた値。
export function bandFromHour(hour: number): Band {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// 時間帯の意味を持たない名前や INVALID を morning などに丸めると異常が判定から消える。
// null を返して呼び出し側で UNMAPPED に落とす。
export function bandFromDivisionEnum(division: string): Band | null {
  if (!division.startsWith(DIVISION_PREFIX)) return null;
  const name = division.slice(DIVISION_PREFIX.length);
  if (name.startsWith("MORNING")) return "morning";
  if (name.startsWith("AFTERNOON")) return "afternoon";
  if (name.startsWith("EVENING")) return "evening";
  return null;
}
