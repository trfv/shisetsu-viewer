import fs from "fs/promises";
import path from "path";
import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import type { Institution } from "@shisetsu-viewer/shared";
import { graphqlRequest } from "./request.ts";

interface InsertInstitutionsResponse {
  insert_institutions: { affected_rows: number };
}

const columns = [
  "id",
  "prefecture",
  "municipality",
  "building",
  "institution",
  "building_kana",
  "institution_kana",
  "building_system_name",
  "institution_system_name",
  "capacity",
  "area",
  "institution_size",
  "fee_divisions",
  "weekday_usage_fee",
  "holiday_usage_fee",
  "address",
  "is_available_strings",
  "is_available_woodwind",
  "is_available_brass",
  "is_available_percussion",
  "is_equipped_music_stand",
  "is_equipped_piano",
  "website_url",
  "layout_image_url",
  "lottery_period",
  "note",
];

const DATA_DIR = path.resolve(import.meta.dirname, "../data/institutions");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

console.time("update institutions");

for (const target of targets) {
  const filePath = path.join(DATA_DIR, `${target}.json`);
  const contents = await fs.readFile(filePath, "utf-8");
  const data: Institution[] = JSON.parse(contents);

  if (data.length === 0) {
    console.log(`${target}: skipped (no data)`);
    continue;
  }

  const response = await graphqlRequest<InsertInstitutionsResponse>(
    `
    mutation update_institutions(
        $data: [institutions_insert_input!]!
        $columns: [institutions_update_column!]!
    ) {
        insert_institutions(
            objects: $data,
            on_conflict: {
                constraint: institutions_id_key,
                update_columns: $columns
            }
        ) {
            affected_rows
        }
    }`,
    {
      data,
      columns,
    }
  );

  console.log(
    `${target}: data: ${data.length}, affected_rows: ${response.insert_institutions.affected_rows}`
  );
}

console.timeEnd("update institutions");
