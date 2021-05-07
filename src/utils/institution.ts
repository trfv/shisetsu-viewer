import { FeeDivision } from "../constants/enums";
import { FeeDivisionMap, SupportedTokyoWard } from "./enums";
import { formatPrice } from "./format";

const FEE_DIVISION_ORDER = {
  [FeeDivision.INVALID]: 0,
  [FeeDivision.MORNING]: 1,
  [FeeDivision.MORNING_ONE]: 2,
  [FeeDivision.MORNING_TWO]: 3,
  [FeeDivision.AFTERNOON]: 4,
  [FeeDivision.AFTERNOON_ONE]: 5,
  [FeeDivision.AFTERNOON_TWO]: 6,
  [FeeDivision.EVENING]: 7,
  [FeeDivision.EVENING_ONE]: 8,
  [FeeDivision.EVENING_TWO]: 9,
  [FeeDivision.ONE_HOUR]: 10,
  [FeeDivision.TWO_HOUR]: 11,
  [FeeDivision.DIVISION_1]: 12,
  [FeeDivision.DIVISION_2]: 13,
  [FeeDivision.DIVISION_3]: 14,
  [FeeDivision.DIVISION_4]: 15,
  [FeeDivision.DIVISION_5]: 16,
  [FeeDivision.DIVISION_6]: 17,
  [FeeDivision.DIVISION_7]: 18,
  [FeeDivision.DIVISION_8]: 19,
  [FeeDivision.DIVISION_9]: 20,
  [FeeDivision.DIVISION_10]: 21,
};

type FeeDivisionKey = keyof typeof FEE_DIVISION_ORDER;

// key に FeeDivision を利用している Object をソートした配列で返す
export const sortByFeeDivision = (obj: Record<string, string>): [string, string][] => {
  return Object.entries(obj).sort(
    ([a], [b]) => FEE_DIVISION_ORDER[a as FeeDivisionKey] - FEE_DIVISION_ORDER[b as FeeDivisionKey]
  );
};

export const formatUsageFee = (
  tokyoWard: SupportedTokyoWard,
  feeMap: Record<string, string>
): string => {
  if (!feeMap) {
    return "";
  }
  return sortByFeeDivision(feeMap)
    .map(([division, fee]) => `${FeeDivisionMap[tokyoWard]?.[division] ?? ""}: ${formatPrice(fee)}`)
    .join(" ");
};

export const getGoogleMapLink = (address: string): string => {
  return `https://www.google.com/maps/search/?api=1&query=${address}`;
};
