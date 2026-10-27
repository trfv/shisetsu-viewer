import type { InstitutionsQueryParams, UsageFeeEntry } from "@shisetsu-viewer/shared";

import { formatPrice } from "./format";
import {
  FeeDivisionMap,
  getMunicipalitiesFromUrlParam,
  SupportedMunicipalities,
  SupportedMunicipalityMap,
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

export const formatInstitutionName = ({
  municipality,
  building,
  institution,
}: {
  municipality: string;
  building: string | null;
  institution: string | null;
}): string =>
  [SupportedMunicipalityMap[municipality], building, institution].filter(Boolean).join(" ");

type InstitutionSearchParams = {
  municipalities: ReturnType<typeof getMunicipalitiesFromUrlParam>;
  availableInstruments: ReturnType<typeof getAvailableInstrumentFromUrlParam>;
  institutionSizes: ReturnType<typeof getInstitutionSizeFromUrlParam>;
};

export const toInstitutionSearchParams = (
  m: (string | null)[] | null | undefined,
  a: (string | null)[] | null | undefined,
  i: (string | null)[] | null | undefined
): InstitutionSearchParams => {
  return {
    municipalities: getMunicipalitiesFromUrlParam(m, SupportedMunicipalities),
    availableInstruments: getAvailableInstrumentFromUrlParam(a),
    institutionSizes: getInstitutionSizeFromUrlParam(i),
  };
};

export const toInstitutionQueryParams = ({
  municipalities,
  availableInstruments,
  institutionSizes,
}: InstitutionSearchParams): InstitutionsQueryParams => {
  return {
    limit: 100,
    municipality: municipalities,
    isAvailableStrings: availableInstruments.includes(STRINGS) ? true : undefined,
    isAvailableWoodwind: availableInstruments.includes(WOODWIND) ? true : undefined,
    isAvailableBrass: availableInstruments.includes(BRASS) ? true : undefined,
    isAvailablePercussion: availableInstruments.includes(PERCUSSION) ? true : undefined,
    institutionSizes: toInstitutionSizeParam(institutionSizes),
  };
};
