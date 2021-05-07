import { addMonths } from "date-fns";
import { ReservationQueryVariables } from "../api/graphql-client";
import { DayOfWeek, ReservationDivision, ReservationStatus, TokyoWard } from "../constants/enums";
import { END_DATE, PAGE, ROWS_PER_PAGE, START_DATE, TOKYO_WARD } from "../constants/search";
import {
  ReservationDivisionMap,
  ReservationStatusMap,
  SupportedTokyoWard,
  SupportedTokyoWards,
} from "./enums";
import {
  getDateFromUrlParam,
  getPageFromUrlParam,
  getRowsPerPageFromUrlParam,
  getTokyoWardFromUrlParam,
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
  tokyoWard: SupportedTokyoWard,
  obj: Record<string, string>
): string => {
  const sorted = sortByReservationDivision(obj);
  const parts = new Array(Math.ceil(sorted.length / 3)).fill([]).map(() => sorted.splice(0, 3));

  return parts
    .map((part) =>
      part
        .map(([division, status]) =>
          [
            ReservationDivisionMap[tokyoWard]?.[division],
            ReservationStatusMap[tokyoWard]?.[status],
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
  rowsPerPage: number;
  tokyoWard: SupportedTokyoWard;
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
    rowsPerPage: getRowsPerPageFromUrlParam(urlSearchParams.get(ROWS_PER_PAGE)),
    tokyoWard: getTokyoWardFromUrlParam(urlSearchParams.get(TOKYO_WARD)),
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
  rowsPerPage,
  tokyoWard,
  startDate,
  endDate,
  filter,
}: ReservationSearchParams): ReservationQueryVariables => {
  const [isOnlyHoliday, isOnlyMorningVacant, isOnlyAfternoonVacant, isOnlyEveningVacant] = [
    filter.includes(IS_ONLY_HOLIDAY),
    filter.includes(IS_ONLY_MORNING_VACANT),
    filter.includes(IS_ONLY_AFTERNOON_VACANT),
    filter.includes(IS_ONLY_EVENING_VACANT),
  ];
  return {
    offset: page * rowsPerPage,
    limit: rowsPerPage,
    tokyoWard: tokyoWard === TokyoWard.INVALID ? SupportedTokyoWards : [tokyoWard],
    startDate: startDate?.toDateString(),
    endDate: endDate?.toDateString(),
    dayOfWeek: isOnlyHoliday ? [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] : null,
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
