/**
 * 和暦と西暦の対応表
 */
const WAREKI_MAP = {
  昭和: 1925,
  平成: 1988,
  令和: 2018,
} as const;

type Wareki = keyof typeof WAREKI_MAP;

/**
 * 和暦を西暦に変換する
 * @param wareki - 和暦（昭和|平成|令和）
 * @param year - 和暦の年（"元" または数字）
 * @returns 西暦
 */
function warekiToSeireki(wareki: Wareki, year: string): number {
  return WAREKI_MAP[wareki] + Number(year === "元" ? 1 : year);
}

/**
 * 年月日を表す文字列をISO形式の日付文字列に変換する
 * 和暦が含まれている場合は西暦に変換する
 * @param dateString - 年月日を表す文字列 (例: "2023年4月1日" or "令和5年4月1日")
 * @returns ISO形式の日付文字列 (例: "2023-04-01")
 */
export function toISODateString(dateString: string): string {
  const [year, month, day] = dateString.split(/年|月|日/).flatMap((part) => {
    const match = part.match(/[\d|元]+/);
    return match ? [match[0]] : [];
  }) as [string, string, string];

  const wareki = dateString.match(/(昭和|平成|令和)/)?.[0] as Wareki | undefined;
  const seireki = wareki ? warekiToSeireki(wareki, year) : Number(year);

  return `${seireki}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
