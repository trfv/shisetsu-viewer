import { InstitutionQueryVariables } from "../api/graphql-client";
import { AvailabilityDivision, FeeDivision, TokyoWard } from "../constants/enums";
import { PAGE, ROWS_PER_PAGE, TOKYO_WARD } from "../constants/search";
import { FeeDivisionMap, SupportedTokyoWard, SupportedTokyoWards } from "./enums";
import { formatPrice } from "./format";
import { getPageFromUrlParam, getTokyoWardFromUrlParam } from "./search";

const FEE_DIVISION_ORDER = {
  [FeeDivision.INVALID]: 0,
  [FeeDivision.MORNING]: 1,
  [FeeDivision.MORNING_ONE]: 2,
  [FeeDivision.MORNING_TWO]: 3,
  [FeeDivision.AFTERNOON]: 4,
  [FeeDivision.AFTERNOON_ONE]: 5,
  [FeeDivision.AFTERNOON_TWO]: 6,
  [FeeDivision.EVENING]: 7,
  [FeeDivision.EVENING_ONE]: 8,
  [FeeDivision.EVENING_TWO]: 9,
  [FeeDivision.ONE_HOUR]: 10,
  [FeeDivision.TWO_HOUR]: 11,
  [FeeDivision.DIVISION_1]: 12,
  [FeeDivision.DIVISION_2]: 13,
  [FeeDivision.DIVISION_3]: 14,
  [FeeDivision.DIVISION_4]: 15,
  [FeeDivision.DIVISION_5]: 16,
  [FeeDivision.DIVISION_6]: 17,
  [FeeDivision.DIVISION_7]: 18,
  [FeeDivision.DIVISION_8]: 19,
  [FeeDivision.DIVISION_9]: 20,
  [FeeDivision.DIVISION_10]: 21,
};

type FeeDivisionKey = keyof typeof FEE_DIVISION_ORDER;

// key に FeeDivision を利用している Object をソートした配列で返す
export const sortByFeeDivision = (obj: Record<string, string>): [string, string][] => {
  return Object.entries(obj).sort(
    ([a], [b]) => FEE_DIVISION_ORDER[a as FeeDivisionKey] - FEE_DIVISION_ORDER[b as FeeDivisionKey]
  );
};

export const formatUsageFee = (
  tokyoWard: SupportedTokyoWard,
  feeMap: Record<string, string>
): string => {
  if (!feeMap) {
    return "";
  }
  return sortByFeeDivision(feeMap)
    .map(([division, fee]) => `${FeeDivisionMap[tokyoWard]?.[division] ?? ""}: ${formatPrice(fee)}`)
    .join(" ");
};

export const getGoogleMapLink = (address: string): string => {
  return `https://www.google.com/maps/search/?api=1&query=${address}`;
};

export const AVAILABLE_INSTRUMENTS = "a";

export const STRINGS = "s";
export const WOODWIND = "w";
export const BRASS = "b";
export const PERCUSSION = "p";

export const AvailableInstruments = [STRINGS, WOODWIND, BRASS, PERCUSSION] as const;
export type AvailableInstrument = typeof AvailableInstruments[number];

const getAvailableInstrumentFromUrlParam = (
  availableInstruments: string[]
): AvailableInstrument[] => {
  return availableInstruments.filter((instrument) =>
    AvailableInstruments.some((i) => instrument === i)
  ) as AvailableInstrument[];
};

export type InstitutionSearchParams = {
  page: number;
  tokyoWard: SupportedTokyoWard;
  availableInstruments: AvailableInstrument[];
};

export const toInstitutionSearchParams = (
  urlSearchParams: URLSearchParams
): InstitutionSearchParams => {
  return {
    page: getPageFromUrlParam(urlSearchParams.get(PAGE)),
    tokyoWard: getTokyoWardFromUrlParam(urlSearchParams.get(TOKYO_WARD)),
    availableInstruments: getAvailableInstrumentFromUrlParam(
      urlSearchParams.getAll(AVAILABLE_INSTRUMENTS)
    ),
  };
};

export const toInstitutionQueryVariables = ({
  page,
  tokyoWard,
  availableInstruments,
}: InstitutionSearchParams): InstitutionQueryVariables => {
  const [isAvailableStrings, isAvailableWoodwind, isAvailableBrass, isAvailablePercussion] = [
    availableInstruments.includes(STRINGS),
    availableInstruments.includes(WOODWIND),
    availableInstruments.includes(BRASS),
    availableInstruments.includes(PERCUSSION),
  ];
  return {
    offset: page * ROWS_PER_PAGE,
    limit: ROWS_PER_PAGE,
    tokyoWard: tokyoWard === TokyoWard.INVALID ? SupportedTokyoWards : [tokyoWard],
    isAvailableStrings: isAvailableStrings ? AvailabilityDivision.AVAILABLE : null,
    isAvailableBrass: isAvailableBrass ? AvailabilityDivision.AVAILABLE : null,
    isAvailableWoodwind: isAvailableWoodwind ? AvailabilityDivision.AVAILABLE : null,
    isAvailablePercussion: isAvailablePercussion ? AvailabilityDivision.AVAILABLE : null,
  };
};
