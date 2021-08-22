import { AvailabilityDivision, EquipmentDivision } from "../constants/enums";

export const AvailabilityDivisionMap: Record<string, string> = {
  [AvailabilityDivision.AVAILABLE]: "利用可",
  [AvailabilityDivision.UNAVAILABLE]: "利用不可",
  [AvailabilityDivision.UNKNOWN]: "不明",
};

export const EquipmentDivisionMap: Record<string, string> = {
  [EquipmentDivision.EQUIPPED]: "あり",
  [EquipmentDivision.UNEQUIPPED]: "なし",
  [EquipmentDivision.UNKNOWN]: "不明",
};
