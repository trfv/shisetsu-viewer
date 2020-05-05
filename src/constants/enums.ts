export enum ReservationStatus {
  INVALID = "RESERVATION_STATUS_INVALID",
  VACANT = "RESERVATION_STATUS_VACANT",
  OCCUPIED = "RESERVATION_STATUS_OCCUPIED",
  CLOSED = "RESERVATION_STATUS_CLOSED",
  KEEP = "RESERVATION_STATUS_KEEP",
  KIKANGAI = "RESERVATION_STATUS_KIKANGAI",
  SOUND = "RESERVATION_STATUS_SOUND",
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

export type Enums = ReservationStatus | ReservationDivision;

export const getEnumMap = (value: string): { value: Enums; label: string }[] => {
  if (Object.values(ReservationStatus).includes(value as ReservationStatus)) {
    return ReservationStatusMap;
  }
  if (Object.values(ReservationDivision).includes(value as ReservationDivision)) {
    return ReservationDivisionMap;
  }
  throw new Error(`no enum found for ${value}`);
};
