import { MUNICIPALITIES, type MunicipalityKey } from "@shisetsu-viewer/shared";

// Derive SupportedMunicipalities from the registry in the original order
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
  "MUNICIPALITY_KAWASAKI",
] as const satisfies readonly MunicipalityKey[];

export type SupportedMunicipality = (typeof SupportedMunicipalities)[number];

export const SupportedMunicipalityMap: Record<string, string> = Object.fromEntries(
  SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].label])
);

export const SELECT_OPTION_ALL = "all";

export const RESERVATION_EXCLUDED_MUNICIPALITIES: SupportedMunicipality[] =
  SupportedMunicipalities.filter(
    (k) => MUNICIPALITIES[k].reservationExcluded
  ) as SupportedMunicipality[];

export const MunicipalityOptions: { value: string; label: string }[] = [
  { value: SELECT_OPTION_ALL, label: "すべて" },
].concat(Object.entries(SupportedMunicipalityMap).map(([k, v]) => ({ value: k, label: v })));

export const ReservationDivisionMap: Readonly<Record<string, Record<string, string>>> =
  Object.fromEntries(
    SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].reservationDivision])
  );

export const FeeDivisionMap: Readonly<Record<string, Record<string, string>>> = Object.fromEntries(
  SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].feeDivision])
);

export const ReservationStatusMap: Readonly<Record<string, Record<string, string>>> =
  Object.fromEntries(SupportedMunicipalities.map((k) => [k, MUNICIPALITIES[k].reservationStatus]));

const MUNICIPALITY_URL_PARAMS: Readonly<Record<string, SupportedMunicipality>> = Object.fromEntries(
  SupportedMunicipalities.map((k) => [MUNICIPALITIES[k].slug, k])
) as Record<string, SupportedMunicipality>;

export const getMunicipalityFromUrlParam = (
  param: string | null | undefined
): SupportedMunicipality | typeof SELECT_OPTION_ALL => {
  return param ? (MUNICIPALITY_URL_PARAMS[param] ?? SELECT_OPTION_ALL) : SELECT_OPTION_ALL;
};

export const convertMunicipalityToUrlParam = (
  municipality: string | null | undefined
): string | null => {
  return municipality?.replace("MUNICIPALITY_", "").toLowerCase() ?? null;
};
