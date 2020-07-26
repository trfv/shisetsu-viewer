import {
  AvailabilityDivision,
  AvailabilityDivisionMap,
  Enums,
  EquipmentDivision,
  EquipmentDivisionMap,
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
  if (Object.values(TokyoWard).includes(value as TokyoWard)) {
    return TokyoWardMap;
  }
  if (Object.values(AvailabilityDivision).includes(value as AvailabilityDivision)) {
    return AvailabilityDivisionMap;
  }
  if (Object.values(EquipmentDivision).includes(value as EquipmentDivision)) {
    return EquipmentDivisionMap;
  }
  throw new Error(`no enum found for ${value}`);
};

export const getEnumLabel = <T extends Enums>(value: string | undefined): string | T => {
  if (value === undefined) {
    return "";
  }
  return getEnumMap(value).find((val) => val.value === value)?.label || value;
};

export const SupportedTokyoWards = TokyoWardMap.filter((option) =>
  [TokyoWard.KOUTOU, TokyoWard.BUNKYO, TokyoWard.KITA, TokyoWard.TOSHIMA].includes(option.value)
);

export const fromEnumToUrlTokyoWard = (tokyoWard: TokyoWard) =>
  tokyoWard.split("_").pop()!.toLowerCase();

export const fromUrlToEnumTokyoWard = (tokyoWard: string) =>
  `TOKYO_WARD_${tokyoWard.toUpperCase()}`;
