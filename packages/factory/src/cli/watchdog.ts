import { parseArgs } from "node:util";

import { applyOps, ensureLabels } from "../applyOps.ts";
import { latestRunCreatedAt, listFactoryItems } from "../gh.ts";
import { watchdogOps } from "../watchdog.ts";

const { values } = parseArgs({
  options: {
    workflow: { type: "string" },
    event: { type: "string" },
    key: { type: "string" },
    "max-age-hours": { type: "string", default: "26" },
  },
});
const workflow = values.workflow;
const key = values.key;
const owner = process.env["FACTORY_OWNER"];
if (!workflow || !key || !owner) {
  console.error(
    "usage: watchdog.ts --workflow <file> [--event <event>] --key <key>（FACTORY_OWNER 必須）"
  );
  process.exit(2);
}
if ((process.env["FACTORY_MODE"] || "observe") === "off") {
  console.log("FACTORY_MODE=off のため何もしない");
  process.exit(0);
}

const lastRunAt = latestRunCreatedAt(workflow, values.event ?? null);
const ops = watchdogOps({
  key,
  workflow,
  lastRunAt,
  now: new Date(),
  maxAgeHours: Number(values["max-age-hours"]),
  existing: listFactoryItems().find((i) => i.key === key) ?? null,
});
console.log(`${workflow} lastRunAt=${lastRunAt ?? "(none)"} ops=${ops.length}`);
console.log(JSON.stringify(ops, null, 2));
if (ops.length > 0) {
  ensureLabels();
  applyOps(ops, owner);
}
