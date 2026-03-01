import fs from "fs/promises";
import path from "path";
import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import type { Institution } from "@shisetsu-viewer/shared";
import { graphqlRequest } from "./request.ts";

interface ListInstitutionsResponse {
  institutions: Institution[];
}

const DATA_DIR = path.resolve(import.meta.dirname, "../data/institutions");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

console.time("export institutions");

await fs.mkdir(DATA_DIR, { recursive: true });

for (const target of targets) {
  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${(p as string).toUpperCase()}`;
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const response = await graphqlRequest<ListInstitutionsResponse>(
    `
    query list_institutions($prefecture: String!, $municipality: String!) {
      institutions(
        where: { prefecture: { _eq: $prefecture }, municipality: { _eq: $municipality } }
        order_by: [{ building_kana: asc }, { institution_kana: asc }]
      ) {
        id
        prefecture
        municipality
        building
        institution
        building_kana
        institution_kana
        building_system_name
        institution_system_name
        capacity
        area
        institution_size
        fee_divisions
        weekday_usage_fee
        holiday_usage_fee
        address
        is_available_strings
        is_available_woodwind
        is_available_brass
        is_available_percussion
        is_equipped_music_stand
        is_equipped_piano
        website_url
        layout_image_url
        lottery_period
        note
      }
    }`,
    { prefecture, municipality }
  );

  const filePath = path.join(DATA_DIR, `${target}.json`);
  await fs.writeFile(filePath, JSON.stringify(response.institutions, null, 2) + "\n");
  console.log(`${target}: ${response.institutions.length} institutions -> ${filePath}`);
}

console.timeEnd("export institutions");
