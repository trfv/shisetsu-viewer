import { z } from "zod";

import type { DataSource } from "../data/dataSource.ts";
import { INSTITUTION_DETAIL_FIELDS } from "./fields.ts";
import { pick } from "./pick.ts";
import { fieldsSchema, institutionIdSchema, rowSchema } from "./schemas.ts";

export const getInstitutionDetailInput = z.object({
  id: institutionIdSchema.describe("施設のUUID"),
  fields: fieldsSchema(INSTITUTION_DETAIL_FIELDS),
});

export const getInstitutionDetailOutput = rowSchema;

export async function executeGetInstitutionDetail(
  args: z.output<typeof getInstitutionDetailInput>,
  dataSource: DataSource
): Promise<Record<string, unknown> | null> {
  const detail = await dataSource.getInstitutionDetail(args.id);
  if (!detail) return null;
  return pick(detail, INSTITUTION_DETAIL_FIELDS, args.fields);
}
