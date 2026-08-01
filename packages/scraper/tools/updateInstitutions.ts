import fs from "fs/promises";
import path from "path";

import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import type { Institution } from "@shisetsu-viewer/shared";

import { upsertInstitutions } from "./backend/d1Api.ts";

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

  const written = await upsertInstitutions(data);
  console.log(`${target}: data: ${data.length}, rows_written: ${written}`);
}

console.timeEnd("update institutions");
