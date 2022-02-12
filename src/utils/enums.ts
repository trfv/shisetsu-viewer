import { AvailabilityDivision, EquipmentDivision, InstitutionSize } from "../constants/enums";

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

export const InstitutionSizeMap: Record<string, string> = {
  [InstitutionSize.LARGE]: "大（100㎡~）",
  [InstitutionSize.MEDIUM]: "中（50㎡~100㎡）",
  [InstitutionSize.SMALL]: "小（~50㎡）",
  [InstitutionSize.UNKNOWN]: "不明",
};
