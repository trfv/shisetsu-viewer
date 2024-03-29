import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const TOSHIMA_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "一部空き",
  [ReservationStatus.STATUS_2]: "空きなし",
  [ReservationStatus.STATUS_3]: "申込期間外",
  [ReservationStatus.STATUS_4]: "休館",
  [ReservationStatus.STATUS_5]: "休館日",
  [ReservationStatus.STATUS_6]: "なし",
  [ReservationStatus.STATUS_7]: "公開対象外",
  [ReservationStatus.STATUS_8]: "抽選",
};

export const TOSHIMA_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
};

export const TOSHIMA_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.EVENING]: "夜間",
  [FeeDivision.ONE_HOUR]: "1時間",
};
