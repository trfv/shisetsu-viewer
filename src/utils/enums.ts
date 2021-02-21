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
  return getEnumMap(value).find((val) => val.value === value)?.label ?? value;
};

export const SupportedTokyoWards = TokyoWardMap.filter((option) =>
  [
    TokyoWard.INVALID,
    TokyoWard.KOUTOU,
    TokyoWard.BUNKYO,
    TokyoWard.KITA,
    TokyoWard.TOSHIMA,
  ].includes(option.value)
);

export const getTokyoWardFromUrlParam = (param: string | null | undefined): TokyoWard => {
  switch (param) {
    case "koutou":
      return TokyoWard.KOUTOU;
    case "bunkyo":
      return TokyoWard.BUNKYO;
    case "kita":
      return TokyoWard.KITA;
    case "toshima":
      return TokyoWard.TOSHIMA;
    default:
      return TokyoWard.INVALID;
  }
};

export const convertTokyoWardToUrlParam = (tokyoWard: TokyoWard): string | null => {
  return tokyoWard === TokyoWard.INVALID
    ? null
    : tokyoWard.replace("TOKYO_WARD_", "").toLowerCase();
};
