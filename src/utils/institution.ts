import type { InstitutionsQueryVariables } from "../api/graphql-client";
import { AvailabilityDivision } from "../constants/enums";
import { formatPrice } from "./format";
import {
  FeeDivisionMap,
  getMunicipalityFromUrlParam,
  SELECT_OPTION_ALL,
  SupportedMunicipalities,
} from "./municipality";
import {
  BRASS,
  getAvailableInstrumentFromUrlParam,
  getInstitutionSizeFromUrlParam,
  PERCUSSION,
  STRINGS,
  toInstitutionSizeParam,
  WOODWIND,
} from "./search";

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
  institutionSizes: ReturnType<typeof getInstitutionSizeFromUrlParam>;
};

export const toInstitutionSearchParams = (
  m: string | null | undefined,
  a: (string | null)[] | null | undefined,
  i: (string | null)[] | null | undefined
): InstitutionSearchParams => {
  return {
    municipality: getMunicipalityFromUrlParam(m),
    availableInstruments: getAvailableInstrumentFromUrlParam(a),
    institutionSizes: getInstitutionSizeFromUrlParam(i),
  };
};

export const toInstitutionQueryVariables = ({
  municipality,
  availableInstruments,
  institutionSizes,
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
    municipality:
      municipality !== SELECT_OPTION_ALL
        ? [municipality]
        : SupportedMunicipalities.map((m) => m.toString()),
    isAvailableStrings: isAvailableStrings ? AvailabilityDivision.AVAILABLE : null,
    isAvailableBrass: isAvailableBrass ? AvailabilityDivision.AVAILABLE : null,
    isAvailableWoodwind: isAvailableWoodwind ? AvailabilityDivision.AVAILABLE : null,
    isAvailablePercussion: isAvailablePercussion ? AvailabilityDivision.AVAILABLE : null,
    institutionSizes: toInstitutionSizeParam(institutionSizes) || null,
  };
};
