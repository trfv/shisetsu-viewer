import fs from "fs/promises";

import { getReservationTargets } from "@shisetsu-viewer/shared";

import { upsertReservations as d1UpsertReservations } from "./backend/d1Api.ts";
import { fetchInstitutionKeyMap, upsertReservations } from "./backend/hasura.ts";
import { buildReservationRows } from "./backend/transform.ts";
import type { FileData } from "./backend/types.ts";

const allTargets = getReservationTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;
const title = `update reservations`;

console.time(title);

for (const target of targets) {
  const dir = `test-results/${target}`;
  let files: string[];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    files = entries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name);
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

  const keyMap = await fetchInstitutionKeyMap(prefecture, municipality);
  const { rows, unmatchedKeys } = buildReservationRows(fileData, keyMap);
  if (unmatchedKeys.length > 0) {
    console.warn(`${target}: unmatched facility keys: ${unmatchedKeys.join(", ")}`);
  }
  console.log(`${target}: total: ${rows.length}`);
  const affected = await upsertReservations(rows);
  console.log(`${target}: affected_rows: ${affected}`);

  // dual-write: D1_API_ENDPOINT が設定されているときだけ D1 にも書く。
  // dual-write 期間中は D1 側の失敗で本流（Hasura）を落とさない。
  if (process.env["D1_API_ENDPOINT"]) {
    const runId = process.env["GITHUB_RUN_ID"] ?? new Date().toISOString();
    try {
      const written = await d1UpsertReservations(rows, municipality, runId);
      console.log(`${target}: d1 rows_written: ${written}`);
    } catch (error) {
      console.error(`${target}: d1 dual-write failed:`, error);
    }
  }
}

console.timeEnd(title);
