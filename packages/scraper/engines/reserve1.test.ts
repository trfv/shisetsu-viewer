import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseMonth } from "./reserve1.ts";

const SELECT = `<select name="Ym_select" class="select01"><option value="202702">2027年02月</option><option value="202701" selected>2027年01月</option></select>`;

const HEADER = `<tr> <td class="item_base"><input type="button" value="01月04日(月)" onclick="SubmitDay('2027-01-04')" title="日別表示へ" class="btn_wek" /></td><td class="item_base" nowrap >09：00<br />～<br />12：00</td> <td class="item_base" nowrap >13：00<br />～<br />17：00</td> <td class="item_base" nowrap >17：30<br />～<br />21：00</td> </tr>`;

const CLOSED_DAY = `<table border="0" cellpadding="5" cellspacing="1" class="table_base"> <caption class="item_05" > 2027年01月01日(金)&nbsp;&nbsp;多目的室 元日&nbsp;&nbsp; 休館日</caption> <tr> </tr> <tr> <td class="item_base">多目的室１（定員24名）</td> <td class="item_base" width="300"></td> </tr> </table>`;

const OPEN_DAY = `<table border="0" cellpadding="5" cellspacing="1" class="table_base"> <caption class="item_05" > 2027年01月04日(月)&nbsp;&nbsp;多目的室 </caption> ${HEADER} <tr> <td class="item_base">多目的室１（定員24名）</td> <td class="koma_03_x" colspan="2"><img src="p_img/msg_icon01.gif" width="19" height="17" /></td> <td class="koma"><img src="p_img/msg_icon05.gif" width="19" height="17" /></td> </tr> </table>`;

describe("reserve1", () => {
  describe("parseMonth", () => {
    it("colspan のセルを区分ごとに展開し、部屋名から定員を外し、セレクトの月を返す", () => {
      assert.deepEqual(parseMonth(SELECT + OPEN_DAY, "202701"), {
        openMonths: ["202702", "202701"],
        slots: [
          {
            roomName: "多目的室１",
            date: "2027-01-04",
            division: "09:00-12:00",
            status: "msg_icon01.gif",
          },
          {
            roomName: "多目的室１",
            date: "2027-01-04",
            division: "13:00-17:00",
            status: "msg_icon01.gif",
          },
          {
            roomName: "多目的室１",
            date: "2027-01-04",
            division: "17:30-21:00",
            status: "msg_icon05.gif",
          },
        ],
      });
    });

    it("見出しの無い休館日は同じ月のほかの日の区分で休館日を埋める", () => {
      const { slots } = parseMonth(SELECT + CLOSED_DAY + OPEN_DAY, "202701");
      assert.deepEqual(
        slots.filter((s) => s.date === "2027-01-01"),
        ["09:00-12:00", "13:00-17:00", "17:30-21:00"].map((division) => ({
          roomName: "多目的室１",
          date: "2027-01-01",
          division,
          status: "休館日",
        }))
      );
    });

    it("要求と違う月の日が返ったら投げる", () => {
      assert.throws(() => parseMonth(SELECT + OPEN_DAY, "202702"), /202701 の日が返りました/);
    });

    it("コマ数が見出しと合わなければ投げる", () => {
      const broken = OPEN_DAY.replace(' colspan="2"', "");
      assert.throws(
        () => parseMonth(SELECT + broken, "202701"),
        /コマ数 2 が見出し 3 と合いません/
      );
    });
  });
});
