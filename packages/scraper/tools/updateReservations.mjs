import fs from "fs/promises";
import { isWeekend } from "date-fns";
import { graphqlRequest } from "./request.mjs";

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

const holidays = await graphqlRequest(`
  query list_holidays {
    holidays(where: { date: { _gte: now } }) {
      date
    }
  }
`);

const holidayMap = holidays.holidays.reduce((acc, cur) => {
  acc[cur.date] = true;
  return acc;
}, {});

for (const target of targets) {
  const dir = `test-results/${target}`;
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    console.warn(`Directory ${dir} does not exist.`);
    continue;
  }
  const fileData = await Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(`${dir}/${file}`, "utf-8");
      return JSON.parse(contents);
    })
  );

  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${p.toUpperCase()}`;
  const municipality = `MUNICIPALITY_${m.toUpperCase()}`;

  const institutions = await graphqlRequest(
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

  const institutionIdMap = institutions.institutions.reduce((acc, cur) => {
    acc[`${cur.building_system_name}-${cur.institution_system_name}`] = cur.id;
    return acc;
  }, {});

  const rawData = fileData.flatMap(({ facility_name: institution_system_name, data }) => {
    return data.flatMap((d) => {
      const { room_name: building_system_name, date, reservation } = d;
      const institution_id = institutionIdMap[`${institution_system_name}-${building_system_name}`];
      if (!institution_id) {
        return [];
      }
      const is_holiday = isWeekend(new Date(date)) || holidayMap[date] || false;
      return {
        institution_id,
        date,
        reservation,
        is_holiday,
      };
    });
  });

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
    const response = await graphqlRequest(
      `
        mutation update_reservations($data: [reservations_insert_input!]!) {
          insert_reservations(
            objects: $data
            on_conflict: {
              constraint: reservations_institution_id_date_key
              update_columns: [reservation, is_holiday]
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
