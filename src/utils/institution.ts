import { ReservationDivision } from "../constants/enums";
import { getEnumLabel } from "./enums";
import { formatPrice } from "./format";
import { sortByReservationDivision } from "./reservation";

export const formatUsageFee = (feeMap: { [key: string]: string }): string => {
  if (!feeMap) {
    return "";
  }
  return sortByReservationDivision(feeMap)
    .map(
      ([division, fee]) =>
        `${getEnumLabel<ReservationDivision>(division)}: ${formatPrice(fee as string)}`
    )
    .join(" ");
};
