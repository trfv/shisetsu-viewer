import fs from "fs/promises";
import { graphqlRequest } from "./request.ts";

interface Institution {
  id: string;
  building_system_name: string;
  institution_system_name: string;
}

interface ListInstitutionsResponse {
  institutions: Institution[];
}

interface InsertReservationsResponse {
  insert_reservations: { affected_rows: number };
}

interface FileData {
  facility_name: string;
  data: { room_name: string; date: string; reservation: Record<string, string> }[];
}

interface ReservationRow {
  institution_id: string;
  date: string;
  reservation: Record<string, string>;
}

let _targets = [
  "kanagawa-kawasaki",
  "tokyo-arakawa",
  "tokyo-chuo",
  "tokyo-kita",
  "tokyo-koutou",
  "tokyo-sumida",
];
const target = process.argv[2];
if (target) {
  _targets = _targets.filter((t) => t === target);
}
const targets = _targets;
const title = `update reservations`;

console.time(title);

for (const target of targets) {
  const dir = `test-results/${target}`;
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    console.warn(`Directory ${dir} does not exist.`);
    continue;
  }
  const fileData = await Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(`${dir}/${file}`, "utf-8");
      return JSON.parse(contents) as FileData;
    })
  );

  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${(p as string).toUpperCase()}`;
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const institutions = await graphqlRequest<ListInstitutionsResponse>(
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
    {
      prefecture,
      municipality,
    }
  );

  const institutionIdMap: Record<string, string> = institutions.institutions.reduce(
    (acc: Record<string, string>, cur) => {
      acc[`${cur.building_system_name}-${cur.institution_system_name}`] = cur.id;
      return acc;
    },
    {}
  );

  const rawData: ReservationRow[] = fileData.flatMap(
    ({ facility_name: institution_system_name, data }) => {
      return data.flatMap((d) => {
        const { room_name: building_system_name, date, reservation } = d;
        const institution_id =
          institutionIdMap[`${institution_system_name}-${building_system_name}`];
        if (!institution_id) {
          return [];
        }
        return {
          institution_id,
          date,
          reservation,
        };
      });
    }
  );

  // "Ensure that no rows proposed for insertion within the same command have duplicate constrained values." への対応
  // TODO: 原則発生しないはずなので原因を調査する
  const uniqueData = rawData.filter(
    (d, i, a) =>
      a.findIndex((t) => t.date === d.date && t.institution_id === d.institution_id) === i
  );

  const chunk = 2000;
  console.log(`total: ${uniqueData.length}, chunk: ${chunk}`);

  for (let i = 0; i < uniqueData.length; i += chunk) {
    const chunkData = uniqueData.slice(i, i + chunk);
    const response = await graphqlRequest<InsertReservationsResponse>(
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
      {
        data: chunkData,
      }
    );

    console.log(
      `data: ${i + 1} ~ ${i + chunkData.length}, affected_rows: ${response.insert_reservations.affected_rows}`
    );
  }
}

console.timeEnd(title);
