import { describe, expect, test } from "vitest";
import { ReservationDivision } from "../constants/enums";
import {
  sortByReservationDivision,
  formatReservationMap,
  getResevationSearchFilterFromUrlParam,
  toReservationSearchParams,
  toReservationQueryVariables,
  RESERVATION_SEARCH_FILTER_MAP,
  type ReservationSearchFilter,
} from "./reservation";
import { STRINGS, WOODWIND, BRASS, PERCUSSION, LARGE, SMALL } from "./search";

describe("sortByReservationDivision", () => {
  test("sorts reservation divisions in correct order", () => {
    const input = {
      [ReservationDivision.EVENING]: "status1",
      [ReservationDivision.MORNING]: "status2",
      [ReservationDivision.AFTERNOON]: "status3",
    };
    const result = sortByReservationDivision(input);

    expect(result).toHaveLength(3);
    expect(result[0]?.[0]).toBe(ReservationDivision.MORNING);
    expect(result[1]?.[0]).toBe(ReservationDivision.AFTERNOON);
    expect(result[2]?.[0]).toBe(ReservationDivision.EVENING);
  });

  test("handles empty object", () => {
    const result = sortByReservationDivision({});
    expect(result).toEqual([]);
  });

  test("handles single item", () => {
    const input = { [ReservationDivision.MORNING]: "status" };
    const result = sortByReservationDivision(input);
    expect(result).toEqual([[ReservationDivision.MORNING, "status"]]);
  });

  test("sorts numbered divisions correctly", () => {
    const input = {
      [ReservationDivision.DIVISION_3]: "s3",
      [ReservationDivision.DIVISION_1]: "s1",
      [ReservationDivision.DIVISION_2]: "s2",
    };
    const result = sortByReservationDivision(input);

    expect(result).toHaveLength(3);
    expect(result[0]?.[0]).toBe(ReservationDivision.DIVISION_1);
    expect(result[1]?.[0]).toBe(ReservationDivision.DIVISION_2);
    expect(result[2]?.[0]).toBe(ReservationDivision.DIVISION_3);
  });
});

describe("formatReservationMap", () => {
  test("returns empty string when municipality is undefined", () => {
    expect(formatReservationMap(undefined, { key: "value" })).toBe("");
  });

  test("returns empty string when obj is undefined", () => {
    expect(formatReservationMap("MUNICIPALITY_KOUTOU", undefined)).toBe("");
  });

  test("returns empty string when both are undefined", () => {
    expect(formatReservationMap(undefined, undefined)).toBe("");
  });
});

describe("getResevationSearchFilterFromUrlParam", () => {
  test("returns empty array for null", () => {
    expect(getResevationSearchFilterFromUrlParam(null)).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(getResevationSearchFilterFromUrlParam(undefined)).toEqual([]);
  });

  test("returns empty array for empty array", () => {
    expect(getResevationSearchFilterFromUrlParam([])).toEqual([]);
  });

  test("filters valid search filters", () => {
    const input = ["m", "a", "e", "h"];
    const result = getResevationSearchFilterFromUrlParam(input);
    expect(result).toEqual(["m", "a", "e", "h"]);
  });

  test("filters out invalid values", () => {
    const input = ["m", "invalid", "a", null, "x"];
    const result = getResevationSearchFilterFromUrlParam(input);
    expect(result).toEqual(["m", "a"]);
  });

  test("returns empty array for all invalid values", () => {
    const input = ["invalid", "x", "y"];
    const result = getResevationSearchFilterFromUrlParam(input);
    expect(result).toEqual([]);
  });
});

describe("RESERVATION_SEARCH_FILTER_MAP", () => {
  test("has correct mappings", () => {
    expect(RESERVATION_SEARCH_FILTER_MAP["m"]).toBe("午前空き");
    expect(RESERVATION_SEARCH_FILTER_MAP["a"]).toBe("午後空き");
    expect(RESERVATION_SEARCH_FILTER_MAP["e"]).toBe("夜間空き");
    expect(RESERVATION_SEARCH_FILTER_MAP["h"]).toBe("休日のみ");
  });
});

