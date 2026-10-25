import { MUNICIPALITIES, type MunicipalityKey } from "@shisetsu-viewer/shared";

export const SupportedMunicipalities = [
  "MUNICIPALITY_KOUTOU",
  "MUNICIPALITY_BUNKYO",
  "MUNICIPALITY_KITA",
  "MUNICIPALITY_TOSHIMA",
  "MUNICIPALITY_EDOGAWA",
  "MUNICIPALITY_ARAKAWA",
  "MUNICIPALITY_SUMIDA",
  "MUNICIPALITY_OTA",
  "MUNICIPALITY_SUGINAMI",
  "MUNICIPALITY_CHUO",
  "MUNICIPALITY_SHINAGAWA",
  "MUNICIPALITY_MEGURO",
  "MUNICIPALITY_MINATO",
  "MUNICIPALITY_ADACHI",
  "MUNICIPALITY_KATSUSHIKA",
  "MUNICIPALITY_KAWASAKI",
] as const satisfies readonly MunicipalityKey[];

export type SupportedMunicipality = (typeof SupportedMunicipalities)[number];

export const SupportedMunicipalityMap: Record<string, string> = Object.fromEntries(
  SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].label])
);

export const RESERVATION_EXCLUDED_MUNICIPALITIES: SupportedMunicipality[] =
  SupportedMunicipalities.filter(
    (k) => MUNICIPALITIES[k].reservationExcluded
  ) as SupportedMunicipality[];

export const RESERVATION_MUNICIPALITIES: SupportedMunicipality[] = SupportedMunicipalities.filter(
  (k) => !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(k)
);

const ReservationDivisionMap: Readonly<Record<string, Record<string, string>>> = Object.fromEntries(
  SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].reservationDivision])
);

// 施設単位ラベルを優先する。同じ自治体の別予約システムが同じ区分に別の時刻を持つことがある。
export const getReservationDivisionLabel = (
  municipality: string,
  division: string,
  divisionLabels?: Partial<Record<string, string>>
): string | undefined =>
  divisionLabels?.[division] ?? ReservationDivisionMap[municipality]?.[division];

export const FeeDivisionMap: Readonly<Record<string, Record<string, string>>> = Object.fromEntries(
  SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].feeDivision])
);

export const ReservationStatusMap: Readonly<Record<string, Record<string, string>>> =
  Object.fromEntries(SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].reservationStatus]));

// 全部外した状態を空配列で表すと m ごと消え、全地区に戻ってしまう。
const NO_MUNICIPALITY = "none";

export const getMunicipalitiesFromUrlParam = (
  params: (string | null)[] | null | undefined,
  candidates: readonly SupportedMunicipality[]
): SupportedMunicipality[] => {
  if (params?.includes(NO_MUNICIPALITY)) {
    return [];
  }
  const selected = candidates.filter((k) => params?.includes(MUNICIPALITIES[k].slug));
  return selected.length > 0 ? selected : [...candidates];
};

// 全選択は m を消して表す。地区を足したとき、既存のリンクにも新しい地区が入る。
export const toMunicipalityUrlParam = (
  municipalities: SupportedMunicipality[],
  candidates: readonly SupportedMunicipality[]
): string[] | null => {
  if (municipalities.length === 0) {
    return [NO_MUNICIPALITY];
  }
  if (candidates.every((k) => municipalities.includes(k))) {
    return null;
  }
  return municipalities.map((k) => MUNICIPALITIES[k].slug);
};
