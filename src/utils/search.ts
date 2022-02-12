import { InstitutionSize as InstitutionSizeEnum } from "../constants/enums";
import { InstitutionSizeMap } from "./enums";

export const STRINGS = "s";
export const WOODWIND = "w";
export const BRASS = "b";
export const PERCUSSION = "p";

export const AVAILABLE_INSTRUMENT_MAP = {
  [STRINGS]: "弦楽器",
  [WOODWIND]: "木管楽器",
  [BRASS]: "金管楽器",
  [PERCUSSION]: "打楽器",
} as const;

export const AvailableInstruments = [STRINGS, WOODWIND, BRASS, PERCUSSION] as const;
export type AvailableInstrument = typeof AvailableInstruments[number];

export const getAvailableInstrumentFromUrlParam = (
  availableInstruments: (string | null)[] | null | undefined
): AvailableInstrument[] => {
  return (availableInstruments ?? []).filter((instrument) =>
    AvailableInstruments.some((i) => instrument === i)
  ) as AvailableInstrument[];
};

export const LARGE = "l";
export const MEDIUM = "m";
export const SMALL = "s";

export const INSTUTITON_SIZE_MAP = {
  [LARGE]: InstitutionSizeMap[InstitutionSizeEnum.LARGE],
  [MEDIUM]: InstitutionSizeMap[InstitutionSizeEnum.MEDIUM],
  [SMALL]: InstitutionSizeMap[InstitutionSizeEnum.SMALL],
} as const;

export const InstitutionSizes = [LARGE, MEDIUM, SMALL] as const;
export type InstitutionSize = typeof InstitutionSizes[number];

export const getInstitutionSizeFromUrlParam = (
  institutionSizes: (string | null)[] | null | undefined
): InstitutionSize[] => {
  return (institutionSizes ?? []).filter((instrument) =>
    InstitutionSizes.some((i) => instrument === i)
  ) as InstitutionSize[];
};

export const INSTUTITON_SIZE_PARAM_MAP = {
  [LARGE]: InstitutionSizeEnum.LARGE,
  [MEDIUM]: InstitutionSizeEnum.MEDIUM,
  [SMALL]: InstitutionSizeEnum.SMALL,
} as const;

export const toInstitutionSizeParam = (
  institutionSizes: InstitutionSize[]
): InstitutionSizeEnum[] | undefined => {
  const params = institutionSizes.map((s) => INSTUTITON_SIZE_PARAM_MAP[s]).filter((s) => !!s);
  return params.length > 0 ? params : undefined;
};
