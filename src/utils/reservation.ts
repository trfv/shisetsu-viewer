// eslint-disable-next-line
import { ReservationDivision, ReservationStatus, ReservationStatusMap, TokyoWard } from "../constants/enums";

export const sortReservation = (reservation: {
  [key: string]: ReservationStatus;
}): { division: ReservationDivision; status: ReservationStatus }[] => {
  return [
    ...(reservation.RESERVATION_DIVISION_MORNING
      ? [
          {
            division: ReservationDivision.MORNING,
            status: reservation.RESERVATION_DIVISION_MORNING,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_AFTERNOON
      ? [
          {
            division: ReservationDivision.AFTERNOON,
            status: reservation.RESERVATION_DIVISION_AFTERNOON,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_EVENING
      ? [
          {
            division: ReservationDivision.EVENING,
            status: reservation.RESERVATION_DIVISION_EVENING,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_ONE
      ? [
          {
            division: ReservationDivision.ONE,
            status: reservation.RESERVATION_DIVISION_ONE,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_TWO
      ? [
          {
            division: ReservationDivision.TWO,
            status: reservation.RESERVATION_DIVISION_TWO,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_THREE
      ? [
          {
            division: ReservationDivision.THREE,
            status: reservation.RESERVATION_DIVISION_THREE,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_FOUR
      ? [
          {
            division: ReservationDivision.FOUR,
            status: reservation.RESERVATION_DIVISION_FOUR,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_FIVE
      ? [
          {
            division: ReservationDivision.FIVE,
            status: reservation.RESERVATION_DIVISION_FIVE,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_SIX
      ? [
          {
            division: ReservationDivision.SIX,
            status: reservation.RESERVATION_DIVISION_SIX,
          },
        ]
      : []),
  ];
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
    default:
      throw new Error(`unsupported tokyo ward: ${tokyoWard}`);
  }
};
