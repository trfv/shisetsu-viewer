import { describe, it, expect } from "vitest";
import { AvailabilityDivisionMap, EquipmentDivisionMap, InstitutionSizeMap } from "./enums";
import { AvailabilityDivision, EquipmentDivision, InstitutionSize } from "../constants/enums";

describe("AvailabilityDivisionMap", () => {
  it("各区分に対応する日本語表示を返す", () => {
    expect(AvailabilityDivisionMap[AvailabilityDivision.AVAILABLE]).toBe("利用可");
    expect(AvailabilityDivisionMap[AvailabilityDivision.UNAVAILABLE]).toBe("利用不可");
    expect(AvailabilityDivisionMap[AvailabilityDivision.UNKNOWN]).toBe("不明");
  });
});

describe("EquipmentDivisionMap", () => {
  it("各区分に対応する日本語表示を返す", () => {
    expect(EquipmentDivisionMap[EquipmentDivision.EQUIPPED]).toBe("あり");
    expect(EquipmentDivisionMap[EquipmentDivision.UNEQUIPPED]).toBe("なし");
    expect(EquipmentDivisionMap[EquipmentDivision.UNKNOWN]).toBe("不明");
  });
});

describe("InstitutionSizeMap", () => {
  it("各サイズに対応する日本語表示を返す", () => {
    expect(InstitutionSizeMap[InstitutionSize.LARGE]).toBe("大（100㎡~）");
    expect(InstitutionSizeMap[InstitutionSize.MEDIUM]).toBe("中（50㎡~100㎡）");
    expect(InstitutionSizeMap[InstitutionSize.SMALL]).toBe("小（~50㎡）");
    expect(InstitutionSizeMap[InstitutionSize.UNKNOWN]).toBe("不明");
  });
});
