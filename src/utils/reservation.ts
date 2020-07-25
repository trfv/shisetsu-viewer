import {
  ReservationDivision,
  ReservationStatus,
  ReservationStatusMap,
  TokyoWard,
} from "../constants/enums";

// key に ReservationDivision を利用している Object をソートした配列で返す
export const sortByReservationDivision = (map: { [key: string]: any }) => {
  const res = [];
  if (map[ReservationDivision.MORNING]) {
    res.push([ReservationDivision.MORNING, map[ReservationDivision.MORNING]]);
  }
  if (map[ReservationDivision.AFTERNOON]) {
    res.push([ReservationDivision.AFTERNOON, map[ReservationDivision.AFTERNOON]]);
  }
  if (map[ReservationDivision.AFTERNOON_ONE]) {
    res.push([ReservationDivision.AFTERNOON_ONE, map[ReservationDivision.AFTERNOON_ONE]]);
  }
  if (map[ReservationDivision.AFTERNOON_TWO]) {
    res.push([ReservationDivision.AFTERNOON_TWO, map[ReservationDivision.AFTERNOON_TWO]]);
  }
  if (map[ReservationDivision.EVENING]) {
    res.push([ReservationDivision.EVENING, map[ReservationDivision.EVENING]]);
  }
  if (map[ReservationDivision.ONE]) {
    res.push([ReservationDivision.ONE, map[ReservationDivision.ONE]]);
  }
  if (map[ReservationDivision.TWO]) {
    res.push([ReservationDivision.TWO, map[ReservationDivision.TWO]]);
  }
  if (map[ReservationDivision.THREE]) {
    res.push([ReservationDivision.THREE, map[ReservationDivision.THREE]]);
  }
  if (map[ReservationDivision.FOUR]) {
    res.push([ReservationDivision.FOUR, map[ReservationDivision.FOUR]]);
  }
  if (map[ReservationDivision.FIVE]) {
    res.push([ReservationDivision.FIVE, map[ReservationDivision.FIVE]]);
  }
  if (map[ReservationDivision.SIX]) {
    res.push([ReservationDivision.SIX, map[ReservationDivision.SIX]]);
  }
  if (map[ReservationDivision.ONE_HOUR]) {
    res.push([ReservationDivision.ONE_HOUR, map[ReservationDivision.ONE_HOUR]]);
  }
  if (map[ReservationDivision.TWO_HOUR]) {
    res.push([ReservationDivision.TWO_HOUR, map[ReservationDivision.TWO_HOUR]]);
  }
  return res;
};

const KOUTOU_RESERVATION_STATUS = [
  ReservationStatus.VACANT,
  ReservationStatus.OCCUPIED,
  ReservationStatus.CLOSED,
  ReservationStatus.KEEP,
  ReservationStatus.KIKANGAI,
  ReservationStatus.SOUND,
];

const BUNKYO_RESERVATION_STATUS = [
  ReservationStatus.VACANT,
  ReservationStatus.OCCUPIED,
  ReservationStatus.KIKANGAI,
  ReservationStatus.OPEN,
];

const KITA_RESERVATION_STATUS = [
  ReservationStatus.VACANT,
  ReservationStatus.OCCUPIED,
  ReservationStatus.KEEP,
  ReservationStatus.CLOSED,
  ReservationStatus.QUESTION,
];

const TOSHIMA_RESERVATION_STATUS = [
  ReservationStatus.VACANT,
  ReservationStatus.PARTIALLY_VACANT,
  ReservationStatus.OCCUPIED,
  ReservationStatus.CLOSED,
  ReservationStatus.OUT_OF_TARGRT,
  ReservationStatus.APPLIABLE,
];

export const getEachWardReservationStatus = (
  tokyoWard: TokyoWard
): {
  value: string;
  label: string;
}[] => {
  switch (tokyoWard) {
    case TokyoWard.KOUTOU:
      return ReservationStatusMap.filter((option) =>
        KOUTOU_RESERVATION_STATUS.includes(option.value)
      );
    case TokyoWard.BUNKYO:
      return ReservationStatusMap.filter((option) =>
        BUNKYO_RESERVATION_STATUS.includes(option.value)
      );
    case TokyoWard.KITA:
      return ReservationStatusMap.filter((option) =>
        KITA_RESERVATION_STATUS.includes(option.value)
      );
    case TokyoWard.TOSHIMA:
      return ReservationStatusMap.filter((option) =>
        TOSHIMA_RESERVATION_STATUS.includes(option.value)
      );
    default:
      throw new Error(`unsupported tokyo ward: ${tokyoWard}`);
  }
};
