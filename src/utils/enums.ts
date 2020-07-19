import {
  Enums,
  ReservationDivision,
  ReservationDivisionMap,
  ReservationStatus,
  ReservationStatusMap,
  TokyoWard,
  TokyoWardMap,
} from "../constants/enums";

export const getEnumMap = (value: string): { value: Enums; label: string }[] => {
  if (Object.values(ReservationStatus).includes(value as ReservationStatus)) {
    return ReservationStatusMap;
  }
  if (Object.values(ReservationDivision).includes(value as ReservationDivision)) {
    return ReservationDivisionMap;
  }
  throw new Error(`no enum found for ${value}`);
};

export const getEnumLabel = <T extends Enums>(value: string): string | T => {
  return getEnumMap(value).find((val) => val.value === value)?.label || value;
};

export const SupportedTokyoWards = TokyoWardMap.filter((option) =>
  [TokyoWard.KOUTOU, TokyoWard.BUNKYO, TokyoWard.KITA, TokyoWard.TOSHIMA].includes(option.value)
);
