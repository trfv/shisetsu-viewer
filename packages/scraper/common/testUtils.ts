import fs from "fs/promises";
import type { TransformOutput } from "@shisetsu-viewer/shared";

export async function writeTestResult(
  outputDir: string,
  fileName: string,
  facilityName: string,
  data: TransformOutput
): Promise<void> {
  await fs.mkdir(`test-results/${outputDir}`, { recursive: true });
  await fs.writeFile(
    `test-results/${outputDir}/${fileName}.json`,
    JSON.stringify({ facility_name: facilityName, data })
  );
}
