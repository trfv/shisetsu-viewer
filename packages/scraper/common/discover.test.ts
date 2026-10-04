import assert from "node:assert/strict";
import { test } from "node:test";

import { diffDiscovered, type DiscoveredTarget, isMusicLikely, roomLinkOf } from "./discover.ts";

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

function linkedCandidate(
  facilityName: string,
  roomName: string,
  roomLink: string
): DiscoveredTarget {
  return {
    ...candidate(facilityName, roomName),
    target: { facilityName, roomName, links: ["集会施設", facilityName, roomLink] },
  };
}

const NBSP = String.fromCodePoint(0xa0);

test("diffDiscovered: NBSP を含む空白の揺れは差分にしない", () => {
  const discovered = [candidate("滝野川会館", `大ホール${NBSP}（平土間）`)];
  const existing = [{ facilityName: "滝野川会館", roomName: "大ホール （平土間）" }];
  const { added, missing } = diffDiscovered(discovered, existing);
  assert.deepEqual(added, []);
  assert.deepEqual(missing, []);
});

test("diffDiscovered: roomName を据え置いた改称は遷移リンクで照合する", () => {
  const discovered = [
    linkedCandidate("北とぴあ", "つつじリハーサル室", "つつじリハーサル室（定員50名）"),
  ];
  const existing = [
    {
      facilityName: "北とぴあ",
      roomName: "つつじホールリハーサル室",
      roomLink: "つつじリハーサル室（定員50名）",
    },
  ];
  const { added, missing } = diffDiscovered(discovered, existing);
  assert.deepEqual(added, []);
  assert.deepEqual(missing, []);
});

test("diffDiscovered: 定員サフィックスだけの違いは前方一致で照合する", () => {
  const discovered = [linkedCandidate("赤羽会館", "講堂 (定員646名)", "講堂 (定員646名)")];
  const existing = [{ facilityName: "赤羽会館", roomName: "講堂", roomLink: "講堂" }];
  const { added, missing } = diffDiscovered(discovered, existing);
  assert.deepEqual(added, []);
  assert.deepEqual(missing, []);
});

test("diffDiscovered: 定員サフィックス以外が続く前方一致は別の室場とみなす", () => {
  const discovered = [linkedCandidate("北とぴあ", "展示ホール A", "展示ホール A（定員40名）")];
  const existing = [{ facilityName: "北とぴあ", roomName: "展示ホール", roomLink: "展示ホール" }];
  const { added, missing } = diffDiscovered(discovered, existing);
  assert.equal(added.length, 1);
  assert.deepEqual(missing, existing);
});

test("roomLinkOf: links 末尾の文字列だけを取り出す", () => {
  assert.equal(
    roomLinkOf({ links: ["集会施設", "北とぴあ", "次の一覧", "801会議室"] }),
    "801会議室"
  );
  assert.equal(roomLinkOf({ facilityName: "会館A" }), undefined);
  assert.equal(roomLinkOf({ links: [] }), undefined);
  assert.equal(roomLinkOf(null), undefined);
});
