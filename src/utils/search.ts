export const STRINGS = "s";
export const WOODWIND = "w";
export const BRASS = "b";
export const PERCUSSION = "p";

export const AVAILABLE_INSTRUMENT_MAP = {
  [STRINGS]: "弦楽器",
  [WOODWIND]: "木管楽器",
  [BRASS]: "金管楽器",
  [PERCUSSION]: "打楽器",
} as const;

export const AvailableInstruments = [STRINGS, WOODWIND, BRASS, PERCUSSION] as const;
export type AvailableInstrument = typeof AvailableInstruments[number];

export const getAvailableInstrumentFromUrlParam = (
  availableInstruments: (string | null)[] | null | undefined
): AvailableInstrument[] => {
  return (availableInstruments ?? []).filter((instrument) =>
    AvailableInstruments.some((i) => instrument === i)
  ) as AvailableInstrument[];
};
