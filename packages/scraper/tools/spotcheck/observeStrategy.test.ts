import { test } from "node:test";
import assert from "node:assert/strict";
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";
import { STRATEGY_BY_MUNICIPALITY, strategyFor } from "./observeStrategy.ts";

test("strategyFor は既定で direct を返す", () => {
  assert.equal(strategyFor("tokyo-koutou"), "direct");
  assert.equal(strategyFor("tokyo-kita"), "direct");
  assert.equal(strategyFor("未知の自治体"), "direct");
});

test("strategyFor は区分フィルタ型の自治体に divisionFilter を返す", () => {
  assert.equal(strategyFor("tokyo-toshima"), "divisionFilter");
  assert.equal(strategyFor("tokyo-edogawa"), "divisionFilter");
});

test("戦略マップのキーは registry に実在する自治体である", () => {
  for (const key of Object.keys(STRATEGY_BY_MUNICIPALITY)) {
    const slug = key.split("-")[1];
    assert.ok(slug !== undefined, `${key} は <prefecture>-<slug> の形式ではない`);
    assert.ok(getMunicipalityBySlug(slug) !== undefined, `${key} が registry に存在しない`);
  }
});
