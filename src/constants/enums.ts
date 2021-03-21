export enum ReservationStatus {
  INVALID = "RESERVATION_STATUS_INVALID",
  VACANT = "RESERVATION_STATUS_VACANT",
  PARTIALLY_VACANT = "RESERVATION_STATUS_PARTIALLY_VACANT",
  OCCUPIED = "RESERVATION_STATUS_OCCUPIED",
  CLOSED = "RESERVATION_STATUS_CLOSED",
  KEEP = "RESERVATION_STATUS_KEEP",
  KIKANGAI = "RESERVATION_STATUS_KIKANGAI",
  SOUND = "RESERVATION_STATUS_SOUND",
  OPEN = "RESERVATION_STATUS_OPEN",
  QUESTION = "RESERVATION_STATUS_QUESTION",
  OUT_OF_TARGRT = "RESERVATION_STATUS_OUT_OF_TARGRT",
  APPLIABLE = "RESERVATION_STATUS_APPLIABLE",
  CANCELED = "RESERVATION_STATUS_CANCELED",
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
    value: ReservationStatus.PARTIALLY_VACANT,
    label: "一部空き",
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
  {
    value: ReservationStatus.OUT_OF_TARGRT,
    label: "公開対象外",
  },
  {
    value: ReservationStatus.APPLIABLE,
    label: "抽選申込可能",
  },
  {
    value: ReservationStatus.CANCELED,
    label: "使用中止",
  },
];

