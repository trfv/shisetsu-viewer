import { isAfter, isBefore, isValid } from "date-fns";
import { SupportedMunicipality } from "./municipality";

export const getPageFromUrlParam = (page: string | null | undefined) => {
  if (isNaN(Number(page))) {
    return 0;
  }
  return parseInt(page || "0", 10);
};

export const getDateFromUrlParam = (
  date: string | null | undefined,
  min: Date,
  max: Date
): Date | null => {
  if (!date || !isValid(new Date(date))) {
    return null;
  }
  const tmp = new Date(date);
  return isBefore(tmp, min) || isAfter(tmp, max) ? null : tmp;
};

const MUNICIPALITY_URL_PARAMS: Readonly<Record<string, SupportedMunicipality>> = {
  koutou: "MUNICIPALITY_KOUTOU",
  bunkyo: "MUNICIPALITY_BUNKYO",
  kita: "MUNICIPALITY_KITA",
  toshima: "MUNICIPALITY_TOSHIMA",
  edogawa: "MUNICIPALITY_EDOGAWA",
  arakawa: "MUNICIPALITY_ARAKAWA",
};

export const getMunicipalityFromUrlParam = (
  param: string | null | undefined
): SupportedMunicipality | null => {
  return param ? MUNICIPALITY_URL_PARAMS[param] ?? null : null;
};

export const convertMunicipalityToUrlParam = (
  municipality: string | null | undefined
): string | null => {
  return municipality?.replace("MUNICIPALITY_", "").toLowerCase() ?? null;
};

export const setUrlSearchParams = (
  urlSearchParams: URLSearchParams,
  setParams: { [key: string]: string | undefined | (string | undefined)[] },
  deleteKeys: string[]
) => {
  deleteKeys.forEach((key) => urlSearchParams.delete(key));
  Object.entries(setParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      urlSearchParams.delete(key);
      value.forEach((v) => v && urlSearchParams.append(key, v));
    } else {
      value ? urlSearchParams.set(key, value) : urlSearchParams.delete(key);
    }
  });
  return urlSearchParams;
};
