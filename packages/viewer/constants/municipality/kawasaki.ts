import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const KAWASAKI_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "予約あり",
  [ReservationStatus.STATUS_2]: "休館日",
  [ReservationStatus.STATUS_3]: "保守日・主催事業",
  [ReservationStatus.STATUS_4]: "一般開放",
  [ReservationStatus.STATUS_5]: "雨天",
  [ReservationStatus.STATUS_6]: "受付期間外",
  [ReservationStatus.STATUS_7]: "時間外",
  [ReservationStatus.STATUS_8]: "取消処理中",
  [ReservationStatus.STATUS_9]: "開放予定",
};

export const KAWASAKI_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
};

export const KAWASAKI_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.EVENING]: "夜間",
};
