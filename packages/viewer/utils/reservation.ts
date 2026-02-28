import { addMonths, isAfter, isBefore, isSameDay } from "date-fns";
import type { ReservationsQueryVariables } from "../api/queries";
import { AvailabilityDivision, ReservationDivision } from "../constants/enums";
import {
  ReservationDivisionMap,
  ReservationStatusMap,
  SELECT_OPTION_ALL,
  SupportedMunicipalities,
  getMunicipalityFromUrlParam,
  type SupportedMunicipality,
  RESERVATION_EXCLUDED_MUNICIPALITIES,
} from "./municipality";
import {
  BRASS,
  PERCUSSION,
  STRINGS,
  WOODWIND,
  getAvailableInstrumentFromUrlParam,
  getInstitutionSizeFromUrlParam,
  toInstitutionSizeParam,
} from "./search";

const RESERVATION_DIVISION_ORDER = {
  [ReservationDivision.INVALID]: 0,
  [ReservationDivision.MORNING]: 1,
  [ReservationDivision.MORNING_ONE]: 2,
  [ReservationDivision.MORNING_TWO]: 3,
  [ReservationDivision.AFTERNOON]: 4,
  [ReservationDivision.AFTERNOON_ONE]: 5,
  [ReservationDivision.AFTERNOON_TWO]: 6,
  [ReservationDivision.EVENING]: 7,
  [ReservationDivision.EVENING_ONE]: 8,
  [ReservationDivision.EVENING_TWO]: 9,
  [ReservationDivision.DIVISION_1]: 10,
  [ReservationDivision.DIVISION_2]: 11,
  [ReservationDivision.DIVISION_3]: 12,
  [ReservationDivision.DIVISION_4]: 13,
  [ReservationDivision.DIVISION_5]: 14,
  [ReservationDivision.DIVISION_6]: 15,
  [ReservationDivision.DIVISION_7]: 16,
  [ReservationDivision.DIVISION_8]: 17,
  [ReservationDivision.DIVISION_9]: 18,
  [ReservationDivision.DIVISION_10]: 19,
  [ReservationDivision.DIVISION_11]: 20,
  [ReservationDivision.DIVISION_12]: 21,
  [ReservationDivision.DIVISION_13]: 22,
  [ReservationDivision.DIVISION_14]: 23,
  [ReservationDivision.DIVISION_15]: 24,
  [ReservationDivision.DIVISION_16]: 25,
  [ReservationDivision.DIVISION_17]: 26,
  [ReservationDivision.DIVISION_18]: 27,
  [ReservationDivision.DIVISION_19]: 28,
  [ReservationDivision.DIVISION_20]: 29,
  [ReservationDivision.DIVISION_21]: 30,
  [ReservationDivision.DIVISION_22]: 31,
  [ReservationDivision.DIVISION_23]: 32,
  [ReservationDivision.DIVISION_24]: 33,
  [ReservationDivision.DIVISION_25]: 34,
  [ReservationDivision.DIVISION_26]: 35,
  [ReservationDivision.DIVISION_27]: 36,
  [ReservationDivision.DIVISION_28]: 37,
  [ReservationDivision.DIVISION_29]: 38,
  [ReservationDivision.DIVISION_30]: 39,
};

type ReservationDivisionKey = keyof typeof RESERVATION_DIVISION_ORDER;

// key に ReservationDivision を利用している Object をソートした配列で返す
export const sortByReservationDivision = (obj: Record<string, string>): [string, string][] => {
  return Object.entries(obj).sort(
    ([a], [b]) =>
      RESERVATION_DIVISION_ORDER[a as ReservationDivisionKey] -
      RESERVATION_DIVISION_ORDER[b as ReservationDivisionKey]
  );
};

