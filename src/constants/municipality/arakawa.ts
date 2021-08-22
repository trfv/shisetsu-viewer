import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const ARAKAWA_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "○",
  [ReservationStatus.STATUS_1]: "×",
  [ReservationStatus.STATUS_2]: "保守",
  [ReservationStatus.STATUS_3]: "休館",
  [ReservationStatus.STATUS_4]: "開放",
};

export const ARAKAWA_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.AFTERNOON_ONE]: "午後1",
  [ReservationDivision.AFTERNOON_TWO]: "午後2",
  [ReservationDivision.EVENING]: "夜間",
};

export const ARAKAWA_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.AFTERNOON_ONE]: "午後1",
  [FeeDivision.AFTERNOON_TWO]: "午後2",
  [FeeDivision.EVENING]: "夜間",
};
