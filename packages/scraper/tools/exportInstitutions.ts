import fs from "fs/promises";
import path from "path";
import { getAllMunicipalityTargets } from "@shisetsu-viewer/shared";
import { listInstitutions } from "./backend/hasura.ts";

const DATA_DIR = path.resolve(import.meta.dirname, "../data/institutions");

const allTargets = getAllMunicipalityTargets();
const filterArg = process.argv[2];
const targets = filterArg ? allTargets.filter((t) => t === filterArg) : allTargets;

console.time("export institutions");

await fs.mkdir(DATA_DIR, { recursive: true });

for (const target of targets) {
  const [p, m] = target.split("-");
  const prefecture = `PREFECTURE_${(p as string).toUpperCase()}`;
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const institutions = await listInstitutions(prefecture, municipality);

  const filePath = path.join(DATA_DIR, `${target}.json`);
  await fs.writeFile(filePath, JSON.stringify(institutions, null, 2) + "\n");
  console.log(`${target}: ${institutions.length} institutions -> ${filePath}`);
}

console.timeEnd("export institutions");
