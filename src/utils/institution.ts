import { ReservationDivisionMap, SupportedTokyoWard } from "./enums";
import { formatPrice } from "./format";
import { sortByReservationDivision } from "./reservation";

export const formatUsageFee = (
  tokyoWard: SupportedTokyoWard,
  feeMap: Record<string, string>
): string => {
  if (!feeMap) {
    return "";
  }
  return sortByReservationDivision(feeMap)
    .map(
      ([division, fee]) =>
        `${ReservationDivisionMap[tokyoWard]?.[division] ?? ""}: ${formatPrice(fee)}`
    )
    .join(" ");
};

export const getGoogleMapLink = (address: string): string => {
  return `https://www.google.com/maps/search/?api=1&query=${address}`;
};
