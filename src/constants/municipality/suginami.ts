import { FeeDivision, ReservationDivision, ReservationStatus } from "../enums";

export const SUGINAMI_RESERVATION_STATUS: Readonly<Record<string, string>> = {
  [ReservationStatus.VACANT]: "予約可",
  [ReservationStatus.STATUS_1]: "予約不可",
  [ReservationStatus.STATUS_2]: "期間外",
  [ReservationStatus.STATUS_3]: "未確定/ホール未確定",
  [ReservationStatus.STATUS_4]: "休館",
  [ReservationStatus.STATUS_5]: "施設保守",
  [ReservationStatus.STATUS_6]: "その他",
  [ReservationStatus.STATUS_7]: "悪天候",
  [ReservationStatus.STATUS_8]: "工事",
  [ReservationStatus.STATUS_9]: "閉鎖",
  [ReservationStatus.STATUS_10]: "選挙",
  [ReservationStatus.STATUS_11]: "イベント",
  [ReservationStatus.STATUS_12]: "開放待ち",
};

export const SUGINAMI_RESERVATION_DIVISION: Readonly<Record<string, string>> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.AFTERNOON_ONE]: "午後1",
  [ReservationDivision.AFTERNOON_TWO]: "午後2",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.DIVISION_1]: "9時-",
  [ReservationDivision.DIVISION_2]: "10時-",
  [ReservationDivision.DIVISION_3]: "11時-",
  [ReservationDivision.DIVISION_4]: "12時-",
  [ReservationDivision.DIVISION_5]: "13時-",
  [ReservationDivision.DIVISION_6]: "14時-",
  [ReservationDivision.DIVISION_7]: "15時-",
  [ReservationDivision.DIVISION_8]: "16時-",
  [ReservationDivision.DIVISION_9]: "17時-",
  [ReservationDivision.DIVISION_10]: "18時-",
  [ReservationDivision.DIVISION_11]: "19時-",
  [ReservationDivision.DIVISION_12]: "20時-",
};

// TODO 埋め終わったら更新する
export const SUGINAMI_FEE_DIVISION: Readonly<Record<string, string>> = {
  [FeeDivision.MORNING]: "午前",
  [FeeDivision.AFTERNOON]: "午後",
  [ReservationDivision.AFTERNOON_ONE]: "午後1",
  [ReservationDivision.AFTERNOON_TWO]: "午後2",
  [FeeDivision.EVENING]: "夜間",
  [FeeDivision.ONE_HOUR]: "1時間",
};
