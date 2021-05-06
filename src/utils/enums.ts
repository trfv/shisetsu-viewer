import {
  ReservationDivision,
  ReservationStatus,
  TokyoWard,
  TokyoWardMap,
} from "../constants/enums";

export const SupportedTokyoWards = [
  TokyoWard.INVALID,
  TokyoWard.KOUTOU,
  TokyoWard.BUNKYO,
  TokyoWard.KITA,
  TokyoWard.TOSHIMA,
  TokyoWard.EDOGAWA,
] as const;

export type SupportedTokyoWard = typeof SupportedTokyoWards[number];

export const TokyoWardOptions = Object.entries(TokyoWardMap)
  .filter(([k]) => SupportedTokyoWards.some((w) => w === k))
  .map(([k, v]) => ({ value: k, label: v }));

export const getTokyoWardFromUrlParam = (param: string | null | undefined): SupportedTokyoWard => {
  switch (param) {
    case "koutou":
      return TokyoWard.KOUTOU;
    case "bunkyo":
      return TokyoWard.BUNKYO;
    case "kita":
      return TokyoWard.KITA;
    case "toshima":
      return TokyoWard.TOSHIMA;
    case "edogawa":
      return TokyoWard.EDOGAWA;
    default:
      return TokyoWard.INVALID;
  }
};

export const convertTokyoWardToUrlParam = (tokyoWard: SupportedTokyoWard): string => {
  return tokyoWard === TokyoWard.INVALID ? "" : tokyoWard.replace("TOKYO_WARD_", "").toLowerCase();
};

const KOUTOU_RESERVATION_DIVISION: Record<string, string> = {
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

const BUNKYO_RESERVATION_DIVISION: Record<string, string> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.DIVISION_1]: "１コマ",
  [ReservationDivision.DIVISION_2]: "２コマ",
  [ReservationDivision.DIVISION_3]: "３コマ",
  [ReservationDivision.DIVISION_4]: "４コマ",
  [ReservationDivision.DIVISION_5]: "５コマ",
};

const KITA_RESERVATION_DIVISION: Record<string, string> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.DIVISION_1]: "①",
  [ReservationDivision.DIVISION_2]: "②",
  [ReservationDivision.DIVISION_3]: "③",
  [ReservationDivision.DIVISION_4]: "④",
  [ReservationDivision.DIVISION_5]: "⑤",
};

const TOSHIMA_RESERVATION_DIVISION: Record<string, string> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.EVENING]: "夜間",
};

const EDOGAWA_RESERVATION_DIVISION: Record<string, string> = {
  [ReservationDivision.MORNING]: "午前",
  [ReservationDivision.AFTERNOON]: "午後",
  [ReservationDivision.AFTERNOON_ONE]: "午後1",
  [ReservationDivision.AFTERNOON_TWO]: "午後2",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.EVENING]: "夜間",
  [ReservationDivision.EVENING_ONE]: "夜間1",
  [ReservationDivision.EVENING_TWO]: "夜間2",
  [ReservationDivision.DIVISION_1]: "0900-0930",
  [ReservationDivision.DIVISION_2]: "0930-1000",
  [ReservationDivision.DIVISION_3]: "1000-1030",
  [ReservationDivision.DIVISION_4]: "1030-1100",
  [ReservationDivision.DIVISION_5]: "1100-1130",
  [ReservationDivision.DIVISION_6]: "1130-1200",
  [ReservationDivision.DIVISION_7]: "1200-1230",
  [ReservationDivision.DIVISION_8]: "1230-1300",
  [ReservationDivision.DIVISION_9]: "1300-1330",
  [ReservationDivision.DIVISION_10]: "1330-1400",
  [ReservationDivision.DIVISION_11]: "1400-1430",
  [ReservationDivision.DIVISION_12]: "1430-1500",
  [ReservationDivision.DIVISION_13]: "1500-1530",
  [ReservationDivision.DIVISION_14]: "1530-1600",
  [ReservationDivision.DIVISION_15]: "1600-1630",
  [ReservationDivision.DIVISION_16]: "1630-1700",
  [ReservationDivision.DIVISION_17]: "1700-1730",
  [ReservationDivision.DIVISION_18]: "1730-1800",
  [ReservationDivision.DIVISION_19]: "1800-1830",
  [ReservationDivision.DIVISION_20]: "1830-1900",
  [ReservationDivision.DIVISION_21]: "1900-1930",
  [ReservationDivision.DIVISION_22]: "1930-2000",
  [ReservationDivision.DIVISION_23]: "2000-2030",
  [ReservationDivision.DIVISION_24]: "2030-2100",
  [ReservationDivision.DIVISION_25]: "2100-2130",
  [ReservationDivision.DIVISION_26]: "2130-2200",
};

