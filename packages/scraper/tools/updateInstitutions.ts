import fs from "fs/promises";
import path from "path";

import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import type { Institution } from "@shisetsu-viewer/shared";

import { upsertInstitutions as d1UpsertInstitutions } from "./backend/d1Api.ts";
import { upsertInstitutions } from "./backend/hasura.ts";

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

  const affected = await upsertInstitutions(data);
  console.log(`${target}: data: ${data.length}, affected_rows: ${affected}`);

  if (process.env["D1_API_ENDPOINT"]) {
    try {
      const written = await d1UpsertInstitutions(data);
      console.log(`${target}: d1 rows_written: ${written}`);
    } catch (error) {
      console.error(`${target}: d1 dual-write failed:`, error);
    }
  }
}

console.timeEnd("update institutions");
