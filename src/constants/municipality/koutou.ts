import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const KOUTOU_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "予約あり",
  [ReservationStatus.STATUS_2]: "休館日",
  [ReservationStatus.STATUS_3]: "保守日",
  [ReservationStatus.STATUS_4]: "期間外",
  [ReservationStatus.STATUS_5]: "音出し予約",
};

export const KOUTOU_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.MORNING_ONE]: "①",
  [ReservationDivision.MORNING_TWO]: "②",
  [ReservationDivision.AFTERNOON_ONE]: "③",
  [ReservationDivision.AFTERNOON_TWO]: "④",
  [ReservationDivision.EVENING_ONE]: "⑤",
  [ReservationDivision.EVENING_TWO]: "⑥",
};

export const KOUTOU_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.EVENING]: "夜間",
  [FeeDivision.DIVISION_1]: "①",
  [FeeDivision.DIVISION_2]: "②",
  [FeeDivision.DIVISION_3]: "③",
  [FeeDivision.DIVISION_4]: "④",
  [FeeDivision.DIVISION_5]: "⑤",
  [FeeDivision.DIVISION_6]: "⑥",
};
