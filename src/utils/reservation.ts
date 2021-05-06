import { ReservationDivision } from "../constants/enums";
import { ReservationDivisionMap, ReservationStatusMap, SupportedTokyoWard } from "./enums";

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
  [ReservationDivision.ONE_HOUR]: 10,
  [ReservationDivision.TWO_HOUR]: 11,
  [ReservationDivision.DIVISION_1]: 12,
  [ReservationDivision.DIVISION_2]: 13,
  [ReservationDivision.DIVISION_3]: 14,
  [ReservationDivision.DIVISION_4]: 15,
  [ReservationDivision.DIVISION_5]: 16,
  [ReservationDivision.DIVISION_6]: 17,
  [ReservationDivision.DIVISION_7]: 18,
  [ReservationDivision.DIVISION_8]: 19,
  [ReservationDivision.DIVISION_9]: 20,
  [ReservationDivision.DIVISION_10]: 21,
  [ReservationDivision.DIVISION_11]: 22,
  [ReservationDivision.DIVISION_12]: 23,
  [ReservationDivision.DIVISION_13]: 24,
  [ReservationDivision.DIVISION_14]: 25,
  [ReservationDivision.DIVISION_15]: 26,
  [ReservationDivision.DIVISION_16]: 27,
  [ReservationDivision.DIVISION_17]: 28,
  [ReservationDivision.DIVISION_18]: 29,
  [ReservationDivision.DIVISION_19]: 30,
  [ReservationDivision.DIVISION_20]: 31,
  [ReservationDivision.DIVISION_21]: 32,
  [ReservationDivision.DIVISION_22]: 33,
  [ReservationDivision.DIVISION_23]: 34,
  [ReservationDivision.DIVISION_24]: 35,
  [ReservationDivision.DIVISION_25]: 36,
  [ReservationDivision.DIVISION_26]: 37,
  [ReservationDivision.DIVISION_27]: 38,
  [ReservationDivision.DIVISION_28]: 39,
  [ReservationDivision.DIVISION_29]: 40,
  [ReservationDivision.DIVISION_30]: 41,
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
