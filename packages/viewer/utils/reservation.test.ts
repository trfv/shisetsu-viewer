import { addMonths } from "date-fns";
import { describe, expect, test } from "vitest";

import { ReservationDivision } from "../constants/enums";
import { RESERVATION_EXCLUDED_MUNICIPALITIES, SupportedMunicipalities } from "./municipality";
import {
  formatReservationMap,
  getResevationSearchFilterFromUrlParam,
  sortByReservationDivision,
  toReservationSearchParams,
  toReservationSearchQueryParams,
} from "./reservation";

describe("sortByReservationDivision", () => {
  test("sorts MORNING before AFTERNOON before EVENING", () => {
    const obj: Record<string, string> = {
      [ReservationDivision.EVENING]: "vacant",
      [ReservationDivision.MORNING]: "reserved",
      [ReservationDivision.AFTERNOON]: "vacant",
    };
    const result = sortByReservationDivision(obj);
    expect(result).toEqual([
      [ReservationDivision.MORNING, "reserved"],
      [ReservationDivision.AFTERNOON, "vacant"],
      [ReservationDivision.EVENING, "vacant"],
    ]);
  });

  test("sorts sub-divisions in order", () => {
    const obj: Record<string, string> = {
      [ReservationDivision.AFTERNOON_TWO]: "a",
      [ReservationDivision.MORNING_ONE]: "b",
      [ReservationDivision.EVENING_ONE]: "c",
      [ReservationDivision.MORNING_TWO]: "d",
    };
    const result = sortByReservationDivision(obj);
    expect(result[0]![0]).toBe(ReservationDivision.MORNING_ONE);
    expect(result[1]![0]).toBe(ReservationDivision.MORNING_TWO);
    expect(result[2]![0]).toBe(ReservationDivision.AFTERNOON_TWO);
    expect(result[3]![0]).toBe(ReservationDivision.EVENING_ONE);
  });

  test("returns empty array for empty object", () => {
    expect(sortByReservationDivision({})).toEqual([]);
  });

  test("handles single entry", () => {
    const obj = { [ReservationDivision.MORNING]: "test" };
    expect(sortByReservationDivision(obj)).toEqual([[ReservationDivision.MORNING, "test"]]);
  });

  test("sorts INVALID before all others", () => {
    const obj: Record<string, string> = {
      [ReservationDivision.MORNING]: "a",
      [ReservationDivision.INVALID]: "b",
    };
    const result = sortByReservationDivision(obj);
    expect(result[0]![0]).toBe(ReservationDivision.INVALID);
    expect(result[1]![0]).toBe(ReservationDivision.MORNING);
  });
});

