import {
  ReservationDivision,
  ReservationStatus,
  ReservationStatusMap,
  TokyoWard,
} from "../constants/enums";
import { getEnumLabel } from "./enums";

// key に ReservationDivision を利用している Object をソートした配列で返す
export const sortByReservationDivision = (map: { [key: string]: string }) => {
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
  if (map[ReservationDivision.EVENING_ONE]) {
    res.push([ReservationDivision.EVENING_ONE, map[ReservationDivision.EVENING_ONE]]);
  }
  if (map[ReservationDivision.EVENING_TWO]) {
    res.push([ReservationDivision.EVENING_TWO, map[ReservationDivision.EVENING_TWO]]);
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
  if (map[ReservationDivision.NINE_TO_NINE_HALF]) {
    res.push([ReservationDivision.NINE_TO_NINE_HALF, map[ReservationDivision.NINE_TO_NINE_HALF]]);
  }
  if (map[ReservationDivision.NINE_HALF_TO_TEN]) {
    res.push([ReservationDivision.NINE_HALF_TO_TEN, map[ReservationDivision.NINE_HALF_TO_TEN]]);
  }
  if (map[ReservationDivision.TEN_TO_TEN_HALF]) {
    res.push([ReservationDivision.TEN_TO_TEN_HALF, map[ReservationDivision.TEN_TO_TEN_HALF]]);
  }
  if (map[ReservationDivision.TEN_HALF_TO_EVELEN]) {
    res.push([ReservationDivision.TEN_HALF_TO_EVELEN, map[ReservationDivision.TEN_HALF_TO_EVELEN]]);
  }
  if (map[ReservationDivision.ELEVEN_TO_ELEVEN_HALF]) {
    res.push([
      ReservationDivision.ELEVEN_TO_ELEVEN_HALF,
      map[ReservationDivision.ELEVEN_TO_ELEVEN_HALF],
    ]);
  }
  if (map[ReservationDivision.ELEVEN_HALF_TO_TWELVE]) {
    res.push([
      ReservationDivision.ELEVEN_HALF_TO_TWELVE,
      map[ReservationDivision.ELEVEN_HALF_TO_TWELVE],
    ]);
  }
  if (map[ReservationDivision.TWELVE_TO_TWELVE_HALF]) {
    res.push([
      ReservationDivision.TWELVE_TO_TWELVE_HALF,
      map[ReservationDivision.TWELVE_TO_TWELVE_HALF],
    ]);
  }
  if (map[ReservationDivision.TWELVE_HALF_TO_THIRTEEN]) {
    res.push([
      ReservationDivision.TWELVE_HALF_TO_THIRTEEN,
      map[ReservationDivision.TWELVE_HALF_TO_THIRTEEN],
    ]);
  }
  if (map[ReservationDivision.THIRTEEN_TO_THIRTEEN_HALF]) {
    res.push([
      ReservationDivision.THIRTEEN_TO_THIRTEEN_HALF,
      map[ReservationDivision.THIRTEEN_TO_THIRTEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.THIRTEEN_HALF_TO_FOURTEEN]) {
    res.push([
      ReservationDivision.THIRTEEN_HALF_TO_FOURTEEN,
      map[ReservationDivision.THIRTEEN_HALF_TO_FOURTEEN],
    ]);
  }
  if (map[ReservationDivision.FOURTEEN_TO_FOURTEEN_HALF]) {
    res.push([
      ReservationDivision.FOURTEEN_TO_FOURTEEN_HALF,
      map[ReservationDivision.FOURTEEN_TO_FOURTEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.FOURTEEN_HALF_TO_FIFTEEN]) {
    res.push([
      ReservationDivision.FOURTEEN_HALF_TO_FIFTEEN,
      map[ReservationDivision.FOURTEEN_HALF_TO_FIFTEEN],
    ]);
  }
  if (map[ReservationDivision.FIFTEEN_TO_FIFTEEN_HALF]) {
    res.push([
      ReservationDivision.FIFTEEN_TO_FIFTEEN_HALF,
      map[ReservationDivision.FIFTEEN_TO_FIFTEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.FIFTEEN_HALF_TO_SIXTEEN]) {
    res.push([
      ReservationDivision.FIFTEEN_HALF_TO_SIXTEEN,
      map[ReservationDivision.FIFTEEN_HALF_TO_SIXTEEN],
    ]);
  }
  if (map[ReservationDivision.SIXTEEN_TO_SIXTEEN_HALF]) {
    res.push([
      ReservationDivision.SIXTEEN_TO_SIXTEEN_HALF,
      map[ReservationDivision.SIXTEEN_TO_SIXTEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.SIXTEEN_HALF_TO_SEVENTEEN]) {
    res.push([
      ReservationDivision.SIXTEEN_HALF_TO_SEVENTEEN,
      map[ReservationDivision.SIXTEEN_HALF_TO_SEVENTEEN],
    ]);
  }
  if (map[ReservationDivision.SEVENTEEN_TO_SEVENTEEN_HALF]) {
    res.push([
      ReservationDivision.SEVENTEEN_TO_SEVENTEEN_HALF,
      map[ReservationDivision.SEVENTEEN_TO_SEVENTEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.SEVENTEEN_HALF_TO_EIGHTEEN]) {
    res.push([
      ReservationDivision.SEVENTEEN_HALF_TO_EIGHTEEN,
      map[ReservationDivision.SEVENTEEN_HALF_TO_EIGHTEEN],
    ]);
  }
  if (map[ReservationDivision.EIGHTEEN_TO_EIGHTEEN_HALF]) {
    res.push([
      ReservationDivision.EIGHTEEN_TO_EIGHTEEN_HALF,
      map[ReservationDivision.EIGHTEEN_TO_EIGHTEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.EIGHTEEN_HALF_TO_NINETEEN]) {
    res.push([
      ReservationDivision.EIGHTEEN_HALF_TO_NINETEEN,
      map[ReservationDivision.EIGHTEEN_HALF_TO_NINETEEN],
    ]);
  }
  if (map[ReservationDivision.NINETEEN_TO_NINETEEN_HALF]) {
    res.push([
      ReservationDivision.NINETEEN_TO_NINETEEN_HALF,
      map[ReservationDivision.NINETEEN_TO_NINETEEN_HALF],
    ]);
  }
  if (map[ReservationDivision.NINETEEN_HALF_TO_TWENTY]) {
    res.push([
      ReservationDivision.NINETEEN_HALF_TO_TWENTY,
      map[ReservationDivision.NINETEEN_HALF_TO_TWENTY],
    ]);
  }
  if (map[ReservationDivision.TWENTY_TO_TWENTY_HALF]) {
    res.push([
      ReservationDivision.TWENTY_TO_TWENTY_HALF,
      map[ReservationDivision.TWENTY_TO_TWENTY_HALF],
    ]);
  }
  if (map[ReservationDivision.TWENTY_HALF_TO_TWENTY_ONE]) {
    res.push([
      ReservationDivision.TWENTY_HALF_TO_TWENTY_ONE,
      map[ReservationDivision.TWENTY_HALF_TO_TWENTY_ONE],
    ]);
  }
  if (map[ReservationDivision.TWENTY_ONE_TO_TWENTY_ONE_HALF]) {
    res.push([
      ReservationDivision.TWENTY_ONE_TO_TWENTY_ONE_HALF,
      map[ReservationDivision.TWENTY_ONE_TO_TWENTY_ONE_HALF],
    ]);
  }
  if (map[ReservationDivision.TWENTY_ONE_HALF_TO_TWENTY_TWO]) {
    res.push([
      ReservationDivision.TWENTY_ONE_HALF_TO_TWENTY_TWO,
      map[ReservationDivision.TWENTY_ONE_HALF_TO_TWENTY_TWO],
    ]);
  }
  return res;
};

export const formatReservationMap = (map: { [key: string]: string }) => {
  const sorted = sortByReservationDivision(map);
  const parts = new Array(Math.ceil(sorted.length / 3)).fill([]).map(() => sorted.splice(0, 3));
  return parts
    .map((part) =>
      part
        .map(([division, status]) =>
          [
            getEnumLabel<ReservationDivision>(division),
            getEnumLabel<ReservationStatus>(status),
          ].join(": ")
        )
        .join(" ")
    )
    .join("\n");
};

const ALL_RESERVATION_STATUS = Object.values(ReservationStatus).filter(
  (v) => v !== ReservationStatus.INVALID
);

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

const EDOGAWA_RESERVATION_STATUS = [
  ReservationStatus.VACANT,
  ReservationStatus.OCCUPIED,
  ReservationStatus.CANCELED,
  ReservationStatus.CLOSED,
  ReservationStatus.KEEP,
  ReservationStatus.OUT_OF_TARGRT,
];

export const getEachWardReservationStatus = (
  tokyoWard: TokyoWard
): {
  value: string;
  label: string;
}[] => {
  switch (tokyoWard) {
    case TokyoWard.INVALID:
      return ReservationStatusMap.filter((option) => ALL_RESERVATION_STATUS.includes(option.value));
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
    case TokyoWard.EDOGAWA:
      return ReservationStatusMap.filter((option) =>
        EDOGAWA_RESERVATION_STATUS.includes(option.value)
      );
    default:
      throw new Error(`unsupported tokyo ward: ${tokyoWard}`);
  }
};
