import fs from "fs/promises";

import { getMunicipalityKeyByScraperTarget, getScraperTargets } from "@shisetsu-viewer/shared";

import { fetchInstitutionKeyMap, upsertReservations } from "./backend/d1Api.ts";
import { buildReservationRows } from "./backend/transform.ts";
import type { FileData } from "./backend/types.ts";

const allTargets = getScraperTargets();
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

  // 追加スクレイパー（例 tokyo-kita-genkiplaza）は親自治体の municipality に書く。
  // target を "-" で分割する旧実装は、たまたま動くだけで解釈が曖昧だった。
  const municipality = getMunicipalityKeyByScraperTarget(target);
  if (municipality === undefined) {
    throw new Error(`registry に scraper target=${target} の自治体がありません`);
  }

  const keyMap = await fetchInstitutionKeyMap(municipality);
  const { rows, unmatchedKeys } = buildReservationRows(fileData, keyMap);
  if (unmatchedKeys.length > 0) {
    console.warn(`${target}: unmatched facility keys: ${unmatchedKeys.join(", ")}`);
  }
  console.log(`${target}: total: ${rows.length}`);

  const runId = process.env["GITHUB_RUN_ID"] ?? new Date().toISOString();
  const written = await upsertReservations(rows, municipality, runId);
  console.log(`${target}: rows_written: ${written}`);
}

console.timeEnd(title);
