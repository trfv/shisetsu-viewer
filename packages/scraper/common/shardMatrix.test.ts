import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShardMatrix,
  countTestsByMunicipality,
  shardMatrixFromListOutput,
} from "./shardMatrix.ts";

const SAMPLE = `Listing tests:
  kanagawa-kawasaki/index.test.ts:6:3 › 国際交流センター
  kanagawa-kawasaki/index.test.ts:6:3 › すくらむ２１
  tokyo-chuo/index.test.ts:6:3 › アートはるみ 音楽室
  tokyo-koutou/index.test.ts:6:3 › 総合区民センター 第一和室
  tokyo-koutou/index.test.ts:6:3 › 総合区民センター 第二和室
  tokyo-koutou/index.test.ts:6:3 › 東大島文化センター 第一音楽室
Total: 6 tests in 3 files`;

describe("countTestsByMunicipality", () => {
  it("自治体別にテスト数を数える", () => {
    const counts = countTestsByMunicipality(SAMPLE);
    assert.equal(counts.get("kanagawa-kawasaki"), 2);
    assert.equal(counts.get("tokyo-chuo"), 1);
    assert.equal(counts.get("tokyo-koutou"), 3);
    assert.equal(counts.size, 3);
  });

  it("Total 行やヘッダを数えない", () => {
    const counts = countTestsByMunicipality(SAMPLE);
    assert.equal(
      [...counts.values()].reduce((a, b) => a + b, 0),
      6
    );
  });

  it("空入力なら空 Map", () => {
    assert.equal(countTestsByMunicipality("").size, 0);
  });
});

describe("buildShardMatrix", () => {
  it("density で割ってシャード数を決め、自治体名でソートする", () => {
    const counts = new Map([
      ["tokyo-koutou", 3],
      ["kanagawa-kawasaki", 2],
      ["tokyo-chuo", 1],
    ]);
    const matrix = buildShardMatrix(counts, 2);
    assert.deepEqual(matrix, [
      { municipality: "kanagawa-kawasaki", shardIndex: 1, shardTotal: 1 },
      { municipality: "tokyo-chuo", shardIndex: 1, shardTotal: 1 },
      { municipality: "tokyo-koutou", shardIndex: 1, shardTotal: 2 },
      { municipality: "tokyo-koutou", shardIndex: 2, shardTotal: 2 },
    ]);
  });

  it("テスト 0 件の自治体は matrix に現れない（空シャード排除）", () => {
    const counts = new Map([
      ["tokyo-koutou", 5],
      ["tokyo-sumida", 0],
    ]);
    const matrix = buildShardMatrix(counts, 5);
    assert.deepEqual(
      matrix.map((e) => e.municipality),
      ["tokyo-koutou"]
    );
  });

  it("density=5 で 50 件なら 10 シャード", () => {
    const matrix = buildShardMatrix(new Map([["tokyo-koutou", 50]]), 5);
    assert.equal(matrix.length, 10);
    assert.ok(matrix.every((e) => e.shardTotal === 10));
    assert.deepEqual(
      matrix.map((e) => e.shardIndex),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    );
  });

  it("端数は切り上げる（7 件 / density 5 → 2 シャード）", () => {
    const matrix = buildShardMatrix(new Map([["tokyo-koutou", 7]]), 5);
    assert.equal(matrix.length, 2);
  });

  it("不正な density は例外", () => {
    assert.throws(() => buildShardMatrix(new Map(), 0));
    assert.throws(() => buildShardMatrix(new Map(), -1));
    assert.throws(() => buildShardMatrix(new Map(), 1.5));
  });
});

describe("shardMatrixFromListOutput", () => {
  it("--list 出力から end-to-end で matrix を得る", () => {
    const matrix = shardMatrixFromListOutput(SAMPLE, 2);
    assert.deepEqual(matrix, [
      { municipality: "kanagawa-kawasaki", shardIndex: 1, shardTotal: 1 },
      { municipality: "tokyo-chuo", shardIndex: 1, shardTotal: 1 },
      { municipality: "tokyo-koutou", shardIndex: 1, shardTotal: 2 },
      { municipality: "tokyo-koutou", shardIndex: 2, shardTotal: 2 },
    ]);
  });
});
