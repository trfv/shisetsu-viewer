import { describe, expect, test } from "vitest";
import { InstitutionSize as InstitutionSizeEnum } from "../constants/enums";
import {
  STRINGS,
  WOODWIND,
  BRASS,
  PERCUSSION,
  AVAILABLE_INSTRUMENT_MAP,
  AvailableInstruments,
  getAvailableInstrumentFromUrlParam,
  LARGE,
  MEDIUM,
  SMALL,
  INSTUTITON_SIZE_MAP,
  InstitutionSizes,
  getInstitutionSizeFromUrlParam,
  INSTUTITON_SIZE_PARAM_MAP,
  toInstitutionSizeParam,
} from "./search";

describe("constants", () => {
  test("instrument constants have correct values", () => {
    expect(STRINGS).toBe("s");
    expect(WOODWIND).toBe("w");
    expect(BRASS).toBe("b");
    expect(PERCUSSION).toBe("p");
  });

  test("size constants have correct values", () => {
    expect(LARGE).toBe("l");
    expect(MEDIUM).toBe("m");
    expect(SMALL).toBe("s");
  });
});

describe("AVAILABLE_INSTRUMENT_MAP", () => {
  test("maps instrument codes to Japanese labels", () => {
    expect(AVAILABLE_INSTRUMENT_MAP[STRINGS]).toBe("弦楽器");
    expect(AVAILABLE_INSTRUMENT_MAP[WOODWIND]).toBe("木管楽器");
    expect(AVAILABLE_INSTRUMENT_MAP[BRASS]).toBe("金管楽器");
    expect(AVAILABLE_INSTRUMENT_MAP[PERCUSSION]).toBe("打楽器");
  });
});

describe("AvailableInstruments", () => {
  test("contains all instrument codes", () => {
    expect(AvailableInstruments).toContain(STRINGS);
    expect(AvailableInstruments).toContain(WOODWIND);
    expect(AvailableInstruments).toContain(BRASS);
    expect(AvailableInstruments).toContain(PERCUSSION);
    expect(AvailableInstruments).toHaveLength(4);
  });
});

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

  test("filters valid instrument codes", () => {
    const input = ["s", "w", "b", "p"];
    const result = getAvailableInstrumentFromUrlParam(input);
    expect(result).toEqual([STRINGS, WOODWIND, BRASS, PERCUSSION]);
  });

  test("filters out invalid values", () => {
    const input = ["s", "invalid", "b", null, "x"];
    const result = getAvailableInstrumentFromUrlParam(input);
    expect(result).toEqual([STRINGS, BRASS]);
  });

  test("returns empty array for all invalid values", () => {
    const input = ["invalid", "x", "y"];
    const result = getAvailableInstrumentFromUrlParam(input);
    expect(result).toEqual([]);
  });

  test("handles single valid value", () => {
    const result = getAvailableInstrumentFromUrlParam(["w"]);
    expect(result).toEqual([WOODWIND]);
  });

  test("preserves order of valid values", () => {
    const input = ["p", "s", "b"];
    const result = getAvailableInstrumentFromUrlParam(input);
    expect(result).toEqual([PERCUSSION, STRINGS, BRASS]);
  });
});

describe("INSTUTITON_SIZE_MAP", () => {
  test("maps size codes to Japanese labels", () => {
    expect(INSTUTITON_SIZE_MAP[LARGE]).toBe("大");
    expect(INSTUTITON_SIZE_MAP[MEDIUM]).toBe("中");
    expect(INSTUTITON_SIZE_MAP[SMALL]).toBe("小");
  });
});

describe("InstitutionSizes", () => {
  test("contains all size codes", () => {
    expect(InstitutionSizes).toContain(LARGE);
    expect(InstitutionSizes).toContain(MEDIUM);
    expect(InstitutionSizes).toContain(SMALL);
    expect(InstitutionSizes).toHaveLength(3);
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

  test("filters valid size codes", () => {
    const input = ["l", "m", "s"];
    const result = getInstitutionSizeFromUrlParam(input);
    expect(result).toEqual([LARGE, MEDIUM, SMALL]);
  });

  test("filters out invalid values", () => {
    const input = ["l", "invalid", "s", null, "xl"];
    const result = getInstitutionSizeFromUrlParam(input);
    expect(result).toEqual([LARGE, SMALL]);
  });

  test("returns empty array for all invalid values", () => {
    const input = ["invalid", "x", "xl"];
    const result = getInstitutionSizeFromUrlParam(input);
    expect(result).toEqual([]);
  });

  test("handles single valid value", () => {
    const result = getInstitutionSizeFromUrlParam(["m"]);
    expect(result).toEqual([MEDIUM]);
  });

  test("preserves order of valid values", () => {
    const input = ["s", "l", "m"];
    const result = getInstitutionSizeFromUrlParam(input);
    expect(result).toEqual([SMALL, LARGE, MEDIUM]);
  });
});

describe("INSTUTITON_SIZE_PARAM_MAP", () => {
  test("maps size codes to enum values", () => {
    expect(INSTUTITON_SIZE_PARAM_MAP[LARGE]).toBe(InstitutionSizeEnum.LARGE);
    expect(INSTUTITON_SIZE_PARAM_MAP[MEDIUM]).toBe(InstitutionSizeEnum.MEDIUM);
    expect(INSTUTITON_SIZE_PARAM_MAP[SMALL]).toBe(InstitutionSizeEnum.SMALL);
  });
});

describe("toInstitutionSizeParam", () => {
  test("returns undefined for empty array", () => {
    expect(toInstitutionSizeParam([])).toBeUndefined();
  });

  test("converts single size to enum array", () => {
    const result = toInstitutionSizeParam([LARGE]);
    expect(result).toEqual([InstitutionSizeEnum.LARGE]);
  });

  test("converts multiple sizes to enum array", () => {
    const result = toInstitutionSizeParam([LARGE, MEDIUM, SMALL]);
    expect(result).toEqual([
      InstitutionSizeEnum.LARGE,
      InstitutionSizeEnum.MEDIUM,
      InstitutionSizeEnum.SMALL,
    ]);
  });

  test("preserves order", () => {
    const result = toInstitutionSizeParam([SMALL, LARGE]);
    expect(result).toEqual([InstitutionSizeEnum.SMALL, InstitutionSizeEnum.LARGE]);
  });
});
