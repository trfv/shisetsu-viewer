import { describe, expect, test } from "vitest";

import { FeeDivision } from "../constants/enums";
import { formatUsageFee, toInstitutionQueryParams, toInstitutionSearchParams } from "./institution";
import { SupportedMunicipalities } from "./municipality";

describe("formatUsageFee", () => {
  test("returns empty string for undefined municipality", () => {
    expect(formatUsageFee(undefined, [{ division: "FEE_DIVISION_MORNING", fee: 1000 }])).toBe("");
  });

  test("returns empty string for undefined usageFee", () => {
    expect(formatUsageFee("MUNICIPALITY_KOUTOU", undefined)).toBe("");
  });

  test("returns empty string for empty usageFee array", () => {
    expect(formatUsageFee("MUNICIPALITY_KOUTOU", [])).toBe("");
  });

  test("formats single fee entry for KOUTOU", () => {
    const result = formatUsageFee("MUNICIPALITY_KOUTOU", [
      { division: FeeDivision.MORNING, fee: 1000 },
    ]);
    expect(result).toBe("午前: ¥1,000");
  });

  test("formats multiple fee entries joined with space", () => {
    const result = formatUsageFee("MUNICIPALITY_KOUTOU", [
      { division: FeeDivision.MORNING, fee: 1000 },
      { division: FeeDivision.AFTERNOON, fee: 2000 },
      { division: FeeDivision.EVENING, fee: 1500 },
    ]);
    expect(result).toBe("午前: ¥1,000 午後: ¥2,000 夜間: ¥1,500");
  });

  test("handles unknown fee division gracefully", () => {
    const result = formatUsageFee("MUNICIPALITY_KOUTOU", [
      { division: "UNKNOWN_DIVISION", fee: 500 },
    ]);
    // Unknown division maps to empty string via FeeDivisionMap
    expect(result).toBe(": ¥500");
  });

  test("handles unknown municipality gracefully", () => {
    const result = formatUsageFee("UNKNOWN_MUNICIPALITY", [
      { division: FeeDivision.MORNING, fee: 1000 },
    ]);
    // Unknown municipality means FeeDivisionMap[municipality] is undefined
    expect(result).toBe(": ¥1,000");
  });
});

describe("toInstitutionSearchParams", () => {
  test("returns defaults when all params are null", () => {
    const result = toInstitutionSearchParams(null, null, null);
    expect(result).toEqual({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
  });

  test("returns defaults when all params are undefined", () => {
    const result = toInstitutionSearchParams(undefined, undefined, undefined);
    expect(result).toEqual({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
  });

  test("parses municipality URL param", () => {
    const result = toInstitutionSearchParams("koutou", null, null);
    expect(result.municipality).toBe("MUNICIPALITY_KOUTOU");
  });

  test("parses available instruments", () => {
    const result = toInstitutionSearchParams(null, ["s", "b"], null);
    expect(result.availableInstruments).toEqual(["s", "b"]);
  });

  test("parses institution sizes", () => {
    const result = toInstitutionSearchParams(null, null, ["l", "m"]);
    expect(result.institutionSizes).toEqual(["l", "m"]);
  });

  test("parses all params together", () => {
    const result = toInstitutionSearchParams("kawasaki", ["w", "p"], ["s"]);
    expect(result).toEqual({
      municipality: "MUNICIPALITY_KAWASAKI",
      availableInstruments: ["w", "p"],
      institutionSizes: ["s"],
    });
  });
});

describe("toInstitutionQueryParams", () => {
  test("returns all 11 municipalities when municipality is 'all'", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.municipality).toHaveLength(11);
    expect(result.municipality).toEqual(SupportedMunicipalities.map((m) => m.toString()));
  });

  test("returns specific municipality when not 'all'", () => {
    const result = toInstitutionQueryParams({
      municipality: "MUNICIPALITY_KOUTOU",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.municipality).toEqual(["MUNICIPALITY_KOUTOU"]);
  });

  test("sets limit to 100", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.limit).toBe(100);
  });

  test("leaves instrument flags undefined when no instruments selected", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBeUndefined();
    expect(result.isAvailableWoodwind).toBeUndefined();
    expect(result.isAvailableBrass).toBeUndefined();
    expect(result.isAvailablePercussion).toBeUndefined();
  });

  test("sets true for strings when selected", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: ["s"],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBe(true);
    expect(result.isAvailableWoodwind).toBeUndefined();
    expect(result.isAvailableBrass).toBeUndefined();
    expect(result.isAvailablePercussion).toBeUndefined();
  });

  test("sets true for all instruments when all selected", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: ["s", "w", "b", "p"],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBe(true);
    expect(result.isAvailableWoodwind).toBe(true);
    expect(result.isAvailableBrass).toBe(true);
    expect(result.isAvailablePercussion).toBe(true);
  });

  test("leaves institutionSizes undefined when no sizes selected", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.institutionSizes).toBeUndefined();
  });

  test("sets institutionSizes when sizes are selected", () => {
    const result = toInstitutionQueryParams({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: ["l"],
    });
    expect(result.institutionSizes).toEqual(["INSTITUTION_SIZE_LARGE"]);
  });
});
