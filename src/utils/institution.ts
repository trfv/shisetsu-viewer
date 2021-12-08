import { InstitutionsQueryVariables } from "../api/graphql-client";
import { AvailabilityDivision } from "../constants/enums";
import { formatPrice } from "./format";
import { FeeDivisionMap, getMunicipalityFromUrlParam, SELECT_OPTION_ALL } from "./municipality";
import { BRASS, getAvailableInstrumentFromUrlParam, PERCUSSION, STRINGS, WOODWIND } from "./search";

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
    limit: 100,
    municipality: municipality !== SELECT_OPTION_ALL ? [municipality] : null,
    isAvailableStrings: isAvailableStrings ? AvailabilityDivision.AVAILABLE : null,
    isAvailableBrass: isAvailableBrass ? AvailabilityDivision.AVAILABLE : null,
    isAvailableWoodwind: isAvailableWoodwind ? AvailabilityDivision.AVAILABLE : null,
    isAvailablePercussion: isAvailablePercussion ? AvailabilityDivision.AVAILABLE : null,
  };
};
