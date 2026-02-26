import { describe, it, expect } from "vitest";
import {
  ARAKAWA_RESERVATION_STATUS,
  ARAKAWA_RESERVATION_DIVISION,
  ARAKAWA_FEE_DIVISION,
} from "./arakawa";
import {
  BUNKYO_RESERVATION_STATUS,
  BUNKYO_RESERVATION_DIVISION,
  BUNKYO_FEE_DIVISION,
} from "./bunkyo";
import { CHUO_RESERVATION_STATUS, CHUO_RESERVATION_DIVISION, CHUO_FEE_DIVISION } from "./chuo";
import {
  EDOGAWA_RESERVATION_STATUS,
  EDOGAWA_RESERVATION_DIVISION,
  EDOGAWA_FEE_DIVISION,
} from "./edogawa";
import {
  KAWASAKI_RESERVATION_STATUS,
  KAWASAKI_RESERVATION_DIVISION,
  KAWASAKI_FEE_DIVISION,
} from "./kawasaki";
import { KITA_RESERVATION_STATUS, KITA_RESERVATION_DIVISION, KITA_FEE_DIVISION } from "./kita";
import {
  KOUTOU_RESERVATION_STATUS,
  KOUTOU_RESERVATION_DIVISION,
  KOUTOU_FEE_DIVISION,
} from "./koutou";
import { OTA_RESERVATION_STATUS, OTA_RESERVATION_DIVISION, OTA_FEE_DIVISION } from "./ota";
import {
  SUGINAMI_RESERVATION_STATUS,
  SUGINAMI_RESERVATION_DIVISION,
  SUGINAMI_FEE_DIVISION,
} from "./suginami";
import {
  SUMIDA_RESERVATION_STATUS,
  SUMIDA_RESERVATION_DIVISION,
  SUMIDA_FEE_DIVISION,
} from "./sumida";
import {
  TOSHIMA_RESERVATION_STATUS,
  TOSHIMA_RESERVATION_DIVISION,
  TOSHIMA_FEE_DIVISION,
} from "./toshima";
import { ReservationStatus } from "../enums";

const municipalities = [
  {
    name: "荒川区",
    status: ARAKAWA_RESERVATION_STATUS,
    division: ARAKAWA_RESERVATION_DIVISION,
    fee: ARAKAWA_FEE_DIVISION,
  },
  {
    name: "文京区",
    status: BUNKYO_RESERVATION_STATUS,
    division: BUNKYO_RESERVATION_DIVISION,
    fee: BUNKYO_FEE_DIVISION,
  },
  {
    name: "中央区",
    status: CHUO_RESERVATION_STATUS,
    division: CHUO_RESERVATION_DIVISION,
    fee: CHUO_FEE_DIVISION,
  },
  {
    name: "江戸川区",
    status: EDOGAWA_RESERVATION_STATUS,
    division: EDOGAWA_RESERVATION_DIVISION,
    fee: EDOGAWA_FEE_DIVISION,
  },
  {
    name: "川崎市",
    status: KAWASAKI_RESERVATION_STATUS,
    division: KAWASAKI_RESERVATION_DIVISION,
    fee: KAWASAKI_FEE_DIVISION,
  },
  {
    name: "北区",
    status: KITA_RESERVATION_STATUS,
    division: KITA_RESERVATION_DIVISION,
    fee: KITA_FEE_DIVISION,
  },
  {
    name: "江東区",
    status: KOUTOU_RESERVATION_STATUS,
    division: KOUTOU_RESERVATION_DIVISION,
    fee: KOUTOU_FEE_DIVISION,
  },
  {
    name: "大田区",
    status: OTA_RESERVATION_STATUS,
    division: OTA_RESERVATION_DIVISION,
    fee: OTA_FEE_DIVISION,
  },
  {
    name: "杉並区",
    status: SUGINAMI_RESERVATION_STATUS,
    division: SUGINAMI_RESERVATION_DIVISION,
    fee: SUGINAMI_FEE_DIVISION,
  },
  {
    name: "墨田区",
    status: SUMIDA_RESERVATION_STATUS,
    division: SUMIDA_RESERVATION_DIVISION,
    fee: SUMIDA_FEE_DIVISION,
  },
  {
    name: "豊島区",
    status: TOSHIMA_RESERVATION_STATUS,
    division: TOSHIMA_RESERVATION_DIVISION,
    fee: TOSHIMA_FEE_DIVISION,
  },
];

describe("municipality constants", () => {
  it.each(municipalities)("$nameの予約ステータスにVACANTが含まれる", ({ status }) => {
    expect(status[ReservationStatus.VACANT]).toBeDefined();
  });

  it.each(municipalities)("$nameの予約区分が空でない", ({ division }) => {
    expect(Object.keys(division).length).toBeGreaterThan(0);
  });

  it.each(municipalities)("$nameの料金区分が空でない", ({ fee }) => {
    expect(Object.keys(fee).length).toBeGreaterThan(0);
  });

  it.each(municipalities)("$nameのステータス値がすべて文字列である", ({ status }) => {
    Object.values(status).forEach((value) => {
      expect(typeof value).toBe("string");
    });
  });
});
