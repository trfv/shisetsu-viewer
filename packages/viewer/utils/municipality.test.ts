import { describe, expect, test } from "vitest";

import {
  getMunicipalitiesFromUrlParam,
  RESERVATION_EXCLUDED_MUNICIPALITIES,
  SupportedMunicipalities,
  SupportedMunicipalityMap,
  toMunicipalityUrlParam,
} from "./municipality";

describe("getMunicipalitiesFromUrlParam", () => {
  test("returns empty array for null", () => {
    expect(getMunicipalitiesFromUrlParam(null)).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(getMunicipalitiesFromUrlParam(undefined)).toEqual([]);
  });

  test("converts slugs to municipality keys", () => {
    expect(getMunicipalitiesFromUrlParam(["koutou", "kawasaki"])).toEqual([
      "MUNICIPALITY_KOUTOU",
      "MUNICIPALITY_KAWASAKI",
    ]);
  });

  test("returns keys in registry order regardless of param order", () => {
    expect(getMunicipalitiesFromUrlParam(["kawasaki", "koutou"])).toEqual([
      "MUNICIPALITY_KOUTOU",
      "MUNICIPALITY_KAWASAKI",
    ]);
  });

  test("ignores unknown, case-mismatched, null and duplicate params", () => {
    expect(getMunicipalitiesFromUrlParam(["unknown", "Koutou", null, "kita", "kita"])).toEqual([
      "MUNICIPALITY_KITA",
    ]);
  });
});

describe("toMunicipalityUrlParam", () => {
  test("converts municipality keys to slugs", () => {
    expect(toMunicipalityUrlParam(["MUNICIPALITY_KOUTOU", "MUNICIPALITY_ARAKAWA"])).toEqual([
      "koutou",
      "arakawa",
    ]);
  });

  test("returns empty array for empty input", () => {
    expect(toMunicipalityUrlParam([])).toEqual([]);
  });
});

describe("SupportedMunicipalities", () => {
  test("has 16 entries", () => {
    expect(SupportedMunicipalities).toHaveLength(16);
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
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_SHINAGAWA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_MEGURO");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_MINATO");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_ADACHI");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_KATSUSHIKA");
    expect(SupportedMunicipalities).toContain("MUNICIPALITY_KAWASAKI");
  });
});

describe("SupportedMunicipalityMap", () => {
  test("maps municipality keys to Japanese labels", () => {
    expect(SupportedMunicipalityMap["MUNICIPALITY_KOUTOU"]).toBe("江東区");
    expect(SupportedMunicipalityMap["MUNICIPALITY_KAWASAKI"]).toBe("川崎市");
  });

  test("has 16 entries matching SupportedMunicipalities", () => {
    expect(Object.keys(SupportedMunicipalityMap)).toHaveLength(16);
  });
});

describe("RESERVATION_EXCLUDED_MUNICIPALITIES", () => {
  test("has 2 entries", () => {
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toHaveLength(1);
  });

  test("contains the expected excluded municipalities", () => {
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).toContain("MUNICIPALITY_SUGINAMI");
  });

  test("does not contain non-excluded municipalities", () => {
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_KOUTOU");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_KAWASAKI");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_BUNKYO");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_TOSHIMA");
    expect(RESERVATION_EXCLUDED_MUNICIPALITIES).not.toContain("MUNICIPALITY_EDOGAWA");
  });
});
