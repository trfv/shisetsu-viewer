import type { InstitutionsQueryVariables } from "../api/queries";
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

type InstitutionSearchParams = {
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
  return {
    first: 100,
    after: null,
    municipality:
      municipality !== SELECT_OPTION_ALL
        ? [municipality]
        : SupportedMunicipalities.map((m) => m.toString()),
    isAvailableStrings: availableInstruments.includes(STRINGS)
      ? AvailabilityDivision.AVAILABLE
      : null,
    isAvailableWoodwind: availableInstruments.includes(WOODWIND)
      ? AvailabilityDivision.AVAILABLE
      : null,
    isAvailableBrass: availableInstruments.includes(BRASS) ? AvailabilityDivision.AVAILABLE : null,
    isAvailablePercussion: availableInstruments.includes(PERCUSSION)
      ? AvailabilityDivision.AVAILABLE
      : null,
    institutionSizes: toInstitutionSizeParam(institutionSizes) || null,
  };
};
