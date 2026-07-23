import fs from "fs/promises";
import path from "path";

import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import type { Institution } from "@shisetsu-viewer/shared";

import { graphqlRequest } from "../request.ts";
import { upsertHolidays, upsertInstitutions, upsertReservations } from "./d1Api.ts";

/**
 * Hasura の実データを D1 admin API に流すワンショットのシード。
 * 使い方: node --env-file=.env tools/backend/seed.ts <groupA|groupB|holidays|institutions>
 * 前提 env: GRAPHQL_ENDPOINT + M2M_TOKEN（読み出し元）/ D1_API_ENDPOINT + ADMIN_API_KEY（書き込み先）
 *
 * D1 Free の書き込み枠（10 万行/日、新規は index 込み ×2）に収めるため自治体を 2 グループに分割。
 */
const GROUP_A = ["tokyo-edogawa", "tokyo-arakawa", "tokyo-koutou", "tokyo-chuo"];
const GROUP_B = [
  "kanagawa-kawasaki",
  "tokyo-toshima",
  "tokyo-sumida",
  "tokyo-bunkyo",
  "tokyo-kita",
  "tokyo-ota",
];

const DATA_DIR = path.resolve(import.meta.dirname, "../../data/institutions");
const RESERVATION_PAGE = 1000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function seedInstitutions(): Promise<void> {
  for (const target of getAllMunicipalityTargets()) {
    const filePath = path.join(DATA_DIR, `${target}.json`);
    const data: Institution[] = JSON.parse(await fs.readFile(filePath, "utf-8"));
    if (data.length === 0) continue;
    const written = await upsertInstitutions(data);
    console.log(`institutions ${target}: ${data.length} rows, d1 rows_written: ${written}`);
  }
}

async function seedHolidays(): Promise<void> {
  const response = await graphqlRequest<{ holidays: { date: string; name: string }[] }>(
    `query { holidays { date name } }`
  );
  const written = await upsertHolidays(response.holidays);
  console.log(`holidays: ${response.holidays.length} rows, d1 rows_written: ${written}`);
}

async function seedReservations(targets: string[]): Promise<void> {
  const from = today();
  for (const target of targets) {
    const [, m] = target.split("-");
    const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;
    let offset = 0;
    let total = 0;
    for (;;) {
      const response = await graphqlRequest<{
        reservations: {
          institution_id: string;
          date: string;
          reservation: Record<string, string>;
        }[];
      }>(
        `query seed($municipality: String!, $from: date!, $limit: Int!, $offset: Int!) {
          reservations(
            where: { institution: { municipality: { _eq: $municipality } }, date: { _gte: $from } }
            order_by: { id: asc }
            limit: $limit
            offset: $offset
          ) { institution_id date reservation }
        }`,
        { municipality, from, limit: RESERVATION_PAGE, offset }
      );
      const batch = response.reservations;
      if (batch.length === 0) break;
      // FileData を経由しない直接投入のため buildReservationRows は使わず素の行を渡す
      const written = await upsertReservations(batch, municipality, `seed-${from}`);
      total += batch.length;
      console.log(`reservations ${target}: +${batch.length} (d1 rows_written: ${written})`);
      offset += RESERVATION_PAGE;
      if (batch.length < RESERVATION_PAGE) break;
    }
    console.log(`reservations ${target}: total ${total}`);
  }
}

const mode = process.argv[2];

// institutions 以外は Hasura を読むため M2M トークンが要る。run.ts と同様に、
// M2M_TOKEN も HASURA_ADMIN_SECRET も無ければ Auth0 Client Credentials で自動取得する。
if (mode !== "institutions" && !process.env.M2M_TOKEN && !process.env["HASURA_ADMIN_SECRET"]) {
  const { fetchM2MToken } = await import("../m2mAuth.ts");
  process.env.M2M_TOKEN = await fetchM2MToken();
  console.log("M2M_TOKEN fetched from Auth0.");
}

switch (mode) {
  case "institutions":
    await seedInstitutions();
    break;
  case "holidays":
    await seedHolidays();
    break;
  case "groupA":
    await seedReservations(GROUP_A);
    break;
  case "groupB":
    await seedReservations(GROUP_B);
    break;
  default:
    console.error("usage: seed.ts <institutions|holidays|groupA|groupB>");
    process.exit(1);
}
