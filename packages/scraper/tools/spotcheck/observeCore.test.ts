import { test } from "node:test";
import assert from "node:assert/strict";
import { cellToSymbol } from "./observeCore.ts";

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

import { selectTarget } from "./observeCore.ts";

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
  const targets = [{ facilityName: "南大塚地域文化創造館" }, { facilityName: "巣鴨地域文化創造館" }];
  const selected = selectTarget(targets, facilityOf, "南大塚地域文化創造館", "第１会議室");
  assert.deepEqual(selected, { facilityName: "南大塚地域文化創造館" });
});

test("selectTarget は建物名が一致しなければ undefined を返す", () => {
  const targets = [{ facilityName: "南大塚地域文化創造館" }];
  assert.equal(selectTarget(targets, facilityOf, "存在しない館", "第１会議室"), undefined);
});
