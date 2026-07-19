import assert from "node:assert/strict";
import { test } from "node:test";
import { isViaJpProxy } from "./jpProxy.ts";

test("tokyo-sumida は JP proxy 経由", () => {
  assert.equal(isViaJpProxy("tokyo-sumida"), true);
});

test("tokyo-bunkyo は直接続", () => {
  assert.equal(isViaJpProxy("tokyo-bunkyo"), false);
});

test("未知の target は false", () => {
  assert.equal(isViaJpProxy("tokyo-nonexistent"), false);
});
