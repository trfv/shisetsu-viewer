import assert from "node:assert/strict";
import { test } from "node:test";

import { buildInfraFailureRecord } from "./infraFailure.ts";

test("infra の失敗レコードを組み立てる", () => {
  const record = buildInfraFailureRecord({
    municipality: "tokyo-sumida",
    reason: "preflight HTTP 530",
    now: new Date("2026-10-04T00:00:00Z"),
  });
  assert.equal(record.municipality, "tokyo-sumida");
  assert.equal(record.classification, "infra");
  assert.equal(record.failedStep, "prepare");
  assert.equal(record.errorMessage, "preflight HTTP 530");
  assert.equal(record.capturedAt, "2026-10-04T00:00:00.000Z");
});
