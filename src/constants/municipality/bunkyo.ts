import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const BUNKYO_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "一部空き",
  [ReservationStatus.STATUS_2]: "空きなし",
  [ReservationStatus.STATUS_3]: "抽選申込可能",
  [ReservationStatus.STATUS_4]: "申込期間外",
  [ReservationStatus.STATUS_5]: "公開対象外",
  [ReservationStatus.STATUS_6]: "休館",
};

export const BUNKYO_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
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
