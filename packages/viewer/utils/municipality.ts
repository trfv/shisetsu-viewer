import {
  getReservationLabels,
  MUNICIPALITIES,
  type MunicipalityKey,
} from "@shisetsu-viewer/shared";

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
  "MUNICIPALITY_NAKANO",
  "MUNICIPALITY_CHUO",
  "MUNICIPALITY_SHINAGAWA",
  "MUNICIPALITY_SHINJUKU",
  "MUNICIPALITY_MEGURO",
  "MUNICIPALITY_SETAGAYA",
  "MUNICIPALITY_MINATO",
  "MUNICIPALITY_ADACHI",
  "MUNICIPALITY_KATSUSHIKA",
  "MUNICIPALITY_TAITO",
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

export type LabelSource = {
  municipality: string;
  reservation_system?: string | null | undefined;
  division_labels?: Partial<Record<string, string>> | undefined;
};

const labelsOf = (source: LabelSource) =>
  getReservationLabels(source.reservation_system, source.municipality);

// 部屋の division_labels を先に見る。同じ予約システムでも部屋ごとに時刻が違う館がある。
export const getReservationDivisionLabel = (
  source: LabelSource,
  division: string
): string | undefined =>
  source.division_labels?.[division] ?? labelsOf(source)?.reservationDivision[division];

export const getReservationStatusLabel = (
  source: LabelSource,
  status: string
): string | undefined => labelsOf(source)?.reservationStatus[status];

export const getFeeDivisionLabel = (source: LabelSource, division: string): string | undefined =>
  labelsOf(source)?.feeDivision[division];

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
