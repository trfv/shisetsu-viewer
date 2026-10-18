const WAREKI_MAP = {
  昭和: 1925,
  平成: 1988,
  令和: 2018,
} as const;

type Wareki = keyof typeof WAREKI_MAP;

function warekiToSeireki(wareki: Wareki, year: string): number {
  return WAREKI_MAP[wareki] + Number(year === "元" ? 1 : year);
}

export function toISODateString(dateString: string): string {
  const [year, month, day] = dateString.split(/年|月|日/).flatMap((part) => {
    const match = part.match(/[\d|元]+/);
    return match ? [match[0]] : [];
  }) as [string, string, string];

  const wareki = dateString.match(/(昭和|平成|令和)/)?.[0] as Wareki | undefined;
  const seireki = wareki ? warekiToSeireki(wareki, year) : Number(year);

  return `${seireki}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
