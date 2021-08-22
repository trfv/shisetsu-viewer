import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const BUNKYO_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "予約可",
  [ReservationStatus.STATUS_1]: "予約不可",
  [ReservationStatus.STATUS_2]: "期間外",
  [ReservationStatus.STATUS_3]: "個人開放",
};

export const BUNKYO_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.DIVISION_1]: "１コマ",
  [ReservationDivision.DIVISION_2]: "２コマ",
  [ReservationDivision.DIVISION_3]: "３コマ",
  [ReservationDivision.DIVISION_4]: "４コマ",
  [ReservationDivision.DIVISION_5]: "５コマ",
};

export const BUNKYO_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.EVENING]: "夜間",
  [FeeDivision.DIVISION_1]: "１コマ",
  [FeeDivision.DIVISION_2]: "２コマ",
  [FeeDivision.DIVISION_3]: "３コマ",
  [FeeDivision.DIVISION_4]: "４コマ",
  [FeeDivision.DIVISION_5]: "５コマ",
};
