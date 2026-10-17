import assert from "node:assert/strict";
import { test } from "node:test";

import { parseKey, parseState, renderBody } from "./workItem.ts";

test("renderBody の出力から key と state を読み戻せる", () => {
  const body = renderBody("scraper-repair:tokyo-kita", { consecutive: 3, lastRunId: 42 }, "本文");
  assert.ok(body.startsWith("本文\n"));
  assert.equal(parseKey(body), "scraper-repair:tokyo-kita");
  assert.deepEqual(parseState(body), { consecutive: 3, lastRunId: 42 });
});

test("lastRunId は null を許す", () => {
  const body = renderBody("master-red", { consecutive: 1, lastRunId: null }, "x");
  assert.deepEqual(parseState(body), { consecutive: 1, lastRunId: null });
});

test("マーカーが無ければ null", () => {
  assert.equal(parseKey("普通の Issue"), null);
  assert.equal(parseState("普通の Issue"), null);
});

test("壊れた state は null になり、key は読める", () => {
  const body = "x\n<!-- factory:key infra:tokyo-sumida -->\n<!-- factory:state {consecutive: -->";
  assert.equal(parseKey(body), "infra:tokyo-sumida");
  assert.equal(parseState(body), null);
});

test("型の合わない state は null", () => {
  assert.equal(parseState('<!-- factory:state {"consecutive":"2","lastRunId":1} -->'), null);
});