describe("toReservationSearchParams", () => {
  const minDate = new Date(2024, 0, 1);
  const maxDate = new Date(2024, 11, 31);

  test("uses minDate when startDate is null", () => {
    const result = toReservationSearchParams(null, null, null, null, null, null, minDate, maxDate);
    expect(result.startDate).toEqual(minDate);
  });

  test("uses valid startDate when within range", () => {
    const validDate = new Date(2024, 5, 15);
    const result = toReservationSearchParams(
      null,
      validDate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toEqual(validDate);
  });

  test("uses minDate when startDate is before range", () => {
    const beforeDate = new Date(2023, 11, 31);
    const result = toReservationSearchParams(
      null,
      beforeDate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toEqual(minDate);
  });

  test("uses minDate when startDate is after range", () => {
    const afterDate = new Date(2025, 0, 1);
    const result = toReservationSearchParams(
      null,
      afterDate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toEqual(minDate);
  });

  test("accepts startDate on minDate boundary", () => {
    const result = toReservationSearchParams(
      null,
      minDate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toEqual(minDate);
  });

  test("accepts startDate on maxDate boundary", () => {
    const result = toReservationSearchParams(
      null,
      maxDate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toEqual(maxDate);
  });

  test("parses municipality from URL param", () => {
    const result = toReservationSearchParams(
      "koutou",
      null,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.municipality).toBe("MUNICIPALITY_KOUTOU");
  });

  test("defaults municipality to all for invalid param", () => {
    const result = toReservationSearchParams(
      "invalid",
      null,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.municipality).toBe("all");
  });

  test("parses filters correctly", () => {
    const result = toReservationSearchParams(
      null,
      null,
      null,
      ["m", "h"],
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.filter).toEqual(["m", "h"]);
  });

  test("parses available instruments correctly", () => {
    const result = toReservationSearchParams(
      null,
      null,
      null,
      null,
      ["s", "b"],
      null,
      minDate,
      maxDate
    );
    expect(result.availableInstruments).toEqual([STRINGS, BRASS]);
  });

  test("parses institution sizes correctly", () => {
    const result = toReservationSearchParams(
      null,
      null,
      null,
      null,
      null,
      ["l", "s"],
      minDate,
      maxDate
    );
    expect(result.institutionSizes).toEqual([LARGE, SMALL]);
  });
});

describe("toReservationQueryVariables", () => {
  const baseParams = {
    municipality: "MUNICIPALITY_KOUTOU" as const,
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2024, 1, 1),
    filter: [] as ReservationSearchFilter[],
    availableInstruments: [] as ReturnType<
      typeof import("./search").getAvailableInstrumentFromUrlParam
    >,
    institutionSizes: [] as ReturnType<typeof import("./search").getInstitutionSizeFromUrlParam>,
  };

  test("sets first to 100 and after to null", () => {
    const result = toReservationQueryVariables(baseParams);
    expect(result.first).toBe(100);
    expect(result.after).toBeNull();
  });

  test("sets single municipality when specified", () => {
    const result = toReservationQueryVariables(baseParams);
    expect(result.municipality).toEqual(["MUNICIPALITY_KOUTOU"]);
  });

  test("sets all non-excluded municipalities when all selected", () => {
    const result = toReservationQueryVariables({
      ...baseParams,
      municipality: "all",
    });
    expect(result.municipality).toContain("MUNICIPALITY_KOUTOU");
    expect(result.municipality).toContain("MUNICIPALITY_KITA");
    expect(result.municipality).not.toContain("MUNICIPALITY_EDOGAWA");
    expect(result.municipality).not.toContain("MUNICIPALITY_OTA");
  });

  test("sets instrument availability flags", () => {
    const result = toReservationQueryVariables({
      ...baseParams,
      availableInstruments: [STRINGS, BRASS],
    });
    expect(result.isAvailableStrings).toBe("AVAILABILITY_DIVISION_AVAILABLE");
    expect(result.isAvailableWoodwind).toBeNull();
    expect(result.isAvailableBrass).toBe("AVAILABILITY_DIVISION_AVAILABLE");
    expect(result.isAvailablePercussion).toBeNull();
  });

  test("sets all instrument availability when all selected", () => {
    const result = toReservationQueryVariables({
      ...baseParams,
      availableInstruments: [STRINGS, WOODWIND, BRASS, PERCUSSION],
    });
    expect(result.isAvailableStrings).toBe("AVAILABILITY_DIVISION_AVAILABLE");
    expect(result.isAvailableWoodwind).toBe("AVAILABILITY_DIVISION_AVAILABLE");
    expect(result.isAvailableBrass).toBe("AVAILABILITY_DIVISION_AVAILABLE");
    expect(result.isAvailablePercussion).toBe("AVAILABILITY_DIVISION_AVAILABLE");
  });

  test("sets filter flags correctly", () => {
    const result = toReservationQueryVariables({
      ...baseParams,
      filter: ["m", "h"] as ReservationSearchFilter[],
    });
    expect(result.isMorningVacant).toBe(true);
    expect(result.isAfternoonVacant).toBeNull();
    expect(result.isEveningVacant).toBeNull();
    expect(result.isHoliday).toBe(true);
  });

  test("sets date strings", () => {
    const result = toReservationQueryVariables(baseParams);
    expect(result.startDate).toBe(baseParams.startDate.toDateString());
    expect(result.endDate).toBe(baseParams.endDate.toDateString());
  });
});
