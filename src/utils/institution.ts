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

const STRINGS = "s";
const WOODWIND = "w";
const BRASS = "b";
const PERCUSSION = "p";

export const AVAILABLE_INSTRUMENT_MAP = {
  [STRINGS]: "弦楽器",
  [WOODWIND]: "木管楽器",
  [BRASS]: "金管楽器",
  [PERCUSSION]: "打楽器",
} as const;

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
  municipality: ReturnType<typeof getMunicipalityFromUrlParam>;
  availableInstruments: ReturnType<typeof getAvailableInstrumentFromUrlParam>;
};

export const toInstitutionSearchParams = (
  m: string | null | undefined,
  a: string[] | null | undefined
): InstitutionSearchParams => {
  return {
    municipality: getMunicipalityFromUrlParam(m),
    availableInstruments: getAvailableInstrumentFromUrlParam(a),
  };
};

export const toInstitutionQueryVariables = ({
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
    offset: 0,
    limit: ROWS_PER_PAGE,
    municipality: municipality !== SELECT_OPTION_ALL ? [municipality] : null,
    isAvailableStrings: isAvailableStrings ? AvailabilityDivision.AVAILABLE : null,
    isAvailableBrass: isAvailableBrass ? AvailabilityDivision.AVAILABLE : null,
    isAvailableWoodwind: isAvailableWoodwind ? AvailabilityDivision.AVAILABLE : null,
    isAvailablePercussion: isAvailablePercussion ? AvailabilityDivision.AVAILABLE : null,
  };
};
