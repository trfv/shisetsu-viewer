export enum ReservationStatus {
  INVALID = "RESERVATION_STATUS_INVALID",
  VACANT = "RESERVATION_STATUS_VACANT",
  OCCUPIED = "RESERVATION_STATUS_OCCUPIED",
  CLOSED = "RESERVATION_STATUS_CLOSED",
  KEEP = "RESERVATION_STATUS_KEEP",
  KIKANGAI = "RESERVATION_STATUS_KIKANGAI",
  SOUND = "RESERVATION_STATUS_SOUND",
  OPEN = "RESERVATION_STATUS_OPEN",
  QUESTION = "RESERVATION_STATUS_QUESTION",
}

export const ReservationStatusMap = [
  {
    value: ReservationStatus.INVALID,
    label: "INVALID",
  },
  {
    value: ReservationStatus.VACANT,
    label: "空き",
  },
  {
    value: ReservationStatus.OCCUPIED,
    label: "予約あり",
  },
  {
    value: ReservationStatus.CLOSED,
    label: "休館日",
  },
  {
    value: ReservationStatus.KEEP,
    label: "保守日",
  },
  {
    value: ReservationStatus.KIKANGAI,
    label: "期間外",
  },
  {
    value: ReservationStatus.SOUND,
    label: "音出予約",
  },
  {
    value: ReservationStatus.OPEN,
    label: "個人開放",
  },
  {
    value: ReservationStatus.QUESTION,
    label: "問合せ",
  },
];

export enum ReservationDivision {
  INVALID = "RESERVATION_DIVISION_INVALID",
  MORNING = "RESERVATION_DIVISION_MORNING",
  AFTERNOON = "RESERVATION_DIVISION_AFTERNOON",
  EVENING = "RESERVATION_DIVISION_EVENING",
  ONE = "RESERVATION_DIVISION_ONE",
  TWO = "RESERVATION_DIVISION_TWO",
  THREE = "RESERVATION_DIVISION_THREE",
  FOUR = "RESERVATION_DIVISION_FOUR",
  FIVE = "RESERVATION_DIVISION_FIVE",
  SIX = "RESERVATION_DIVISION_SIX",
}

export const ReservationDivisionMap = [
  {
    value: ReservationDivision.INVALID,
    label: "INVALID",
  },
  {
    value: ReservationDivision.MORNING,
    label: "午前",
  },
  {
    value: ReservationDivision.AFTERNOON,
    label: "午後",
  },
  {
    value: ReservationDivision.EVENING,
    label: "夜間",
  },
  {
    value: ReservationDivision.ONE,
    label: "①",
  },
  {
    value: ReservationDivision.TWO,
    label: "②",
  },
  {
    value: ReservationDivision.THREE,
    label: "③",
  },
  {
    value: ReservationDivision.FOUR,
    label: "④",
  },
  {
    value: ReservationDivision.FIVE,
    label: "⑤",
  },
  {
    value: ReservationDivision.SIX,
    label: "⑥",
  },
];

export enum TokyoWard {
  INVALID = "TOKYO_WARD_INVALID",
  ADACHI = "TOKYO_WARD_ADACHI",
  ARAWAKA = "TOKYO_WARD_ARAWAKA",
  ITABASHI = "TOKYO_WARD_ITABASHI",
  EDOGAWA = "TOKYO_WARD_EDOGAWA",
  OTA = "TOKYO_WARD_OTA",
  KATSUSHIKA = "TOKYO_WARD_KATSUSHIKA",
  KITA = "TOKYO_WARD_KITA",
  KOUTOU = "TOKYO_WARD_KOUTOU",
  SHINAGAWA = "TOKYO_WARD_SHINAGAWA",
  SHIBUYA = "TOKYO_WARD_SHIBUYA",
  SHINJUKU = "TOKYO_WARD_SHINJUKU",
  SUGINAMI = "TOKYO_WARD_SUGINAMI",
  SUMIDA = "TOKYO_WARD_SUMIDA",
  SETAGAYA = "TOKYO_WARD_SETAGAYA",
  TAITO = "TOKYO_WARD_TAITO",
  CHUO = "TOKYO_WARD_CHUO",
  CHIYODA = "TOKYO_WARD_CHIYODA",
  TOSHIMA = "TOKYO_WARD_TOSHIMA",
  NAKANO = "TOKYO_WARD_NAKANO",
  NERIMA = "TOKYO_WARD_NERIMA",
  BUNKYO = "TOKYO_WARD_BUNKYO",
  MINATO = "TOKYO_WARD_MINATO",
  MEGURO = "TOKYO_WARD_MEGURO",
}

export const TokyoWardMap = [
  {
    value: TokyoWard.ADACHI,
    label: "足立区",
  },
  {
    value: TokyoWard.ARAWAKA,
    label: "荒川区",
  },
  {
    value: TokyoWard.ITABASHI,
    label: "板橋区",
  },
  {
    value: TokyoWard.EDOGAWA,
    label: "江戸川区",
  },
  {
    value: TokyoWard.OTA,
    label: "大田区",
  },
  {
    value: TokyoWard.KATSUSHIKA,
    label: "葛飾区",
  },
  {
    value: TokyoWard.KITA,
    label: "北区",
  },
  {
    value: TokyoWard.KOUTOU,
    label: "江東区",
  },
  {
    value: TokyoWard.SHINAGAWA,
    label: "品川区",
  },
  {
    value: TokyoWard.SHIBUYA,
    label: "渋谷区",
  },
  {
    value: TokyoWard.SHINJUKU,
    label: "新宿区",
  },
  {
    value: TokyoWard.SUGINAMI,
    label: "杉並区",
  },
  {
    value: TokyoWard.SUMIDA,
    label: "墨田区",
  },
  {
    value: TokyoWard.SETAGAYA,
    label: "世田谷区",
  },
  {
    value: TokyoWard.TAITO,
    label: "台東区",
  },
  {
    value: TokyoWard.CHUO,
    label: "中央区",
  },
  {
    value: TokyoWard.CHIYODA,
    label: "千代田区",
  },
  {
    value: TokyoWard.TOSHIMA,
    label: "豊島区",
  },
  {
    value: TokyoWard.NAKANO,
    label: "中野区",
  },
  {
    value: TokyoWard.NERIMA,
    label: "練馬区",
  },
  {
    value: TokyoWard.BUNKYO,
    label: "文京区",
  },
  {
    value: TokyoWard.MINATO,
    label: "港区",
  },
  {
    value: TokyoWard.MEGURO,
    label: "目黒区",
  },
];

export enum DayOfWeek {
  INVALID = "DAY_OF_WEEK_INVALID",
  SUNDAY = "DAY_OF_WEEK_SUNDAY",
  MONDAY = "DAY_OF_WEEK_MONDAY",
  TUESDAY = "DAY_OF_WEEK_TUESDAY",
  WEDNESDAY = "DAY_OF_WEEK_WEDNESDAY",
  THUESDAY = "DAY_OF_WEEK_THUESDAY",
  FRIDAY = "DAY_OF_WEEK_FRIDAY",
  SATURDAY = "DAY_OF_WEEK_SATURDAY",
}

// export const DayOfWeekMap = {}

export type Enums = ReservationStatus | ReservationDivision | TokyoWard | DayOfWeek;