describe("formatReservationMap", () => {
  test("returns empty string for undefined municipality", () => {
    expect(formatReservationMap(undefined, { key: "value" })).toBe("");
  });

  test("returns empty string for undefined obj", () => {
    expect(formatReservationMap("MUNICIPALITY_KOUTOU", undefined)).toBe("");
  });

  test("formats single reservation entry for KOUTOU", () => {
    const obj = {
      [ReservationDivision.MORNING]: "RESERVATION_STATUS_VACANT",
    };
    const result = formatReservationMap("MUNICIPALITY_KOUTOU", obj);
    // KOUTOU_RESERVATION_DIVISION[MORNING] = "午前"
    // KOUTOU_RESERVATION_STATUS[VACANT] = "空き"
    expect(result).toBe("午前: 空き");
  });

  test("formats multiple entries with 3-per-line grouping", () => {
    // Sorted order: MORNING(1), MORNING_ONE(2), AFTERNOON(4), EVENING(7)
    const obj = {
      [ReservationDivision.MORNING]: "RESERVATION_STATUS_VACANT",
      [ReservationDivision.AFTERNOON]: "RESERVATION_STATUS_STATUS_1",
      [ReservationDivision.EVENING]: "RESERVATION_STATUS_STATUS_2",
      [ReservationDivision.MORNING_ONE]: "RESERVATION_STATUS_VACANT",
    };
    const result = formatReservationMap("MUNICIPALITY_KOUTOU", obj);
    const lines = result.split("\n");
    // First 3 sorted entries on line 1, 4th on line 2
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("午前: 空き");
    expect(lines[0]).toContain("①: 空き");
    expect(lines[0]).toContain("午後: 予約あり");
    expect(lines[1]).toContain("夜間: 休館日");
  });

  test("returns empty string when both params are undefined", () => {
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

  test("returns valid filters from param", () => {
    expect(getResevationSearchFilterFromUrlParam(["m", "a"])).toEqual(["m", "a"]);
  });

  test("returns all valid filters", () => {
    expect(getResevationSearchFilterFromUrlParam(["m", "a", "e", "h"])).toEqual([
      "m",
      "a",
      "e",
      "h",
    ]);
  });

  test("filters out invalid values", () => {
    expect(getResevationSearchFilterFromUrlParam(["invalid"])).toEqual([]);
  });

  test("filters mixed valid and invalid values", () => {
    expect(getResevationSearchFilterFromUrlParam(["m", "invalid", "e"])).toEqual(["m", "e"]);
  });

  test("filters out null values in array", () => {
    expect(getResevationSearchFilterFromUrlParam(["m", null, "a"])).toEqual(["m", "a"]);
  });
});

describe("toReservationSearchParams", () => {
  const minDate = new Date(2026, 0, 1); // 2026-01-01
  const maxDate = new Date(2026, 5, 30); // 2026-06-30

  test("returns defaults when all params are null", () => {
    const result = toReservationSearchParams(null, null, null, null, null, null, minDate, maxDate);
    expect(result.municipality).toBe("all");
    expect(result.startDate).toBe(minDate);
    expect(result.endDate).toEqual(addMonths(minDate, 1));
    expect(result.filter).toEqual([]);
    expect(result.availableInstruments).toEqual([]);
    expect(result.institutionSizes).toEqual([]);
  });

  test("clamps startDate to minDate when before range", () => {
    const tooEarly = new Date(2025, 11, 1);
    const result = toReservationSearchParams(
      null,
      tooEarly,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toBe(minDate);
  });

  test("clamps startDate to minDate when after maxDate", () => {
    const tooLate = new Date(2026, 7, 1);
    const result = toReservationSearchParams(
      null,
      tooLate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toBe(minDate);
  });

  test("accepts startDate when on minDate", () => {
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
    expect(result.startDate).toBe(minDate);
  });

  test("accepts startDate when on maxDate", () => {
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
    expect(result.startDate).toBe(maxDate);
  });

  test("accepts startDate when within range", () => {
    const midDate = new Date(2026, 2, 15);
    const result = toReservationSearchParams(
      null,
      midDate,
      null,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.startDate).toBe(midDate);
  });

  test("clamps endDate to minDate+1month when before range", () => {
    const tooEarly = new Date(2025, 11, 1);
    const result = toReservationSearchParams(
      null,
      null,
      tooEarly,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.endDate).toEqual(addMonths(minDate, 1));
  });

  test("clamps endDate to minDate+1month when after maxDate", () => {
    const tooLate = new Date(2026, 7, 1);
    const result = toReservationSearchParams(
      null,
      null,
      tooLate,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.endDate).toEqual(addMonths(minDate, 1));
  });

  test("accepts endDate when within range", () => {
    const midDate = new Date(2026, 3, 15);
    const result = toReservationSearchParams(
      null,
      null,
      midDate,
      null,
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.endDate).toBe(midDate);
  });

  test("parses municipality", () => {
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

  test("parses filters", () => {
    const result = toReservationSearchParams(
      null,
      null,
      null,
      ["m", "e"],
      null,
      null,
      minDate,
      maxDate
    );
    expect(result.filter).toEqual(["m", "e"]);
  });

  test("parses instruments and sizes", () => {
    const result = toReservationSearchParams(
      null,
      null,
      null,
      null,
      ["s", "b"],
      ["l"],
      minDate,
      maxDate
    );
    expect(result.availableInstruments).toEqual(["s", "b"]);
    expect(result.institutionSizes).toEqual(["l"]);
  });
});

describe("toReservationSearchQueryParams", () => {
  const startDate = new Date(2026, 0, 15);
  const endDate = new Date(2026, 1, 15);

  test("returns all non-excluded municipalities when municipality is 'all'", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    const expectedMunicipalities = SupportedMunicipalities.filter(
      (m) => !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(m)
    ).map((m) => m.toString());
    expect(result.municipality).toEqual(expectedMunicipalities);
    expect(result.municipality).toHaveLength(10);
  });

  test("returns specific municipality when not 'all'", () => {
    const result = toReservationSearchQueryParams({
      municipality: "MUNICIPALITY_KOUTOU",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.municipality).toEqual(["MUNICIPALITY_KOUTOU"]);
  });

  test("sets limit to 100", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.limit).toBe(100);
  });

  test("formats start and end dates as yyyy-MM-dd", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.startDate).toBe("2026-01-15");
    expect(result.endDate).toBe("2026-02-15");
  });

  test("leaves instrument flags undefined when none selected", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBeUndefined();
    expect(result.isAvailableWoodwind).toBeUndefined();
    expect(result.isAvailableBrass).toBeUndefined();
    expect(result.isAvailablePercussion).toBeUndefined();
  });

  test("sets true for selected instruments", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: ["s", "w", "b", "p"],
      institutionSizes: [],
    });
    expect(result.isAvailableStrings).toBe(true);
    expect(result.isAvailableWoodwind).toBe(true);
    expect(result.isAvailableBrass).toBe(true);
    expect(result.isAvailablePercussion).toBe(true);
  });

  test("leaves institutionSizes undefined when none selected", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.institutionSizes).toBeUndefined();
  });

  test("sets institutionSizes when sizes are selected", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: ["l", "m"],
    });
    expect(result.institutionSizes).toEqual(["INSTITUTION_SIZE_LARGE", "INSTITUTION_SIZE_MEDIUM"]);
  });

  test("leaves filter flags undefined when no filters selected", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: [],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.isHoliday).toBeUndefined();
    expect(result.isMorningVacant).toBeUndefined();
    expect(result.isAfternoonVacant).toBeUndefined();
    expect(result.isEveningVacant).toBeUndefined();
  });

  test("sets isMorningVacant to true when morning filter selected", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: ["m"],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.isMorningVacant).toBe(true);
    expect(result.isAfternoonVacant).toBeUndefined();
    expect(result.isEveningVacant).toBeUndefined();
    expect(result.isHoliday).toBeUndefined();
  });

  test("sets all filter flags when all filters selected", () => {
    const result = toReservationSearchQueryParams({
      municipality: "all",
      startDate,
      endDate,
      filter: ["m", "a", "e", "h"],
      availableInstruments: [],
      institutionSizes: [],
    });
    expect(result.isMorningVacant).toBe(true);
    expect(result.isAfternoonVacant).toBe(true);
    expect(result.isEveningVacant).toBe(true);
    expect(result.isHoliday).toBe(true);
  });
});
