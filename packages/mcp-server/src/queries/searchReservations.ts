import type { PageInfo } from "@shisetsu-viewer/shared";
import { z } from "zod";

import type { DataSource } from "../data/dataSource.ts";
import { RESERVATION_FIELDS, SEARCH_INSTITUTION_FIELDS } from "./fields.ts";
import { pick } from "./pick.ts";
import {
  afterSchema,
  dateSchema,
  fieldsSchema,
  firstSchema,
  institutionSizesSchema,
  instrumentFilterSchemas,
  municipalitySchema,
  onlyTrue,
} from "./schemas.ts";

export const searchReservationsInput = z.object({
  municipality: municipalitySchema,
  startDate: dateSchema.describe("開始日 (YYYY-MM-DD)"),
  endDate: dateSchema.describe("終了日 (YYYY-MM-DD)"),
  isHoliday: z.boolean().optional().describe("trueで祝日のみに絞り込み"),
  isMorningVacant: z.boolean().optional().describe("trueで午前空きのみ"),
  isAfternoonVacant: z.boolean().optional().describe("trueで午後空きのみ"),
  isEveningVacant: z.boolean().optional().describe("trueで夜間空きのみ"),
  ...instrumentFilterSchemas,
  institutionSizes: institutionSizesSchema,
  fields: z
    .object({
      reservation: fieldsSchema(RESERVATION_FIELDS, "予約のフィールド"),
      institution: fieldsSchema(SEARCH_INSTITUTION_FIELDS, "施設のフィールド"),
    })
    .optional()
    .describe("返却フィールドを指定しトークンを節約 (省略時は全フィールド)"),
  first: firstSchema,
  after: afterSchema,
});

export async function executeSearchReservations(
  args: z.output<typeof searchReservationsInput>,
  dataSource: DataSource
): Promise<{ reservations: Record<string, unknown>[]; pageInfo: PageInfo; count: number }> {
  const page = await dataSource.searchReservations({
    startDate: args.startDate,
    endDate: args.endDate,
    municipality: args.municipality,
    institutionSizes: args.institutionSizes,
    isHoliday: onlyTrue(args.isHoliday),
    isMorningVacant: onlyTrue(args.isMorningVacant),
    isAfternoonVacant: onlyTrue(args.isAfternoonVacant),
    isEveningVacant: onlyTrue(args.isEveningVacant),
    isAvailableStrings: onlyTrue(args.isAvailableStrings),
    isAvailableWoodwind: onlyTrue(args.isAvailableWoodwind),
    isAvailableBrass: onlyTrue(args.isAvailableBrass),
    isAvailablePercussion: onlyTrue(args.isAvailablePercussion),
    limit: args.first,
    cursor: args.after,
  });
  const reservations = page.items.map((hit) => ({
    reservation: pick(hit.reservation, RESERVATION_FIELDS, args.fields?.reservation),
    institution: pick(hit.institution, SEARCH_INSTITUTION_FIELDS, args.fields?.institution),
  }));
  return { reservations, pageInfo: page.pageInfo, count: reservations.length };
}
