import { addMonths, endOfMonth, isBefore, startOfMonth } from "date-fns";
import { ReservationsQueryVariables } from "../api/graphql-client";
import { ReservationDivision, ReservationStatus } from "../constants/enums";
import {
  END_DATE,
  MUNICIPALITY,
  PAGE,
  ROWS_PER_PAGE,
  SELECT_OPTION_ALL,
  START_DATE,
} from "../constants/search";
import {
  ReservationDivisionMap,
  ReservationStatusMap,
  SupportedMunicipality,
} from "./municipality";
import { getDateFromUrlParam, getMunicipalityFromUrlParam, getPageFromUrlParam } from "./search";

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

export const RESERVATION_SEARCH_FILTER = "f";

export const IS_ONLY_HOLIDAY = "h";
export const IS_ONLY_MORNING_VACANT = "m";
export const IS_ONLY_AFTERNOON_VACANT = "a";
export const IS_ONLY_EVENING_VACANT = "e";

const ReservationSearchFilters = [
  IS_ONLY_HOLIDAY,
  IS_ONLY_MORNING_VACANT,
  IS_ONLY_AFTERNOON_VACANT,
  IS_ONLY_EVENING_VACANT,
] as const;

export type ReservationSearchFilter = typeof ReservationSearchFilters[number];

export const getResevationSearchFilterFromUrlParam = (
  filters: string[]
): ReservationSearchFilter[] => {
  return filters.filter((filter) =>
    ReservationSearchFilters.some((f) => f === filter)
  ) as ReservationSearchFilter[];
};

export type ReservationSearchParams = {
  page: number;
  municipality: SupportedMunicipality | typeof SELECT_OPTION_ALL;
  startDate: Date | null;
  endDate: Date | null;
  filter: ReservationSearchFilter[];
};

export const toReservationSearchParams = (
  urlSearchParams: URLSearchParams,
  minDate: Date,
  maxDate: Date
): ReservationSearchParams => {
  return {
    page: getPageFromUrlParam(urlSearchParams.get(PAGE)),
    municipality:
      getMunicipalityFromUrlParam(urlSearchParams.get(MUNICIPALITY)) ?? SELECT_OPTION_ALL,
    startDate: getDateFromUrlParam(urlSearchParams.get(START_DATE), minDate, maxDate) ?? minDate,
    endDate:
      getDateFromUrlParam(urlSearchParams.get(END_DATE), minDate, maxDate) ?? addMonths(minDate, 1),
    filter: getResevationSearchFilterFromUrlParam(
      urlSearchParams.getAll(RESERVATION_SEARCH_FILTER)
    ),
  };
};

export const toReservationQueryVariables = ({
  page,
  municipality,
  startDate,
  endDate,
  filter,
}: ReservationSearchParams): ReservationsQueryVariables => {
  const [isOnlyHoliday, isOnlyMorningVacant, isOnlyAfternoonVacant, isOnlyEveningVacant] = [
    filter.includes(IS_ONLY_HOLIDAY),
    filter.includes(IS_ONLY_MORNING_VACANT),
    filter.includes(IS_ONLY_AFTERNOON_VACANT),
    filter.includes(IS_ONLY_EVENING_VACANT),
  ];
  return {
    offset: page * ROWS_PER_PAGE,
    limit: ROWS_PER_PAGE,
    municipality: municipality !== SELECT_OPTION_ALL ? [municipality] : null,
    startDate: startDate?.toDateString(),
    endDate: endDate?.toDateString(),
    isHoliday: isOnlyHoliday ? true : null,
    reservationStatus1: {
      ...(isOnlyMorningVacant ? { [ReservationDivision.MORNING]: ReservationStatus.VACANT } : {}),
      ...(isOnlyAfternoonVacant
        ? {
            [ReservationDivision.AFTERNOON]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyEveningVacant ? { [ReservationDivision.EVENING]: ReservationStatus.VACANT } : {}),
    },
    reservationStatus2: {
      ...(isOnlyMorningVacant
        ? {
            [ReservationDivision.MORNING_ONE]: ReservationStatus.VACANT,
            [ReservationDivision.MORNING_TWO]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyAfternoonVacant
        ? {
            [ReservationDivision.AFTERNOON_ONE]: ReservationStatus.VACANT,
            [ReservationDivision.AFTERNOON_TWO]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyEveningVacant
        ? {
            [ReservationDivision.EVENING_ONE]: ReservationStatus.VACANT,
            [ReservationDivision.EVENING_TWO]: ReservationStatus.VACANT,
          }
        : {}),
    },
    reservationStatus3: {
      ...(isOnlyMorningVacant
        ? {
            [ReservationDivision.MORNING]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyAfternoonVacant
        ? {
            [ReservationDivision.AFTERNOON_ONE]: ReservationStatus.VACANT,
            [ReservationDivision.AFTERNOON_TWO]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyEveningVacant
        ? {
            [ReservationDivision.EVENING_ONE]: ReservationStatus.VACANT,
            [ReservationDivision.EVENING_TWO]: ReservationStatus.VACANT,
          }
        : {}),
    },
    reservationStatus4: {
      ...(isOnlyMorningVacant
        ? {
            [ReservationDivision.MORNING]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyAfternoonVacant
        ? {
            [ReservationDivision.AFTERNOON_ONE]: ReservationStatus.VACANT,
            [ReservationDivision.AFTERNOON_TWO]: ReservationStatus.VACANT,
          }
        : {}),
      ...(isOnlyEveningVacant
        ? {
            [ReservationDivision.EVENING]: ReservationStatus.VACANT,
          }
        : {}),
    },
  };
};

export const toYearMonthChips = (minDate: Date, maxDate: Date) => {
  let targetDate = startOfMonth(minDate);
  const max = endOfMonth(maxDate);
  const chips = [];
  while (isBefore(targetDate, max)) {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    chips.push({
      value: `${year}-${month}`,
      label: `${year}年${month}月`,
    });
    targetDate = addMonths(targetDate, 1);
  }
  return chips.reduce<Record<number, { value: string; label: string }>>((accum, curr, index) => {
    accum[index + 1] = curr;
    return accum;
  }, {});
};
