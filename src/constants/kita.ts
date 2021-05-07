import { FeeDivision, ReservationDivision, ReservationStatus } from "./enums";

export const KITA_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "○",
  [ReservationStatus.STATUS_1]: "×",
  [ReservationStatus.STATUS_2]: "保守",
  [ReservationStatus.STATUS_3]: "休館",
  [ReservationStatus.STATUS_4]: "問い合わせ",
};

export const KITA_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.DIVISION_1]: "①",
  [ReservationDivision.DIVISION_2]: "②",
  [ReservationDivision.DIVISION_3]: "③",
  [ReservationDivision.DIVISION_4]: "④",
  [ReservationDivision.DIVISION_5]: "⑤",
};

export const KITA_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.AFTERNOON_ONE]: "午後1",
  [FeeDivision.AFTERNOON_TWO]: "午後2",
  [FeeDivision.EVENING]: "夜間",
  [FeeDivision.ONE_HOUR]: "1時間",
  [FeeDivision.DIVISION_1]: "①",
  [FeeDivision.DIVISION_2]: "②",
  [FeeDivision.DIVISION_3]: "③",
  [FeeDivision.DIVISION_4]: "④",
  [FeeDivision.DIVISION_5]: "⑤",
};
