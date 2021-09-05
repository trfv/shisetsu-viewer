import { InstitutionsQueryVariables } from "../api/graphql-client";
import { ROWS_PER_PAGE } from "../constants/datatable";
import { AvailabilityDivision } from "../constants/enums";
import { formatPrice } from "./format";
import { FeeDivisionMap, getMunicipalityFromUrlParam, SELECT_OPTION_ALL } from "./municipality";

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

export const STRINGS = "s";
export const WOODWIND = "w";
export const BRASS = "b";
export const PERCUSSION = "p";

export const AvailableInstruments = [STRINGS, WOODWIND, BRASS, PERCUSSION] as const;
export type AvailableInstrument = typeof AvailableInstruments[number];

const getAvailableInstrumentFromUrlParam = (
  availableInstruments: string[] | null | undefined
): AvailableInstrument[] => {
  return (availableInstruments ?? []).filter((instrument) =>
    AvailableInstruments.some((i) => instrument === i)
  ) as AvailableInstrument[];
};

export type InstitutionSearchParams = {
  page: number;
  municipality: ReturnType<typeof getMunicipalityFromUrlParam>;
  availableInstruments: ReturnType<typeof getAvailableInstrumentFromUrlParam>;
};

export const toInstitutionSearchParams = (
  p: number | null | undefined,
  m: string | null | undefined,
  a: string[] | null | undefined
): InstitutionSearchParams => {
  return {
    page: p ?? 0,
    municipality: getMunicipalityFromUrlParam(m),
    availableInstruments: getAvailableInstrumentFromUrlParam(a),
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
