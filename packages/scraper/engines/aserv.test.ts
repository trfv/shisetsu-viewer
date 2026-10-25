import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCalendar } from "./aserv.ts";

const PRACTICE_ROOM = `<div id="calBox"> <div class="clearfix h_calList"><div class="h_shisetsuName">施設名</div><div class="h_time_col">9</div><div class="h_time_col_3">午前<br />9:00-12:00</div><div class="h_time_col">12</div><div class="h_time_col_4">午後<br />12:20-15:20</div><div class="h_time_col_4">午後<br />15:40-18:40</div><div class="h_time_col">19</div><div class="h_time_col_3">夜間<br />19:00-22:00</div><div class="h_time">22</div></div><div class="clearfix calList"> <div class="shisetsuName">練習室１</div> <div class="time3" title="66:20261108:0" id="stFuka" ></div><div class="time3bun11 rest" title="" id="stDateFuka" ></div><div class="time3" title="66:20261108:1" id="" ></div><div class="time3bun12 rest" title="" id="" ></div><div class="time3" title="66:20261108:2" id="stDateFuka" ></div><div class="time3bun11 rest" title="" id="" ></div><div class="time3end" title="66:20261108:3" id="enDateFuka" ></div></div> <div class="clearfloat"></div> </div> <table id="basketT"></table>`;

const HOURLY_ROOM = `<div class="clearfix h_calList"><div class="h_shisetsuNameJ">施設名</div><div class="h_time_col">8</div><div class="h_time_col">9</div><div class="h_time">10</div></div><div class="clearfix calList"> <div class="shisetsuNameJ">練習室Ａ</div> <div title="44:20261210:0" class="time" id="stFuka"></div> <div title="44:20261210:1" class="timeend" id=""></div> </div>`;

describe("aserv", () => {
  describe("parseCalendar", () => {
    it("見出しの時刻をコマ番号に当て、休憩の div は飛ばし、空の id は none にする", () => {
      assert.deepEqual(parseCalendar(PRACTICE_ROOM, "20261108"), [
        {
          roomName: "練習室１",
          cells: [
            { division: "9:00-12:00", status: "stFuka" },
            { division: "12:20-15:20", status: "none" },
            { division: "15:40-18:40", status: "stDateFuka" },
            { division: "19:00-22:00", status: "enDateFuka" },
          ],
        },
      ]);
    });

    it("時間貸しの区分は時刻の目盛りから 1 時間刻みのコマ名を作り、title が先の属性順も読む", () => {
      assert.deepEqual(parseCalendar(HOURLY_ROOM, "20261210"), [
        {
          roomName: "練習室Ａ",
          cells: [
            { division: "8:00-9:00", status: "stFuka" },
            { division: "9:00-10:00", status: "none" },
          ],
        },
      ]);
    });

    it("受付期間より先で部屋の行が無ければ空配列を返す", () => {
      const html = `<div class="clearfix h_calList"><div class="h_shisetsuName">施設名</div></div><div class="clearfloat"></div>`;
      assert.deepEqual(parseCalendar(html, "20270501"), []);
    });

    it("要求と違う日のコマが返ったら投げる", () => {
      assert.throws(() => parseCalendar(PRACTICE_ROOM, "20261109"), /20261108 のコマが返りました/);
    });
  });
});
