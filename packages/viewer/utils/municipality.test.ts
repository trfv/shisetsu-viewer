import { describe, expect, test } from "vitest";
import {
  convertMunicipalityToUrlParam,
  getMunicipalityFromUrlParam,
  MunicipalityOptions,
  RESERVATION_EXCLUDED_MUNICIPALITIES,
  SELECT_OPTION_ALL,
  SupportedMunicipalities,
  SupportedMunicipalityMap,
} from "./municipality";

describe("getMunicipalityFromUrlParam", () => {
  test("returns 'all' for null", () => {
    expect(getMunicipalityFromUrlParam(null)).toBe(SELECT_OPTION_ALL);
  });

  test("returns 'all' for undefined", () => {
    expect(getMunicipalityFromUrlParam(undefined)).toBe(SELECT_OPTION_ALL);
  });

  test("returns 'all' for empty string", () => {
    expect(getMunicipalityFromUrlParam("")).toBe(SELECT_OPTION_ALL);
  });

  test("returns 'all' for unknown param", () => {
    expect(getMunicipalityFromUrlParam("unknown")).toBe(SELECT_OPTION_ALL);
  });

  test("returns MUNICIPALITY_KOUTOU for 'koutou'", () => {
    expect(getMunicipalityFromUrlParam("koutou")).toBe("MUNICIPALITY_KOUTOU");
  });

  test("returns MUNICIPALITY_BUNKYO for 'bunkyo'", () => {
    expect(getMunicipalityFromUrlParam("bunkyo")).toBe("MUNICIPALITY_BUNKYO");
  });

  test("returns MUNICIPALITY_KITA for 'kita'", () => {
    expect(getMunicipalityFromUrlParam("kita")).toBe("MUNICIPALITY_KITA");
  });

  test("returns MUNICIPALITY_KAWASAKI for 'kawasaki'", () => {
    expect(getMunicipalityFromUrlParam("kawasaki")).toBe("MUNICIPALITY_KAWASAKI");
  });

  test("returns 'all' for case-sensitive mismatch", () => {
    expect(getMunicipalityFromUrlParam("Koutou")).toBe(SELECT_OPTION_ALL);
  });
});

describe("convertMunicipalityToUrlParam", () => {
  test("returns null for null", () => {
    expect(convertMunicipalityToUrlParam(null)).toBeNull();
  });

  test("returns null for undefined", () => {
    expect(convertMunicipalityToUrlParam(undefined)).toBeNull();
  });

  test("converts MUNICIPALITY_KOUTOU to 'koutou'", () => {
    expect(convertMunicipalityToUrlParam("MUNICIPALITY_KOUTOU")).toBe("koutou");
  });

  test("converts MUNICIPALITY_BUNKYO to 'bunkyo'", () => {
    expect(convertMunicipalityToUrlParam("MUNICIPALITY_BUNKYO")).toBe("bunkyo");
  });

  test("converts MUNICIPALITY_KAWASAKI to 'kawasaki'", () => {
    expect(convertMunicipalityToUrlParam("MUNICIPALITY_KAWASAKI")).toBe("kawasaki");
  });

  test("converts MUNICIPALITY_ARAKAWA to 'arakawa'", () => {
    expect(convertMunicipalityToUrlParam("MUNICIPALITY_ARAKAWA")).toBe("arakawa");
  });

  test("handles string without MUNICIPALITY_ prefix", () => {
    expect(convertMunicipalityToUrlParam("some_value")).toBe("some_value");
  });
});

describe("SupportedMunicipalities", () => {
  test("has 11 entries", () => {
    expect(SupportedMunicipalities).toHaveLength(11);
  });

  test("contains all expected municipalities", () => {
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_KOUTOU");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_BUNKYO");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_KITA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_TOSHIMA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_EDOGAWA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_ARAKAWA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_SUMIDA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_OTA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_SUGINAMI");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_CHUO");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_KAWASAKI");
  });
});

describe("SupportedMunicipalityMap", () => {
  test("maps municipality keys to Japanese labels", () => {
    expect(SupportedMunicipalityMap["MUNICIPALITY_KOUTOU"]).toBe("江東区");
    expect(SupportedMunicipalityMap["MUNICIPALITY_KAWASAKI"]).toBe("川崎市");
  });

  test("has 11 entries matching SupportedMunicipalities", () => {
    expect(Object.keys(SupportedMunicipalityMap)).toHaveLength(11);
  });
});

describe("MunicipalityOptions", () => {
  test("first element is the 'all' option", () => {
    expect(MunicipalityOptions[0]).toEqual({ value: "all", label: "すべて" });
  });

  test("has 12 entries (1 for all + 11 municipalities)", () => {
    expect(MunicipalityOptions).toHaveLength(12);
  });

  test("all entries have value and label properties", () => {
    for (const option of MunicipalityOptions) {
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
    }
  });
});

describe("RESERVATION_EXCLUDED_MUNICIPALITIES", () => {
  test("has 5 entries", () => {
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toHaveLength(5);
  });

  test("contains the expected excluded municipalities", () => {
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toContain("MUNICIPALITY_EDOGAWA");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toContain("MUNICIPALITY_OTA");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toContain("MUNICIPALITY_SUGINAMI");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toContain("MUNICIPALITY_TOSHIMA");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toContain("MUNICIPALITY_BUNKYO");
  });

  test("does not contain non-excluded municipalities", () => {
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_KOUTOU");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_KAWASAKI");
  });
});
