import { z } from "zod";

import type { DataSource } from "../data/dataSource.ts";
import { INSTITUTION_LIST_FIELDS } from "./fields.ts";
import { pick } from "./pick.ts";
import {
  afterSchema,
  fieldsSchema,
  firstSchema,
  institutionSizesSchema,
  instrumentFilterSchemas,
  municipalitySchema,
  onlyTrue,
  pageInfoSchema,
  rowSchema,
} from "./schemas.ts";

export const listInstitutionsInput = z.object({
  municipality: municipalitySchema,
  institutionSizes: institutionSizesSchema,
  ...instrumentFilterSchemas,
  fields: fieldsSchema(INSTITUTION_LIST_FIELDS),
  first: firstSchema,
  after: afterSchema,
});

export const listInstitutionsOutput = z.object({
  institutions: z.array(rowSchema),
  pageInfo: pageInfoSchema,
  count: z.number().int(),
});

export async function executeListInstitutions(
  args: z.output<typeof listInstitutionsInput>,
  dataSource: DataSource
): Promise<z.output<typeof listInstitutionsOutput>> {
  const page = await dataSource.listInstitutions({
    municipality: args.municipality,
    institutionSizes: args.institutionSizes,
    isAvailableStrings: onlyTrue(args.isAvailableStrings),
    isAvailableWoodwind: onlyTrue(args.isAvailableWoodwind),
    isAvailableBrass: onlyTrue(args.isAvailableBrass),
    isAvailablePercussion: onlyTrue(args.isAvailablePercussion),
    limit: args.first,
    cursor: args.after,
  });
  const institutions = page.items.map((item) => pick(item, INSTITUTION_LIST_FIELDS, args.fields));
  return { institutions, pageInfo: page.pageInfo, count: institutions.length };
}
