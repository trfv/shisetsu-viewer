import fs from "fs/promises";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client/core/core.cjs";
import { isWeekend } from "date-fns";

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const municipality = process.argv[2];
const title = `save ${municipality} reservations`;

console.time(title);

const client = new ApolloClient({
  uri: GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
  headers: {
    "Content-type": "application/json",
    "X-Hasura-Admin-Secret": ADMIN_SECRET,
  },
});

const holidays = await client.query({
  query: gql`
    query list_holidays {
      holidays(where: { date: { _gte: now } }) {
        date
      }
    }
  `,
});

const holiday_map = holidays["data"]["holidays"].reduce((acc, cur) => {
  acc[cur["date"]] = true;
  return acc;
}, {});

const institutions = await client.query({
  query: gql`
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
  variables: {
    prefecture: "PREFECTURE_TOKYO",
    municipality: `MUNICIPALITY_${municipality.toUpperCase()}`,
  },
});

const institution_id_map = institutions["data"]["institutions"].reduce((acc, cur) => {
  acc[`${cur["building_system_name"]}-${cur["institution_system_name"]}`] = cur["id"];
  return acc;
}, {});

const dir = `test-results/${municipality}`;
const files = await fs.readdir(dir);
const fileData = await Promise.all(
  files.map(async (file) => {
    const contents = await fs.readFile(`${dir}/${file}`, "utf-8");
    return JSON.parse(contents);
  })
);

const rawData = fileData.flatMap(({ facility_name: institution_system_name, data }) => {
  return data.flatMap((d) => {
    const { room_name: building_system_name, date, reservation } = d;
    const institution_id = institution_id_map[`${institution_system_name}-${building_system_name}`];
    if (!institution_id) {
      return [];
    }
    const is_holiday = isWeekend(new Date(date)) || holiday_map[date] || false;
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
  (d, i, a) => a.findIndex((t) => t.date === d.date && t.institution_id === d.institution_id) === i
);

const response = await client.mutate({
  mutation: gql`
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
  variables: {
    data: uniqueData,
  },
});

console.log(`data: ${uniqueData.length}`);
console.log(`affected_rows: ${response["data"]["insert_reservations"]["affected_rows"]}`);
console.timeEnd(title);
