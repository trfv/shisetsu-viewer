import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const OTA_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "予約済",
  [ReservationStatus.STATUS_2]: "空枠なし",
  [ReservationStatus.STATUS_3]: "休館日",
  [ReservationStatus.STATUS_4]: "保守点検",
  [ReservationStatus.STATUS_5]: "施設整備",
  [ReservationStatus.STATUS_6]: "工事",
  [ReservationStatus.STATUS_7]: "×",
};

export const OTA_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.AFTERNOON_ONE]: "午後1",
  [ReservationDivision.AFTERNOON_TWO]: "午後2",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.EVENING_ONE]: "夜間1",
  [ReservationDivision.EVENING_TWO]: "夜間2",
};

// TODO 埋め終わったら更新する
export const OTA_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [FeeDivision.EVENING]: "夜間",
  [FeeDivision.TWO_HOUR]: "1コマ",
};