export enum ReservationDivision {
  INVALID = "RESERVATION_DIVISION_INVALID",
  MORNING = "RESERVATION_DIVISION_MORNING",
  AFTERNOON = "RESERVATION_DIVISION_AFTERNOON",
  AFTERNOON_ONE = "RESERVATION_DIVISION_AFTERNOON_ONE",
  AFTERNOON_TWO = "RESERVATION_DIVISION_AFTERNOON_TWO",
  EVENING = "RESERVATION_DIVISION_EVENING",
  EVENING_ONE = "RESERVATION_DIVISION_EVENING_ONE",
  EVENING_TWO = "RESERVATION_DIVISION_EVENING_TWO",
  ONE = "RESERVATION_DIVISION_ONE",
  TWO = "RESERVATION_DIVISION_TWO",
  THREE = "RESERVATION_DIVISION_THREE",
  FOUR = "RESERVATION_DIVISION_FOUR",
  FIVE = "RESERVATION_DIVISION_FIVE",
  SIX = "RESERVATION_DIVISION_SIX",
  ONE_HOUR = "RESERVATION_DIVISION_ONE_HOUR",
  TWO_HOUR = "RESERVATION_DIVISION_TWO_HOUR",
  NINE_TO_NINE_HALF = "RESERVATION_DIVISION_NINE_TO_NINE_HALF",
  NINE_HALF_TO_TEN = "RESERVATION_DIVISION_NINE_HALF_TO_TEN",
  TEN_TO_TEN_HALF = "RESERVATION_DIVISION_TEN_TO_TEN_HALF",
  TEN_HALF_TO_EVELEN = "RESERVATION_DIVISION_TEN_HALF_TO_ELEVEN",
  ELEVEN_TO_ELEVEN_HALF = "RESERVATION_DIVISION_ELEVEN_TO_ELEVEN_HALF",
  ELEVEN_HALF_TO_TWELVE = "RESERVATION_DIVISION_ELEVEN_HALF_TO_TWELVE",
  TWELVE_TO_TWELVE_HALF = "RESERVATION_DIVISION_TWELVE_TO_TWELVE_HALF",
  TWELVE_HALF_TO_THIRTEEN = "RESERVATION_DIVISION_TWELVE_HALF_TO_THIRTEEN",
  THIRTEEN_TO_THIRTEEN_HALF = "RESERVATION_DIVISION_THIRTEEN_TO_THIRTEEN_HALF",
  THIRTEEN_HALF_TO_FOURTEEN = "RESERVATION_DIVISION_THIRTEEN_HALF_TO_FOURTEEN",
  FOURTEEN_TO_FOURTEEN_HALF = "RESERVATION_DIVISION_FOURTEEN_TO_FOURTEEN_HALF",
  FOURTEEN_HALF_TO_FIFTEEN = "RESERVATION_DIVISION_FOURTEEN_HALF_TO_FIFTEEN",
  FIFTEEN_TO_FIFTEEN_HALF = "RESERVATION_DIVISION_FIFTEEN_TO_FIFTEEN_HALF",
  FIFTEEN_HALF_TO_SIXTEEN = "RESERVATION_DIVISION_FIFTEEN_HALF_TO_SIXTEEN",
  SIXTEEN_TO_SIXTEEN_HALF = "RESERVATION_DIVISION_SIXTEEN_TO_SIXTEEN_HALF",
  SIXTEEN_HALF_TO_SEVENTEEN = "RESERVATION_DIVISION_SIXTEEN_HALF_TO_SEVENTEEN",
  SEVENTEEN_TO_SEVENTEEN_HALF = "RESERVATION_DIVISION_SEVENTEEN_TO_SEVENTEEN_HALF",
  SEVENTEEN_HALF_TO_EIGHTEEN = "RESERVATION_DIVISION_SEVENTEEN_HALF_TO_EIGHTEEN",
  EIGHTEEN_TO_EIGHTEEN_HALF = "RESERVATION_DIVISION_EIGHTEEN_TO_EIGHTEEN_HALF",
  EIGHTEEN_HALF_TO_NINETEEN = "RESERVATION_DIVISION_EIGHTEEN_HALF_TO_NINETEEN",
  NINETEEN_TO_NINETEEN_HALF = "RESERVATION_DIVISION_NINETEEN_TO_NINETEEN_HALF",
  NINETEEN_HALF_TO_TWENTY = "RESERVATION_DIVISION_NINETEEN_HALF_TO_TWENTY",
  TWENTY_TO_TWENTY_HALF = "RESERVATION_DIVISION_TWENTY_TO_TWENTY_HALF",
  TWENTY_HALF_TO_TWENTY_ONE = "RESERVATION_DIVISION_TWENTY_HALF_TO_TWENTY_ONE",
  TWENTY_ONE_TO_TWENTY_ONE_HALF = "RESERVATION_DIVISION_TWENTY_ONE_TO_TWENTY_ONE_HALF",
  TWENTY_ONE_HALF_TO_TWENTY_TWO = "RESERVATION_DIVISION_TWENTY_ONE_HALF_TO_TWENTY_TWO",
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
    value: ReservationDivision.AFTERNOON_ONE,
    label: "午後1",
  },
  {
    value: ReservationDivision.AFTERNOON_TWO,
    label: "午後2",
  },
  {
    value: ReservationDivision.EVENING,
    label: "夜間",
  },
  {
    value: ReservationDivision.EVENING_ONE,
    label: "夜間1",
  },
  {
    value: ReservationDivision.EVENING_TWO,
    label: "夜間2",
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
  {
    value: ReservationDivision.ONE_HOUR,
    label: "1時間",
  },
  {
    value: ReservationDivision.TWO_HOUR,
    label: "2時間",
  },
  {
    value: ReservationDivision.NINE_TO_NINE_HALF,
    label: "09:00-09:30",
  },
  {
    value: ReservationDivision.NINE_HALF_TO_TEN,
    label: "09:30-10:00",
  },
  {
    value: ReservationDivision.TEN_TO_TEN_HALF,
    label: "10:00-10:30",
  },
  {
    value: ReservationDivision.TEN_HALF_TO_EVELEN,
    label: "10:30-11:00",
  },
  {
    value: ReservationDivision.ELEVEN_TO_ELEVEN_HALF,
    label: "11:00-11:30",
  },
  {
    value: ReservationDivision.ELEVEN_HALF_TO_TWELVE,
    label: "11:30-12:00",
  },
  {
    value: ReservationDivision.TWELVE_TO_TWELVE_HALF,
    label: "12:00-12:30",
  },
  {
    value: ReservationDivision.TWELVE_HALF_TO_THIRTEEN,
    label: "12:30-13:00",
  },
  {
    value: ReservationDivision.THIRTEEN_TO_THIRTEEN_HALF,
    label: "13:00-13:30",
  },
  {
    value: ReservationDivision.THIRTEEN_HALF_TO_FOURTEEN,
    label: "13:30-14:00",
  },
  {
    value: ReservationDivision.FOURTEEN_TO_FOURTEEN_HALF,
    label: "14:00-14:30",
  },
  {
    value: ReservationDivision.FOURTEEN_HALF_TO_FIFTEEN,
    label: "14:30-15:00",
  },
  {
    value: ReservationDivision.FIFTEEN_TO_FIFTEEN_HALF,
    label: "15:00-15:30",
  },
  {
    value: ReservationDivision.FIFTEEN_HALF_TO_SIXTEEN,
    label: "15:30-16:00",
  },
  {
    value: ReservationDivision.SIXTEEN_TO_SIXTEEN_HALF,
    label: "16:00-16:30",
  },
  {
    value: ReservationDivision.SIXTEEN_HALF_TO_SEVENTEEN,
    label: "16:30-17:00",
  },
  {
    value: ReservationDivision.SEVENTEEN_TO_SEVENTEEN_HALF,
    label: "17:00-17:30",
  },
  {
    value: ReservationDivision.SEVENTEEN_HALF_TO_EIGHTEEN,
    label: "17:30-18:00",
  },
  {
    value: ReservationDivision.EIGHTEEN_TO_EIGHTEEN_HALF,
    label: "18:00-18:30",
  },
  {
    value: ReservationDivision.EIGHTEEN_HALF_TO_NINETEEN,
    label: "18:30-19:00",
  },
  {
    value: ReservationDivision.NINETEEN_TO_NINETEEN_HALF,
    label: "19:00-19:30",
  },
  {
    value: ReservationDivision.NINETEEN_HALF_TO_TWENTY,
    label: "19:30-20:00",
  },
  {
    value: ReservationDivision.TWENTY_TO_TWENTY_HALF,
    label: "20:00-20:30",
  },
  {
    value: ReservationDivision.TWENTY_HALF_TO_TWENTY_ONE,
    label: "20:30-21:00",
  },
  {
    value: ReservationDivision.TWENTY_ONE_TO_TWENTY_ONE_HALF,
    label: "21:00-21:30",
  },
  {
    value: ReservationDivision.TWENTY_ONE_HALF_TO_TWENTY_TWO,
    label: "21:30-22:00",
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
    value: TokyoWard.INVALID,
    label: "すべて",
  },
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

export enum AvailabilityDivision {
  INVALID = "AVAILABILITY_DIVISION_INVALID",
  AVAILABLE = "AVAILABILITY_DIVISION_AVAILABLE",
  UNAVAILABLE = "AVAILABILITY_DIVISION_UNAVAILABLE",
  UNKNOWN = "AVAILABILITY_DIVISION_UNKNOWN",
}

export const AvailabilityDivisionMap = [
  {
    value: AvailabilityDivision.AVAILABLE,
    label: "利用可",
  },
  {
    value: AvailabilityDivision.UNAVAILABLE,
    label: "利用不可",
  },
  {
    value: AvailabilityDivision.UNKNOWN,
    label: "不明",
  },
];

export enum EquipmentDivision {
  INVALID = "EQUIPMENT_DIVISION_INVALID",
  EQUIPPED = "EQUIPMENT_DIVISION_EQUIPPED",
  UNEQUIPPED = "EQUIPMENT_DIVISION_UNEQUIPPED",
  UNKNOWN = "EQUIPMENT_DIVISION_UNKNOWN",
}

export const EquipmentDivisionMap = [
  {
    value: EquipmentDivision.EQUIPPED,
    label: "あり",
  },
  {
    value: EquipmentDivision.UNEQUIPPED,
    label: "なし",
  },
  {
    value: EquipmentDivision.UNKNOWN,
    label: "不明",
  },
];

export type Enums =
  | ReservationStatus
  | ReservationDivision
  | TokyoWard
  | DayOfWeek
  | AvailabilityDivision
  | EquipmentDivision;
