import { InstitutionsQueryVariables } from "../api/graphql-client";
import { AvailabilityDivision, FeeDivision } from "../constants/enums";
import { MUNICIPALITY, PAGE, ROWS_PER_PAGE, SELECT_OPTION_ALL } from "../constants/search";
import { formatPrice } from "./format";
import { FeeDivisionMap, SupportedMunicipality } from "./municipality";
import { getMunicipalityFromUrlParam, getPageFromUrlParam } from "./search";

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
  municipality: string | undefined,
  usageFee: { division: string; fee: string }[] | undefined
): string => {
  if (!municipality || !usageFee?.length) {
    return "";
  }
  return usageFee
    .map(
      ({ division, fee }) =>
        `${FeeDivisionMap[municipality]?.[division] ?? ""}: ${formatPrice(fee)}`
    )
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
  municipality: SupportedMunicipality | typeof SELECT_OPTION_ALL;
  availableInstruments: AvailableInstrument[];
};

export const toInstitutionSearchParams = (
  urlSearchParams: URLSearchParams
): InstitutionSearchParams => {
  return {
    page: getPageFromUrlParam(urlSearchParams.get(PAGE)),
    municipality:
      getMunicipalityFromUrlParam(urlSearchParams.get(MUNICIPALITY)) ?? SELECT_OPTION_ALL,
    availableInstruments: getAvailableInstrumentFromUrlParam(
      urlSearchParams.getAll(AVAILABLE_INSTRUMENTS)
    ),
  };
};

export const toInstitutionQueryVariables = ({
  page,
  municipality,
  availableInstruments,
}: InstitutionSearchParams): InstitutionsQueryVariables => {
  const [isAvailableStrings, isAvailableWoodwind, isAvailableBrass, isAvailablePercussion] = [
    availableInstruments.includes(STRINGS),
    availableInstruments.includes(WOODWIND),
    availableInstruments.includes(BRASS),
    availableInstruments.includes(PERCUSSION),
  ];
  return {
    offset: page * ROWS_PER_PAGE,
    limit: ROWS_PER_PAGE,
    municipality: municipality !== SELECT_OPTION_ALL ? [municipality] : null,
    isAvailableStrings: isAvailableStrings ? AvailabilityDivision.AVAILABLE : null,
    isAvailableBrass: isAvailableBrass ? AvailabilityDivision.AVAILABLE : null,
    isAvailableWoodwind: isAvailableWoodwind ? AvailabilityDivision.AVAILABLE : null,
    isAvailablePercussion: isAvailablePercussion ? AvailabilityDivision.AVAILABLE : null,
  };
};