export const formatReservationMap = (
  municipality: SupportedMunicipality | undefined,
  obj: Record<string, string> | undefined
): string => {
  if (!municipality || !obj) {
    return "";
  }
  const sorted = sortByReservationDivision(obj);
  const parts = new Array(Math.ceil(sorted.length / 3)).fill([]).map(() => sorted.splice(0, 3));

  return parts
    .map((part) =>
      part
        .map(([division, status]) =>
          [
            ReservationDivisionMap[municipality]?.[division],
            ReservationStatusMap[municipality]?.[status],
          ].join(": ")
        )
        .join(" ")
    )
    .join("\n");
};

const IS_ONLY_MORNING_VACANT = "m";
const IS_ONLY_AFTERNOON_VACANT = "a";
const IS_ONLY_EVENING_VACANT = "e";
const IS_ONLY_HOLIDAY = "h";

export const RESERVATION_SEARCH_FILTER_MAP = {
  [IS_ONLY_MORNING_VACANT]: "午前空き",
  [IS_ONLY_AFTERNOON_VACANT]: "午後空き",
  [IS_ONLY_EVENING_VACANT]: "夜間空き",
  [IS_ONLY_HOLIDAY]: "休日のみ",
} as const;

const ReservationSearchFilters = [
  IS_ONLY_MORNING_VACANT,
  IS_ONLY_AFTERNOON_VACANT,
  IS_ONLY_EVENING_VACANT,
  IS_ONLY_HOLIDAY,
] as const;

export type ReservationSearchFilter = (typeof ReservationSearchFilters)[number];

export const getResevationSearchFilterFromUrlParam = (
  filters: (string | null)[] | null | undefined
): ReservationSearchFilter[] => {
  return (filters ?? []).filter((filter) =>
    ReservationSearchFilters.some((f) => f === filter)
  ) as ReservationSearchFilter[];
};

type ReservationSearchParams = {
  municipality: ReturnType<typeof getMunicipalityFromUrlParam>;
  startDate: Date;
  endDate: Date;
  filter: ReturnType<typeof getResevationSearchFilterFromUrlParam>;
  availableInstruments: ReturnType<typeof getAvailableInstrumentFromUrlParam>;
  institutionSizes: ReturnType<typeof getInstitutionSizeFromUrlParam>;
};

export const toReservationSearchParams = (
  m: string | null | undefined,
  df: Date | null | undefined,
  dt: Date | null | undefined,
  f: (string | null)[] | null | undefined,
  a: (string | null)[] | null | undefined,
  i: (string | null)[] | null | undefined,
  minDate: Date,
  maxDate: Date
): ReservationSearchParams => {
  return {
    municipality: getMunicipalityFromUrlParam(m),
    startDate:
      df &&
      (isSameDay(df, minDate) || isAfter(df, minDate)) &&
      (isSameDay(df, maxDate) || isBefore(df, maxDate))
        ? df
        : minDate,
    endDate:
      dt &&
      (isSameDay(dt, minDate) || isAfter(dt, minDate)) &&
      (isSameDay(dt, maxDate) || isBefore(dt, maxDate))
        ? dt
        : addMonths(minDate, 1),
    filter: getResevationSearchFilterFromUrlParam(f),
    availableInstruments: getAvailableInstrumentFromUrlParam(a),
    institutionSizes: getInstitutionSizeFromUrlParam(i),
  };
};

export const toReservationQueryVariables = ({
  municipality,
  startDate,
  endDate,
  filter,
  availableInstruments,
  institutionSizes,
}: ReservationSearchParams): ReservationsQueryVariables => {
  return {
    first: 100,
    after: null,
    municipality:
      municipality !== SELECT_OPTION_ALL
        ? [municipality]
        : SupportedMunicipalities.filter(
            (m) => !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(m)
          ).map((m) => m.toString()),
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
    startDate: startDate?.toDateString(),
    endDate: endDate?.toDateString(),
    isHoliday: filter.includes(IS_ONLY_HOLIDAY) ? true : null,
    isMorningVacant: filter.includes(IS_ONLY_MORNING_VACANT) ? true : null,
    isAfternoonVacant: filter.includes(IS_ONLY_AFTERNOON_VACANT) ? true : null,
    isEveningVacant: filter.includes(IS_ONLY_EVENING_VACANT) ? true : null,
  };
};
