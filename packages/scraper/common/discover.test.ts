import assert from "node:assert/strict";
import { test } from "node:test";
import { diffDiscovered, type DiscoveredTarget, isMusicLikely } from "./discover.ts";

function candidate(facilityName: string, roomName?: string): DiscoveredTarget {
  return {
    facilityName,
    ...(roomName !== undefined && { roomName }),
    musicLikely: isMusicLikely(facilityName, roomName),
    target: { facilityName, roomName },
  };
}

test("isMusicLikely: 音楽系の名称を検出する", () => {
  assert.equal(isMusicLikely("北とぴあ", "第1音楽スタジオ"), true);
  assert.equal(isMusicLikely("滝野川会館", "小ホール"), true);
  assert.equal(isMusicLikely("赤羽会館", "講堂"), true);
  assert.equal(isMusicLikely("文化センター", "リハーサル室"), true);
  assert.equal(isMusicLikely("区民館", "第一会議室"), false);
  assert.equal(isMusicLikely("ふれあい館", undefined), false);
});

test("diffDiscovered: 追加候補とサイト未発見を検出する", () => {
  const discovered = [candidate("会館A", "音楽室"), candidate("会館A", "和室"), candidate("会館B")];
  const existing = [
    { facilityName: "会館A", roomName: "音楽室" },
    { facilityName: "会館C", roomName: "ホール" },
  ];
  const { added, missing } = diffDiscovered(discovered, existing);
  assert.deepEqual(
    added.map((d) => `${d.facilityName}/${d.roomName ?? ""}`),
    ["会館A/和室", "会館B/"]
  );
  assert.deepEqual(missing, [{ facilityName: "会館C", roomName: "ホール" }]);
});
