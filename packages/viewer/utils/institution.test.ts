import { describe, expect, test } from "vitest";
import { AvailabilityDivision } from "../constants/enums";
import { FeeDivision } from "../constants/enums";
import { SupportedMunicipalities } from "./municipality";
import {
  formatUsageFee,
  toInstitutionQueryVariables,
  toInstitutionSearchParams,
} from "./institution";

describe("formatUsageFee", () => {
  test("returns empty string for undefined municipality", () => {
    expect(formatUsageFee(undefined, [{ division: "FEE_DIVISION_MORNING", fee: "1000" }])).toBe("");
  });

  test("returns empty string for undefined usageFee", () => {
    expect(formatUsageFee("MUNICIPALITY_KOUTOU", undefined)).toBe("");
  });

  test("returns empty string for empty usageFee array", () => {
    expect(formatUsageFee("MUNICIPALITY_KOUTOU", [])).toBe("");
  });

  test("formats single fee entry for KOUTOU", () => {
    const result = formatUsageFee("MUNICIPALITY_KOUTOU", [
      { division: FeeDivision.MORNING, fee: "1000" },
    ]);
    expect(result).toBe("午前: ¥1,000");
  });

  test("formats multiple fee entries joined with space", () => {
    const result = formatUsageFee("MUNICIPALITY_KOUTOU", [
      { division: FeeDivision.MORNING, fee: "1000" },
      { division: FeeDivision.AFTERNOON, fee: "2000" },
      { division: FeeDivision.EVENING, fee: "1500" },
    ]);
    expect(result).toBe("午前: ¥1,000 午後: ¥2,000 夜間: ¥1,500");
  });

  test("handles unknown fee division gracefully", () => {
    const result = formatUsageFee("MUNICIPALITY_KOUTOU", [
      { division: "UNKNOWN_DIVISION", fee: "500" },
    ]);
    // Unknown division maps to empty string via FeeDivisionMap
    expect(result).toBe(": ¥500");
  });

  test("handles unknown municipality gracefully", () => {
    const result = formatUsageFee("UNKNOWN_MUNICIPALITY", [
      { division: FeeDivision.MORNING, fee: "1000" },
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

describe("toInstitutionQueryVariables", () => {
  test("returns all 11 municipalities when municipality is 'all'", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.municipality).toHaveLength(11);
    expect(result.municipality).toEqual(SupportedMunicipalities.map((m) => m.toString()));
  });

  test("returns specific municipality when not 'all'", () => {
    const result = toInstitutionQueryVariables({
      municipality: "MUNICIPALITY_KOUTOU",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.municipality).toEqual(["MUNICIPALITY_KOUTOU"]);
  });

  test("sets first to 100", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.first).toBe(100);
  });

  test("sets after to null", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.after).toBeNull();
  });

  test("sets instrument availability to null when no instruments selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBeNull();
    expect(result.isAvailableWoodwind).toBeNull();
    expect(result.isAvailableBrass).toBeNull();
    expect(result.isAvailablePercussion).toBeNull();
  });

  test("sets AVAILABLE for strings when selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: ["s"],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBe(AvailabilityDivision.AVAILABLE);
    expect(result.isAvailableWoodwind).toBeNull();
    expect(result.isAvailableBrass).toBeNull();
    expect(result.isAvailablePercussion).toBeNull();
  });

  test("sets AVAILABLE for woodwind when selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: ["w"],
      institutionSizes: [],
    });
    expect(result.isAvailableWoodwind).toBe(AvailabilityDivision.AVAILABLE);
  });

  test("sets AVAILABLE for brass when selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: ["b"],
      institutionSizes: [],
    });
    expect(result.isAvailableBrass).toBe(AvailabilityDivision.AVAILABLE);
  });

  test("sets AVAILABLE for percussion when selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: ["p"],
      institutionSizes: [],
    });
    expect(result.isAvailablePercussion).toBe(AvailabilityDivision.AVAILABLE);
  });

  test("sets AVAILABLE for all instruments when all selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: ["s", "w", "b", "p"],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBe(AvailabilityDivision.AVAILABLE);
    expect(result.isAvailableWoodwind).toBe(AvailabilityDivision.AVAILABLE);
    expect(result.isAvailableBrass).toBe(AvailabilityDivision.AVAILABLE);
    expect(result.isAvailablePercussion).toBe(AvailabilityDivision.AVAILABLE);
  });

  test("sets institutionSizes to null when no sizes selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.institutionSizes).toBeNull();
  });

  test("sets institutionSizes when sizes are selected", () => {
    const result = toInstitutionQueryVariables({
      municipality: "all",
      availableInstruments: [],
      institutionSizes: ["l"],
    });
    expect(result.institutionSizes).toEqual(["INSTITUTION_SIZE_LARGE"]);
  });
});
