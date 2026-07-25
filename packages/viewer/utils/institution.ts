import type { InstitutionsQueryParams, UsageFeeEntry } from "@shisetsu-viewer/shared";

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
  usageFee: UsageFeeEntry[] | undefined
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

export const toInstitutionQueryParams = ({
  municipality,
  availableInstruments,
  institutionSizes,
}: InstitutionSearchParams): InstitutionsQueryParams => {
  return {
    limit: 100,
    municipality:
      municipality !== SELECT_OPTION_ALL
        ? [municipality]
        : SupportedMunicipalities.map((m) => m.toString()),
    isAvailableStrings: availableInstruments.includes(STRINGS) ? true : undefined,
    isAvailableWoodwind: availableInstruments.includes(WOODWIND) ? true : undefined,
    isAvailableBrass: availableInstruments.includes(BRASS) ? true : undefined,
    isAvailablePercussion: availableInstruments.includes(PERCUSSION) ? true : undefined,
    institutionSizes: toInstitutionSizeParam(institutionSizes),
  };
};
