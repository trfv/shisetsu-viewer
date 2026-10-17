import { z } from "zod";

import type { DataSource } from "../data/dataSource.ts";
import { RESERVATION_FIELDS } from "./fields.ts";
import { pick } from "./pick.ts";
import { dateSchema, fieldsSchema, institutionIdSchema, rowSchema } from "./schemas.ts";

export const getInstitutionReservationsInput = z.object({
  institutionId: institutionIdSchema.describe("施設のUUID"),
  startDate: dateSchema.describe("開始日 (YYYY-MM-DD)"),
  endDate: dateSchema.describe("終了日 (YYYY-MM-DD)"),
  fields: fieldsSchema(RESERVATION_FIELDS),
});

export const getInstitutionReservationsOutput = z.object({
  reservations: z.array(rowSchema),
  count: z.number().int(),
});

export async function executeGetInstitutionReservations(
  args: z.output<typeof getInstitutionReservationsInput>,
  dataSource: DataSource
): Promise<z.output<typeof getInstitutionReservationsOutput>> {
  const rows = await dataSource.getInstitutionReservations(args.institutionId, {
    startDate: args.startDate,
    endDate: args.endDate,
  });
  const reservations = rows.map((row) => pick(row, RESERVATION_FIELDS, args.fields));
  return { reservations, count: reservations.length };
}
