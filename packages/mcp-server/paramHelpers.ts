import { AvailabilityDivision, MUNICIPALITIES } from "@shisetsu-viewer/shared";

export const MUNICIPALITY_HELP = Object.values(MUNICIPALITIES)
  .map((config) => `${config.key} (${config.label})`)
  .join(", ");

export const INSTITUTION_SIZE_HELP =
  "INSTITUTION_SIZE_LARGE (100人以上), INSTITUTION_SIZE_MEDIUM (50〜99人), INSTITUTION_SIZE_SMALL (50人未満)";

export function resolveAvailability(value: boolean | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value === true) return AvailabilityDivision.AVAILABLE;
  if (value === false) return AvailabilityDivision.UNAVAILABLE;
  return value;
}
