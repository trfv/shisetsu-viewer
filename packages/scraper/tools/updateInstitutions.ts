import fs from "fs/promises";
import path from "path";

import { getAllMunicipalityTargets, type Building } from "@shisetsu-viewer/shared";

import { upsertBuildings, upsertInstitutions } from "./backend/api.ts";
import type { InstitutionRecord } from "./backend/types.ts";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

async function readJson<T>(dir: string, target: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, dir, `${target}.json`), "utf-8")) as T;
}

console.time("update institutions");

for (const target of targets) {
  const buildings = await readJson<Building[]>("buildings", target);
  const institutions = await readJson<InstitutionRecord[]>("institutions", target);

  if (institutions.length === 0) {
    console.log(`${target}: skipped (no data)`);
    continue;
  }

  // 部屋は building_id で建物を指すので、建物を先に書く
  const buildingsWritten = await upsertBuildings(buildings);
  const institutionsWritten = await upsertInstitutions(institutions);
  console.log(
    `${target}: buildings: ${buildings.length}, rows_written: ${buildingsWritten}; ` +
      `institutions: ${institutions.length}, rows_written: ${institutionsWritten}`
  );
}

console.timeEnd("update institutions");
