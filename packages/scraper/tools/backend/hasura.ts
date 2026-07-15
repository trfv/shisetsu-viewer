import type { Institution } from "@shisetsu-viewer/shared";
import { graphqlRequest } from "../request.ts";
import type { InstitutionKeyMap, ReservationRow } from "./types.ts";

const RESERVATION_CHUNK = 2000;

const INSTITUTION_COLUMNS = [
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

export async function fetchInstitutionKeyMap(
  prefecture: string,
  municipality: string
): Promise<InstitutionKeyMap> {
  const response = await graphqlRequest<{
    institutions: { id: string; building_system_name: string; institution_system_name: string }[];
  }>(
    `
      query list_institutions($prefecture: prefecture, $municipality: String!) {
        institutions(
          where: { prefecture: { _eq: $prefecture }, municipality: { _eq: $municipality } }
        ) {
          id
          building_system_name
          institution_system_name
        }
      }
    `,
    { prefecture, municipality }
  );
  const map: InstitutionKeyMap = {};
  for (const i of response.institutions) {
    map[`${i.building_system_name}-${i.institution_system_name}`] = i.id;
  }
  return map;
}

export async function upsertReservations(rows: ReservationRow[]): Promise<number> {
  let affected = 0;
  for (let i = 0; i < rows.length; i += RESERVATION_CHUNK) {
    const chunk = rows.slice(i, i + RESERVATION_CHUNK);
    const response = await graphqlRequest<{ insert_reservations: { affected_rows: number } }>(
      `
        mutation update_reservations($data: [reservations_insert_input!]!) {
          insert_reservations(
            objects: $data
            on_conflict: {
              constraint: reservations_institution_id_date_key
              update_columns: [reservation]
            }
          ) {
            affected_rows
          }
        }
      `,
      { data: chunk }
    );
    affected += response.insert_reservations.affected_rows;
    console.log(
      `hasura: ${i + 1} ~ ${i + chunk.length}, affected_rows: ${response.insert_reservations.affected_rows}`
    );
  }
  return affected;
}

export async function upsertInstitutions(rows: Institution[]): Promise<number> {
  const response = await graphqlRequest<{ insert_institutions: { affected_rows: number } }>(
    `
      mutation update_institutions(
        $data: [institutions_insert_input!]!
        $columns: [institutions_update_column!]!
      ) {
        insert_institutions(
          objects: $data
          on_conflict: { constraint: institutions_id_key, update_columns: $columns }
        ) {
          affected_rows
        }
      }
    `,
    { data: rows, columns: INSTITUTION_COLUMNS }
  );
  return response.insert_institutions.affected_rows;
}

export async function listInstitutions(
  prefecture: string,
  municipality: string
): Promise<Institution[]> {
  const response = await graphqlRequest<{ institutions: Institution[] }>(
    `
      query list_institutions($prefecture: prefecture!, $municipality: String!) {
        institutions(
          where: { prefecture: { _eq: $prefecture }, municipality: { _eq: $municipality } }
          order_by: [{ building_kana: asc }, { institution_kana: asc }]
        ) {
          id
          ${INSTITUTION_COLUMNS.join("\n          ")}
        }
      }
    `,
    { prefecture, municipality }
  );
  return response.institutions;
}
