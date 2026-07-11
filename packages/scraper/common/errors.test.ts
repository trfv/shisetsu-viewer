import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MaintenanceWindowError,
  PartialExtractionError,
  ScrapeStructureError,
  TargetNotFoundError,
} from "./errors.ts";

test("各エラーは Error のサブクラスで instanceof が効く", () => {
  const errors = [
    new MaintenanceWindowError("m"),
    new TargetNotFoundError("t"),
    new PartialExtractionError("p"),
    new ScrapeStructureError("s"),
  ];
  for (const e of errors) {
    assert.ok(e instanceof Error);
  }
  assert.ok(new MaintenanceWindowError("m") instanceof MaintenanceWindowError);
  assert.ok(new TargetNotFoundError("t") instanceof TargetNotFoundError);
});

test("name プロパティがクラス名と一致する（分類・ログで使う）", () => {
  assert.equal(new MaintenanceWindowError("m").name, "MaintenanceWindowError");
  assert.equal(new TargetNotFoundError("t").name, "TargetNotFoundError");
  assert.equal(new PartialExtractionError("p").name, "PartialExtractionError");
  assert.equal(new ScrapeStructureError("s").name, "ScrapeStructureError");
});

test("message は保持される", () => {
  assert.equal(new MaintenanceWindowError("窓内です").message, "窓内です");
});
