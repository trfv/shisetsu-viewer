/**
 * 国内 proxy の経路断を失敗レコードとして test-results/<municipality>/_failures/ に書く。
 * scrape アクションの preflight 失敗時に呼ばれる。
 * 使い方: node scripts/recordInfraFailure.ts <municipality> <reason>
 */
import fs from "node:fs";
import path from "node:path";

import { buildInfraFailureRecord } from "../common/infraFailure.ts";

const [municipality, reason] = process.argv.slice(2);
if (!municipality || !reason) {
  console.error("usage: node scripts/recordInfraFailure.ts <municipality> <reason>");
  process.exit(2);
}
const dir = path.join("test-results", municipality, "_failures");
fs.mkdirSync(dir, { recursive: true });
const record = buildInfraFailureRecord({ municipality, reason, now: new Date() });
fs.writeFileSync(path.join(dir, "_infra.json"), `${JSON.stringify(record, null, 2)}\n`);
