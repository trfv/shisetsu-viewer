import { isAfter, isBefore, isValid } from "date-fns";
import { TokyoWard } from "../constants/enums";
import { SupportedTokyoWard } from "./enums";

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

const TOKTO_WARD_URL_PARAMS: Readonly<Record<string, SupportedTokyoWard>> = {
  koutou: TokyoWard.KOUTOU,
  bunkyo: TokyoWard.BUNKYO,
  kita: TokyoWard.KITA,
  toshima: TokyoWard.TOSHIMA,
  edogawa: TokyoWard.EDOGAWA,
};

export const getTokyoWardFromUrlParam = (param: string | null | undefined): SupportedTokyoWard => {
  return param ? TOKTO_WARD_URL_PARAMS[param] ?? TokyoWard.INVALID : TokyoWard.INVALID;
};

export const convertTokyoWardToUrlParam = (tokyoWard: SupportedTokyoWard): string => {
  return tokyoWard === TokyoWard.INVALID ? "" : tokyoWard.replace("TOKYO_WARD_", "").toLowerCase();
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
