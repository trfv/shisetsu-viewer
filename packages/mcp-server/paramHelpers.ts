import { AvailabilityDivision, MUNICIPALITIES } from "@shisetsu-viewer/shared";
import { z } from "zod";

export const MUNICIPALITY_HELP = Object.values(MUNICIPALITIES)
  .map((config) => `${config.key} (${config.label})`)
  .join(", ");

export const INSTITUTION_SIZE_HELP =
  "INSTITUTION_SIZE_LARGE (100人以上), INSTITUTION_SIZE_MEDIUM (50〜99人), INSTITUTION_SIZE_SMALL (50人未満)";

// 施設 ID には RFC 4122 非準拠の UUID が含まれる (version/variant ビットが不正な ID が
// toshima/edogawa/bunkyo/kita に計 17 件)。z.string().uuid() は RFC 厳格検証でこれらを
// 弾くため、viewer の isValidUuid と同じ 8-4-4-4-12 の hex 形式のみを検証する。
export const institutionIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

export function resolveAvailability(value: boolean | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value === true) return AvailabilityDivision.AVAILABLE;
  if (value === false) return AvailabilityDivision.UNAVAILABLE;
  return value;
}
