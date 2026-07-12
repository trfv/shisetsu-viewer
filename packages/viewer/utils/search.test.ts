import { describe, expect, test } from "vitest";
import { InstitutionSize as InstitutionSizeEnum } from "../constants/enums";
import {
  type AvailableInstrument,
  AVAILABLE_INSTRUMENT_MAP,
  buildFilterChips,
  getAvailableInstrumentFromUrlParam,
  getInstitutionSizeFromUrlParam,
  INSTITUTION_SIZE_MAP,
  toggleArrayParam,
  toInstitutionSizeParam,
} from "./search";

describe("getAvailableInstrumentFromUrlParam", () => {
  test("returns empty array for null", () => {
    expect(getAvailableInstrumentFromUrlParam(null)).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(getAvailableInstrumentFromUrlParam(undefined)).toEqual([]);
  });

  test("returns empty array for empty array", () => {
    expect(getAvailableInstrumentFromUrlParam([])).toEqual([]);
  });

  test("returns valid instruments from param", () => {
    expect(getAvailableInstrumentFromUrlParam(["s", "w"])).toEqual(["s", "w"]);
  });

  test("returns all valid instruments", () => {
    expect(getAvailableInstrumentFromUrlParam(["s", "w", "b", "p"])).toEqual(["s", "w", "b", "p"]);
  });

  test("filters out invalid instruments", () => {
    expect(getAvailableInstrumentFromUrlParam(["invalid"])).toEqual([]);
  });

  test("filters mixed valid and invalid instruments", () => {
    expect(getAvailableInstrumentFromUrlParam(["s", "invalid", "b", "xyz"])).toEqual(["s", "b"]);
  });

  test("filters out null values in array", () => {
    expect(getAvailableInstrumentFromUrlParam(["s", null, "w"])).toEqual(["s", "w"]);
  });
});

describe("getInstitutionSizeFromUrlParam", () => {
  test("returns empty array for null", () => {
    expect(getInstitutionSizeFromUrlParam(null)).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(getInstitutionSizeFromUrlParam(undefined)).toEqual([]);
  });

  test("returns empty array for empty array", () => {
    expect(getInstitutionSizeFromUrlParam([])).toEqual([]);
  });

  test("returns valid sizes from param", () => {
    expect(getInstitutionSizeFromUrlParam(["l", "m"])).toEqual(["l", "m"]);
  });

  test("returns all valid sizes", () => {
    expect(getInstitutionSizeFromUrlParam(["l", "m", "s"])).toEqual(["l", "m", "s"]);
  });

  test("filters out invalid sizes", () => {
    expect(getInstitutionSizeFromUrlParam(["invalid"])).toEqual([]);
  });

  test("filters mixed valid and invalid sizes", () => {
    expect(getInstitutionSizeFromUrlParam(["l", "invalid", "s"])).toEqual(["l", "s"]);
  });

  test("filters out null values in array", () => {
    expect(getInstitutionSizeFromUrlParam(["l", null, "m"])).toEqual(["l", "m"]);
  });
});

describe("toInstitutionSizeParam", () => {
  test("returns undefined for empty array", () => {
    expect(toInstitutionSizeParam([])).toBeUndefined();
  });

  test("returns LARGE enum for ['l']", () => {
    expect(toInstitutionSizeParam(["l"])).toEqual([InstitutionSizeEnum.LARGE]);
  });

  test("returns MEDIUM enum for ['m']", () => {
    expect(toInstitutionSizeParam(["m"])).toEqual([InstitutionSizeEnum.MEDIUM]);
  });

  test("returns SMALL enum for ['s']", () => {
    expect(toInstitutionSizeParam(["s"])).toEqual([InstitutionSizeEnum.SMALL]);
  });

  test("returns multiple enums for multiple sizes", () => {
    expect(toInstitutionSizeParam(["l", "m", "s"])).toEqual([
      InstitutionSizeEnum.LARGE,
      InstitutionSizeEnum.MEDIUM,
      InstitutionSizeEnum.SMALL,
    ]);
  });
});

describe("AVAILABLE_INSTRUMENT_MAP", () => {
  test("has 4 entries", () => {
    expect(Object.keys(AVAILABLE_INSTRUMENT_MAP)).toHaveLength(4);
  });

  test("maps instrument codes to Japanese labels", () => {
    expect(AVAILABLE_INSTRUMENT_MAP["s"]).toBe("弦楽器");
    expect(AVAILABLE_INSTRUMENT_MAP["w"]).toBe("木管楽器");
    expect(AVAILABLE_INSTRUMENT_MAP["b"]).toBe("金管楽器");
    expect(AVAILABLE_INSTRUMENT_MAP["p"]).toBe("打楽器");
  });
});

describe("INSTITUTION_SIZE_MAP", () => {
  test("has 3 entries", () => {
    expect(Object.keys(INSTITUTION_SIZE_MAP)).toHaveLength(3);
  });

  test("maps size codes to Japanese labels", () => {
    expect(INSTITUTION_SIZE_MAP["l"]).toBe("大（100㎡~）");
    expect(INSTITUTION_SIZE_MAP["m"]).toBe("中（50㎡~100㎡）");
    expect(INSTITUTION_SIZE_MAP["s"]).toBe("小（~50㎡）");
  });
});

describe("toggleArrayParam", () => {
  test("checked のとき value を追加する", () => {
    expect(toggleArrayParam<AvailableInstrument>(["s"], "w", true)).toEqual(["s", "w"]);
  });

  test("unchecked のとき value を除去する", () => {
    expect(toggleArrayParam<AvailableInstrument>(["s", "w"], "w", false)).toEqual(["s"]);
  });

  test("unchecked で存在しない value なら変化しない", () => {
    expect(toggleArrayParam<AvailableInstrument>(["s"], "w", false)).toEqual(["s"]);
  });

  test("元の配列を破壊しない", () => {
    const current: AvailableInstrument[] = ["s"];
    toggleArrayParam(current, "w", true);
    expect(current).toEqual(["s"]);
  });
});

describe("buildFilterChips", () => {
  test("選択済みの値だけを chip 化する", () => {
    const chips = buildFilterChips(AVAILABLE_INSTRUMENT_MAP, ["s", "b"], () => {});
    expect(chips.map((c) => c.label)).toEqual(["弦楽器", "金管楽器"]);
  });

  test("選択が空なら空配列", () => {
    expect(buildFilterChips(AVAILABLE_INSTRUMENT_MAP, [], () => {})).toEqual([]);
  });

  test("onDelete は対象値を除いた配列で onChange を呼ぶ", () => {
    let received: string[] | undefined;
    const chips = buildFilterChips(AVAILABLE_INSTRUMENT_MAP, ["s", "b"], (next) => {
      received = next;
    });
    chips[0]!.onDelete();
    expect(received).toEqual(["b"]);
  });
});