export const ReservationDivisionMap: Record<string, Record<string, string>> = {
  [TokyoWard.KOUTOU]: KOUTOU_RESERVATION_DIVISION,
  [TokyoWard.BUNKYO]: BUNKYO_RESERVATION_DIVISION,
  [TokyoWard.KITA]: KITA_RESERVATION_DIVISION,
  [TokyoWard.TOSHIMA]: TOSHIMA_RESERVATION_DIVISION,
  [TokyoWard.EDOGAWA]: EDOGAWA_RESERVATION_DIVISION,
};

const KOUTOU_RESERVATION_STATUS: Record<string, string> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "予約あり",
  [ReservationStatus.STATUS_2]: "休館日",
  [ReservationStatus.STATUS_3]: "保守日",
  [ReservationStatus.STATUS_4]: "期間外",
  [ReservationStatus.STATUS_5]: "音出し予約",
};

const BUNKYO_RESERVATION_STATUS: Record<string, string> = {
  [ReservationStatus.VACANT]: "予約可",
  [ReservationStatus.STATUS_1]: "予約不可",
  [ReservationStatus.STATUS_2]: "期間外",
  [ReservationStatus.STATUS_3]: "個人開放",
};

const KITA_RESERVATION_STATUS: Record<string, string> = {
  [ReservationStatus.VACANT]: "○",
  [ReservationStatus.STATUS_1]: "×",
  [ReservationStatus.STATUS_2]: "保守",
  [ReservationStatus.STATUS_3]: "休館",
  [ReservationStatus.STATUS_4]: "問い合わせ",
};

const TOSHIMA_RESERVATION_STATUS: Record<string, string> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "一部空き",
  [ReservationStatus.STATUS_2]: "空きなし",
  [ReservationStatus.STATUS_3]: "申込期間外",
  [ReservationStatus.STATUS_4]: "休館",
  [ReservationStatus.STATUS_5]: "なし",
  [ReservationStatus.STATUS_6]: "＊",
  [ReservationStatus.STATUS_7]: "抽選",
};

const EDOGAWA_RESERVATION_STATUS: Record<string, string> = {
  [ReservationStatus.VACANT]: "空き",
  [ReservationStatus.STATUS_1]: "予約済",
  [ReservationStatus.STATUS_2]: "×",
  [ReservationStatus.STATUS_3]: "使用中止",
  [ReservationStatus.STATUS_4]: "休館日",
  [ReservationStatus.STATUS_5]: "工事",
  [ReservationStatus.STATUS_6]: "保守",
  [ReservationStatus.STATUS_7]: "清掃",
};

export const ReservationStatusMap: Record<string, Record<string, string>> = {
  [TokyoWard.KOUTOU]: KOUTOU_RESERVATION_STATUS,
  [TokyoWard.BUNKYO]: BUNKYO_RESERVATION_STATUS,
  [TokyoWard.KITA]: KITA_RESERVATION_STATUS,
  [TokyoWard.TOSHIMA]: TOSHIMA_RESERVATION_STATUS,
  [TokyoWard.EDOGAWA]: EDOGAWA_RESERVATION_STATUS,
};
