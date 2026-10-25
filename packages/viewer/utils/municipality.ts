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

export const getMunicipalitiesFromUrlParam = (
  params: (string | null)[] | null | undefined
): SupportedMunicipality[] =>
  SupportedMunicipalities.filter((k) => params?.includes(MUNICIPALITIES[k].slug));

export const toMunicipalityUrlParam = (municipalities: SupportedMunicipality[]): string[] =>
  municipalities.map((k) => MUNICIPALITIES[k].slug);
