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
