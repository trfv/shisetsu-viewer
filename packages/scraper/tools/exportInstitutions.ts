import fs from "fs/promises";
import path from "path";

import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";

import { exportInstitutions } from "./backend/api.ts";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

async function writeJson(dir: string, target: string, rows: unknown[]): Promise<string> {
  await fs.mkdir(path.join(DATA_DIR, dir), { recursive: true });
  const filePath = path.join(DATA_DIR, dir, `${target}.json`);
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2) + "\n");
  return filePath;
}

console.time("export institutions");

for (const target of targets) {
  const [, m] = target.split("-");
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const { buildings, institutions } = await exportInstitutions(municipality);

  const buildingsPath = await writeJson("buildings", target, buildings);
  const institutionsPath = await writeJson("institutions", target, institutions);
  console.log(`${target}: ${buildings.length} buildings -> ${buildingsPath}`);
  console.log(`${target}: ${institutions.length} institutions -> ${institutionsPath}`);
}

console.timeEnd("export institutions");
