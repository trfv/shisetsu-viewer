import {
  ARAKAWA_FEE_DIVISION,
  ARAKAWA_RESERVATION_DIVISION,
  ARAKAWA_RESERVATION_STATUS,
} from "../constants/municipality/arakawa";
import {
  BUNKYO_FEE_DIVISION,
  BUNKYO_RESERVATION_DIVISION,
  BUNKYO_RESERVATION_STATUS,
} from "../constants/municipality/bunkyo";
import {
  EDOGAWA_FEE_DIVISION,
  EDOGAWA_RESERVATION_DIVISION,
  EDOGAWA_RESERVATION_STATUS,
} from "../constants/municipality/edogawa";
import {
  KITA_FEE_DIVISION,
  KITA_RESERVATION_DIVISION,
  KITA_RESERVATION_STATUS,
} from "../constants/municipality/kita";
import {
  KOUTOU_FEE_DIVISION,
  KOUTOU_RESERVATION_DIVISION,
  KOUTOU_RESERVATION_STATUS,
} from "../constants/municipality/koutou";
import {
  SUMIDA_FEE_DIVISION,
  SUMIDA_RESERVATION_DIVISION,
  SUMIDA_RESERVATION_STATUS,
} from "../constants/municipality/sumida";
import {
  TOSHIMA_FEE_DIVISION,
  TOSHIMA_RESERVATION_DIVISION,
  TOSHIMA_RESERVATION_STATUS,
} from "../constants/municipality/toshima";

export const SupportedMunicipalities = [
  "MUNICIPALITY_KOUTOU",
  "MUNICIPALITY_BUNKYO",
  "MUNICIPALITY_KITA",
  "MUNICIPALITY_TOSHIMA",
  "MUNICIPALITY_EDOGAWA",
  "MUNICIPALITY_ARAKAWA",
  "MUNICIPALITY_SUMIDA",
] as const;

export type SupportedMunicipality = typeof SupportedMunicipalities[number];

export const SupportedMunicipalityMap: Record<string, string> = {
  MUNICIPALITY_ARAKAWA: "荒川区",
  MUNICIPALITY_BUNKYO: "文京区",
  MUNICIPALITY_EDOGAWA: "江戸川区",
  MUNICIPALITY_KITA: "北区",
  MUNICIPALITY_KOUTOU: "江東区",
  MUNICIPALITY_TOSHIMA: "豊島区",
  MUNICIPALITY_SUMIDA: "墨田区",
};

export const SELECT_OPTION_ALL = "all";

export const MunicipalityOptions: { value: string; label: string }[] = [
  { value: SELECT_OPTION_ALL, label: "すべて" },
].concat(
  Object.entries(SupportedMunicipalityMap).map(([k, v]) => ({
    value: k,
    label: v,
  }))
);

export const ReservationDivisionMap: Readonly<Record<string, Record<string, string>>> = {
  MUNICIPALITY_KOUTOU: KOUTOU_RESERVATION_DIVISION,
  MUNICIPALITY_BUNKYO: BUNKYO_RESERVATION_DIVISION,
  MUNICIPALITY_KITA: KITA_RESERVATION_DIVISION,
  MUNICIPALITY_TOSHIMA: TOSHIMA_RESERVATION_DIVISION,
  MUNICIPALITY_EDOGAWA: EDOGAWA_RESERVATION_DIVISION,
  MUNICIPALITY_ARAKAWA: ARAKAWA_RESERVATION_DIVISION,
  MUNICIPALITY_SUMIDA: SUMIDA_RESERVATION_DIVISION,
};

export const FeeDivisionMap: Readonly<Record<string, Record<string, string>>> = {
  MUNICIPALITY_KOUTOU: KOUTOU_FEE_DIVISION,
  MUNICIPALITY_BUNKYO: BUNKYO_FEE_DIVISION,
  MUNICIPALITY_KITA: KITA_FEE_DIVISION,
  MUNICIPALITY_TOSHIMA: TOSHIMA_FEE_DIVISION,
  MUNICIPALITY_EDOGAWA: EDOGAWA_FEE_DIVISION,
  MUNICIPALITY_ARAKAWA: ARAKAWA_FEE_DIVISION,
  MUNICIPALITY_SUMIDA: SUMIDA_FEE_DIVISION,
};

export const ReservationStatusMap: Readonly<Record<string, Record<string, string>>> = {
  MUNICIPALITY_KOUTOU: KOUTOU_RESERVATION_STATUS,
  MUNICIPALITY_BUNKYO: BUNKYO_RESERVATION_STATUS,
  MUNICIPALITY_KITA: KITA_RESERVATION_STATUS,
  MUNICIPALITY_TOSHIMA: TOSHIMA_RESERVATION_STATUS,
  MUNICIPALITY_EDOGAWA: EDOGAWA_RESERVATION_STATUS,
  MUNICIPALITY_ARAKAWA: ARAKAWA_RESERVATION_STATUS,
  MUNICIPALITY_SUMIDA: SUMIDA_RESERVATION_STATUS,
};

const MUNICIPALITY_URL_PARAMS: Readonly<Record<string, SupportedMunicipality>> = {
  koutou: "MUNICIPALITY_KOUTOU",
  bunkyo: "MUNICIPALITY_BUNKYO",
  kita: "MUNICIPALITY_KITA",
  toshima: "MUNICIPALITY_TOSHIMA",
  edogawa: "MUNICIPALITY_EDOGAWA",
  arakawa: "MUNICIPALITY_ARAKAWA",
  sumida: "MUNICIPALITY_SUMIDA",
};

export const getMunicipalityFromUrlParam = (
  param: string | null | undefined
): SupportedMunicipality | typeof SELECT_OPTION_ALL => {
  return param ? MUNICIPALITY_URL_PARAMS[param] ?? SELECT_OPTION_ALL : SELECT_OPTION_ALL;
};

export const convertMunicipalityToUrlParam = (
  municipality: string | null | undefined
): string | null => {
  return municipality?.replace("MUNICIPALITY_", "").toLowerCase() ?? null;
};
