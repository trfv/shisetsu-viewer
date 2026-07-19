import { test } from "node:test";
import assert from "node:assert/strict";
import { cellToSymbol, selectTarget } from "./observeCore.ts";

test("cellToSymbol はテキストを最優先で返す", () => {
  assert.equal(cellToSymbol({ text: "×", imgAlt: "", imgSrc: "" }), "×");
  assert.equal(cellToSymbol({ text: "○", imgAlt: "無視", imgSrc: "a.gif" }), "○");
  assert.equal(cellToSymbol({ text: "  空き  ", imgAlt: "", imgSrc: "" }), "空き");
});

test("cellToSymbol はテキストが無ければ alt を返す（江東区・大田区・荒川区が画像で表示する）", () => {
  assert.equal(
    cellToSymbol({ text: "", imgAlt: "予約あり", imgSrc: "image/lw_finishs.gif" }),
    "予約あり"
  );
  assert.equal(
    cellToSymbol({ text: "", imgAlt: "空いています", imgSrc: "icn_scche_ok.png" }),
    "空いています"
  );
  assert.equal(cellToSymbol({ text: "", imgAlt: "O", imgSrc: "timetable-o.gif" }), "O");
});

test("cellToSymbol は alt も無ければ src のファイル名を返す", () => {
  assert.equal(cellToSymbol({ text: "", imgAlt: "", imgSrc: "image/lw_sound.gif" }), "lw_sound");
  assert.equal(
    cellToSymbol({ text: "", imgAlt: "", imgSrc: "../img/std/common/icn_x.png" }),
    "icn_x"
  );
});

test("cellToSymbol は何も無ければ空文字を返す", () => {
  assert.equal(cellToSymbol({ text: "", imgAlt: "", imgSrc: "" }), "");
});

const facilityOf = (t: { facilityName: string }) => t.facilityName;

test("selectTarget は室名で絞り込む（北区のように室ごとに target がある場合）", () => {
  const targets = [
    { facilityName: "滝野川会館", roomName: "大ホール （平土間）" },
    { facilityName: "滝野川会館", roomName: "B201音楽スタジオ" },
    { facilityName: "赤羽会館", roomName: "講堂" },
  ];
  const selected = selectTarget(targets, facilityOf, "滝野川会館", "B201音楽スタジオ");
  assert.deepEqual(selected, { facilityName: "滝野川会館", roomName: "B201音楽スタジオ" });
});

test("selectTarget は室名が一致しなければ建物単位の先頭を返す（豊島区のように室を持たない場合）", () => {
  const targets = [
    { facilityName: "南大塚地域文化創造館" },
    { facilityName: "巣鴨地域文化創造館" },
  ];
  const selected = selectTarget(targets, facilityOf, "南大塚地域文化創造館", "第１会議室");
  assert.deepEqual(selected, { facilityName: "南大塚地域文化創造館" });
});

test("selectTarget は建物名が一致しなければ undefined を返す", () => {
  const targets = [{ facilityName: "南大塚地域文化創造館" }];
  assert.equal(selectTarget(targets, facilityOf, "存在しない館", "第１会議室"), undefined);
});

test("selectTarget は室名が建物名の部分文字列でも、建物名フィールドへの一致だけで誤選択しない", () => {
  // 「赤羽会館」という建物名は「赤羽」を含むが、roomName フィールドには
  // 「赤羽」を含む室が無い。facilityName の値（建物名）は照合対象から除外されるため
  // 室名としては一致せず、建物単位のフォールバック（先頭）が返る。
  const targets = [
    { facilityName: "赤羽会館", roomName: "講堂" },
    { facilityName: "赤羽会館", roomName: "第一和室" },
  ];
  const selected = selectTarget(targets, facilityOf, "赤羽会館", "赤羽");
  assert.deepEqual(selected, { facilityName: "赤羽会館", roomName: "講堂" });
});

test("selectTarget は建物名が facilityName 以外のフィールドにもある場合でも室名で正しく絞り込む（大田区の形）", () => {
  const targets = [
    {
      facilityName: "雪谷文化センター",
      roomName: "第二集会室",
      category: "集会室・会議室",
      buildingName: "雪谷文化センター",
    },
    {
      facilityName: "雪谷文化センター",
      roomName: "第一集会室",
      category: "集会室・会議室",
      buildingName: "雪谷文化センター",
    },
  ];
  const selected = selectTarget(targets, facilityOf, "雪谷文化センター", "第二集会室");
  assert.deepEqual(selected, {
    facilityName: "雪谷文化センター",
    roomName: "第二集会室",
    category: "集会室・会議室",
    buildingName: "雪谷文化センター",
  });
});

test("selectTarget は複数一致したときに console.warn で警告する", () => {
  const targets = [
    { facilityName: "X会館", roomName: "第１会議室" },
    { facilityName: "X会館", roomName: "第２会議室" },
  ];
  const warnCalls: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };
  try {
    const selected = selectTarget(targets, facilityOf, "X会館", "会議室");
    assert.deepEqual(selected, { facilityName: "X会館", roomName: "第１会議室" });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnCalls.length, 1);
  const message = warnCalls[0]?.join(" ") ?? "";
  assert.match(message, /X会館/);
  assert.match(message, /会議室/);
  assert.match(message, /2/);
});

test("selectTarget は文字列配列の要素からも室名を拾う（北区の links のような形）", () => {
  const targets = [
    {
      facilityName: "滝野川会館",
      roomId: "B201",
      links: ["集会施設", "滝野川会館", "B201音楽スタジオ"],
    },
    {
      facilityName: "滝野川会館",
      roomId: "A101",
      links: ["集会施設", "滝野川会館", "大ホール"],
    },
  ];
  const selected = selectTarget(targets, facilityOf, "滝野川会館", "B201音楽スタジオ");
  assert.deepEqual(selected, {
    facilityName: "滝野川会館",
    roomId: "B201",
    links: ["集会施設", "滝野川会館", "B201音楽スタジオ"],
  });
});
