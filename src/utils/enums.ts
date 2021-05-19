import {
  ARAKAWA_FEE_DIVISION,
  ARAKAWA_RESERVATION_DIVISION,
  ARAKAWA_RESERVATION_STATUS,
} from "../constants/arakawa";
import {
  BUNKYO_FEE_DIVISION,
  BUNKYO_RESERVATION_DIVISION,
  BUNKYO_RESERVATION_STATUS,
} from "../constants/bunkyo";
import {
  EDOGAWA_FEE_DIVISION,
  EDOGAWA_RESERVATION_DIVISION,
  EDOGAWA_RESERVATION_STATUS,
} from "../constants/edogawa";
import { TokyoWard, TokyoWardMap } from "../constants/enums";
import {
  KITA_FEE_DIVISION,
  KITA_RESERVATION_DIVISION,
  KITA_RESERVATION_STATUS,
} from "../constants/kita";
import {
  KOUTOU_FEE_DIVISION,
  KOUTOU_RESERVATION_DIVISION,
  KOUTOU_RESERVATION_STATUS,
} from "../constants/koutou";
import {
  TOSHIMA_FEE_DIVISION,
  TOSHIMA_RESERVATION_DIVISION,
  TOSHIMA_RESERVATION_STATUS,
} from "../constants/toshima";

export const SupportedTokyoWards = [
  TokyoWard.INVALID,
  TokyoWard.KOUTOU,
  TokyoWard.BUNKYO,
  TokyoWard.KITA,
  TokyoWard.TOSHIMA,
  TokyoWard.EDOGAWA,
  TokyoWard.ARAKAWA,
] as const;

export type SupportedTokyoWard = typeof SupportedTokyoWards[number];

export const TokyoWardOptions = Object.entries(TokyoWardMap)
  .filter(([k]) => SupportedTokyoWards.some((w) => w === k))
  .map(([k, v]) => ({ value: k, label: v }));

export const ReservationDivisionMap: Readonly<Record<string, Record<string, string>>> = {
  [TokyoWard.KOUTOU]: KOUTOU_RESERVATION_DIVISION,
  [TokyoWard.BUNKYO]: BUNKYO_RESERVATION_DIVISION,
  [TokyoWard.KITA]: KITA_RESERVATION_DIVISION,
  [TokyoWard.TOSHIMA]: TOSHIMA_RESERVATION_DIVISION,
  [TokyoWard.EDOGAWA]: EDOGAWA_RESERVATION_DIVISION,
  [TokyoWard.ARAKAWA]: ARAKAWA_RESERVATION_DIVISION,
};

export const FeeDivisionMap: Readonly<Record<string, Record<string, string>>> = {
  [TokyoWard.KOUTOU]: KOUTOU_FEE_DIVISION,
  [TokyoWard.BUNKYO]: BUNKYO_FEE_DIVISION,
  [TokyoWard.KITA]: KITA_FEE_DIVISION,
  [TokyoWard.TOSHIMA]: TOSHIMA_FEE_DIVISION,
  [TokyoWard.EDOGAWA]: EDOGAWA_FEE_DIVISION,
  [TokyoWard.ARAKAWA]: ARAKAWA_FEE_DIVISION,
};

export const ReservationStatusMap: Readonly<Record<string, Record<string, string>>> = {
  [TokyoWard.KOUTOU]: KOUTOU_RESERVATION_STATUS,
  [TokyoWard.BUNKYO]: BUNKYO_RESERVATION_STATUS,
  [TokyoWard.KITA]: KITA_RESERVATION_STATUS,
  [TokyoWard.TOSHIMA]: TOSHIMA_RESERVATION_STATUS,
  [TokyoWard.EDOGAWA]: EDOGAWA_RESERVATION_STATUS,
  [TokyoWard.ARAKAWA]: ARAKAWA_RESERVATION_STATUS,
};
