import assert from "node:assert/strict";
import { test } from "node:test";
import { collectPaginated } from "./paginate.ts";

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
