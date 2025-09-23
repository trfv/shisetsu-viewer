import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { HttpLink } from "@apollo/client/link/http";

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const SCRIPT_ENDPOINT = process.env.SCRIPT_ENDPOINT;

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
const title = `update institutions`;

console.time(title);

const client = new ApolloClient({
  link: new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    headers: {
      "Content-type": "application/json",
      "X-Hasura-Admin-Secret": ADMIN_SECRET,
    },
  }),
  cache: new InMemoryCache(),
});

const FEE_DIVISION_MAP = {
  "": "FEE_DIVISION_INVALID",
  午前: "FEE_DIVISION_MORNING",
  午後: "FEE_DIVISION_AFTERNOON",
  午後1: "FEE_DIVISION_AFTERNOON_ONE",
  午後2: "FEE_DIVISION_AFTERNOON_TWO",
  夜間: "FEE_DIVISION_EVENING",
  夜間1: "FEE_DIVISION_EVENING_ONE",
  夜間2: "FEE_DIVISION_EVENING_TWO",
  "1時間": "FEE_DIVISION_ONE_HOUR",
  "2時間": "FEE_DIVISION_TWO_HOUR",
  "①": "FEE_DIVISION_DIVISION_1",
  "②": "FEE_DIVISION_DIVISION_2",
  "③": "FEE_DIVISION_DIVISION_3",
  "④": "FEE_DIVISION_DIVISION_4",
  "⑤": "FEE_DIVISION_DIVISION_5",
  "⑥": "FEE_DIVISION_DIVISION_6",
};

const AVAILABILITY_DIVISION_MAP = {
  "": "AVAILABILITY_DIVISION_INVALID",
  利用可: "AVAILABILITY_DIVISION_AVAILABLE",
  利用不可: "AVAILABILITY_DIVISION_UNAVAILABLE",
  不明: "AVAILABILITY_DIVISION_UNKNOWN",
};

const EQUIPMENT_DIVISION_MAP = {
  "": "EQUIPMENT_DIVISION_INVALID",
  あり: "EQUIPMENT_DIVISION_EQUIPPED",
  なし: "EQUIPMENT_DIVISION_UNEQUIPPED",
  不明: "EQUIPMENT_DIVISION_UNKNOWN",
};

const INSTITUTION_SIZE_MAP = {
  "": "INSTITUTION_SIZE_INVALID",
  大: "INSTITUTION_SIZE_LARGE",
  中: "INSTITUTION_SIZE_MEDIUM",
  小: "INSTITUTION_SIZE_SMALL",
  不明: "INSTITUTION_SIZE_UNKNOWN",
};

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

const aggreagate = (acc, key, value) => {
  switch (key) {
    case "building_name":
    case "institution_name":
    case "building_name_kana":
    case "institution_name_kana":
      acc[key.replace("_name", "")] = value;
      return acc;
    case "capacity":
    case "area":
      acc[key] = value ? value : undefined;
      return acc;
    case "fee_divisions":
      if (value) {
        acc[key] = `{${value.split(",").map((v) => FEE_DIVISION_MAP[v])}}`;
      } else {
        acc[key] = "{}";
      }
      return acc;
    case "weekday_usage_fee":
    case "holiday_usage_fee":
      if (value) {
        acc[key] = value.split(",").map((v) => {
          const [division, fee] = v.split("=");
          return { division: FEE_DIVISION_MAP[division], fee: Number(fee) };
        });
      } else {
        acc[key] = [];
      }
      return acc;
    case "is_available_strings":
    case "is_available_woodwind":
    case "is_available_brass":
    case "is_available_percussion":
      acc[key] = AVAILABILITY_DIVISION_MAP[value];
      return acc;
    case "is_equipped_music_stand":
    case "is_equipped_piano":
      acc[key] = EQUIPMENT_DIVISION_MAP[value];
      return acc;
    case "institution_size":
      acc[key] = INSTITUTION_SIZE_MAP[value];
      return acc;
    case "building_id":
    case "reservation_divisions":
    case "weekday_usage_fee_resident_discount":
    case "holiday_usage_fee_resident_discount":
      return acc;
    default:
      acc[key] = value;
      return acc;
  }
};

for (const target of targets) {
  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${p.toUpperCase()}`;
  const municipality = `MUNICIPALITY_${m.toUpperCase()}`;

  const rawData = await (await fetch(`${SCRIPT_ENDPOINT}?sheet_name=${municipality}`)).json();

  const data = rawData.map((d) => {
    return Object.entries(d).reduce((acc, [key, value]) => aggreagate(acc, key, value), {
      prefecture,
      municipality,
    });
  });

  const response = await client.mutate({
    mutation: gql(`
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
    }`),
    variables: {
      data: data,
      columns: columns,
    },
  });

  console.log(
    `data: ${data.length}, affected_rows: ${response["data"]["insert_institutions"]["affected_rows"]}`
  );
}

console.timeEnd(title);
