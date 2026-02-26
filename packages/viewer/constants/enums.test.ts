import { describe, it, expect } from "vitest";
import {
  ReservationStatus,
  ReservationDivision,
  FeeDivision,
  AvailabilityDivision,
  EquipmentDivision,
  InstitutionSize,
} from "./enums";

describe("enums", () => {
  it("ReservationStatusが正しい値を持つ", () => {
    expect(ReservationStatus.INVALID).toBe("RESERVATION_STATUS_INVALID");
    expect(ReservationStatus.VACANT).toBe("RESERVATION_STATUS_VACANT");
    expect(ReservationStatus.STATUS_1).toBe("RESERVATION_STATUS_STATUS_1");
  });

  it("ReservationDivisionが正しい値を持つ", () => {
    expect(ReservationDivision.INVALID).toBe("RESERVATION_DIVISION_INVALID");
    expect(ReservationDivision.MORNING).toBe("RESERVATION_DIVISION_MORNING");
    expect(ReservationDivision.AFTERNOON).toBe("RESERVATION_DIVISION_AFTERNOON");
    expect(ReservationDivision.EVENING).toBe("RESERVATION_DIVISION_EVENING");
  });

  it("FeeDivisionが正しい値を持つ", () => {
    expect(FeeDivision.INVALID).toBe("FEE_DIVISION_INVALID");
    expect(FeeDivision.MORNING).toBe("FEE_DIVISION_MORNING");
    expect(FeeDivision.ONE_HOUR).toBe("FEE_DIVISION_ONE_HOUR");
  });

  it("AvailabilityDivisionが正しい値を持つ", () => {
    expect(AvailabilityDivision.AVAILABLE).toBe("AVAILABILITY_DIVISION_AVAILABLE");
    expect(AvailabilityDivision.UNAVAILABLE).toBe("AVAILABILITY_DIVISION_UNAVAILABLE");
    expect(AvailabilityDivision.UNKNOWN).toBe("AVAILABILITY_DIVISION_UNKNOWN");
  });

  it("EquipmentDivisionが正しい値を持つ", () => {
    expect(EquipmentDivision.EQUIPPED).toBe("EQUIPMENT_DIVISION_EQUIPPED");
    expect(EquipmentDivision.UNEQUIPPED).toBe("EQUIPMENT_DIVISION_UNEQUIPPED");
    expect(EquipmentDivision.UNKNOWN).toBe("EQUIPMENT_DIVISION_UNKNOWN");
  });

  it("InstitutionSizeが正しい値を持つ", () => {
    expect(InstitutionSize.LARGE).toBe("INSTITUTION_SIZE_LARGE");
    expect(InstitutionSize.MEDIUM).toBe("INSTITUTION_SIZE_MEDIUM");
    expect(InstitutionSize.SMALL).toBe("INSTITUTION_SIZE_SMALL");
    expect(InstitutionSize.UNKNOWN).toBe("INSTITUTION_SIZE_UNKNOWN");
  });
});
