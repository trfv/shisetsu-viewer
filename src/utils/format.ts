import { Enums, getEnumMap } from "../constants/enums";

export const getEnumLabel = <T extends Enums>(value: string): string | T => {
  return getEnumMap(value).find((val) => val.value === value)?.label || value;
};
