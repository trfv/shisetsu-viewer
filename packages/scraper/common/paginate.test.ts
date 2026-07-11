import assert from "node:assert/strict";
import { test } from "node:test";
import { collectPaginated, drainPaginationEvents, resetPaginationEvents } from "./paginate.ts";

test("maxPages 回抽出し、最後のページでは goNext を呼ばない", async () => {
  const nextCalls: number[] = [];
  const items = await collectPaginated<number>({
    maxPages: 3,
    extractPage: async (i) => [i],
    goNext: async (i) => {
      nextCalls.push(i);
      return true;
    },
  });
  assert.deepEqual(items, [0, 1, 2]);
  assert.deepEqual(nextCalls, [0, 1]);
});

test("goNext が false を返したら打ち切る", async () => {
  const items = await collectPaginated<number>({
    maxPages: 10,
    extractPage: async (i) => [i],
    goNext: async (i) => i < 1,
  });
  assert.deepEqual(items, [0, 1]);
});

test("extractPage の throw は警告してそこまでの結果を返す", async () => {
  const items = await collectPaginated<number>({
    maxPages: 10,
    extractPage: async (i) => {
      if (i === 2) throw new Error("table not found");
      return [i];
    },
    goNext: async () => true,
  });
  assert.deepEqual(items, [0, 1]);
});

test("goNext の throw は警告してそこまでの結果を返す", async () => {
  const items = await collectPaginated<number>({
    maxPages: 10,
    extractPage: async (i) => [i],
    goNext: async () => {
      throw new Error("click failed");
    },
  });
  assert.deepEqual(items, [0]);
});

test("extractPage が null を返したら追加せず打ち切る", async () => {
  const items = await collectPaginated<number>({
    maxPages: 10,
    extractPage: async (i) => (i === 1 ? null : [i]),
    goNext: async () => true,
  });
  assert.deepEqual(items, [0]);
});

test("isDone による早期終了（日数カウント型サイト）", async () => {
  const nextCalls: number[] = [];
  const items = await collectPaginated<number>({
    maxPages: 100,
    extractPage: async (i) => [i * 2, i * 2 + 1],
    goNext: async (i) => {
      nextCalls.push(i);
      return true;
    },
    isDone: (collected) => collected.length >= 4,
  });
  assert.deepEqual(items, [0, 1, 2, 3]);
  assert.deepEqual(nextCalls, [0]);
});

test("extract の throw で打ち切ると truncation イベントを記録する", async () => {
  resetPaginationEvents();
  const items = await collectPaginated<number>({
    label: "施設A",
    maxPages: 10,
    extractPage: async (i) => {
      if (i === 2) throw new Error("table not found");
      return [i];
    },
    goNext: async () => true,
  });
  assert.deepEqual(items, [0, 1]); // 打ち切り前の部分結果は残る
  const events = drainPaginationEvents();
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    label: "施設A",
    page: 3,
    phase: "extract",
    message: "table not found",
  });
});

test("goNext の throw で打ち切ると phase=goNext で記録する", async () => {
  resetPaginationEvents();
  await collectPaginated<number>({
    label: "施設B",
    maxPages: 10,
    extractPage: async (i) => [i],
    goNext: async (i) => {
      if (i === 1) throw new Error("next button gone");
      return true;
    },
  });
  const events = drainPaginationEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.phase, "goNext");
  assert.equal(events[0]?.page, 2);
});

test("正常終了なら truncation イベントは無い / drain でバッファが空になる", async () => {
  resetPaginationEvents();
  await collectPaginated<number>({
    maxPages: 3,
    extractPage: async (i) => [i],
    goNext: async () => true,
  });
  assert.equal(drainPaginationEvents().length, 0);
  assert.equal(drainPaginationEvents().length, 0);
});
