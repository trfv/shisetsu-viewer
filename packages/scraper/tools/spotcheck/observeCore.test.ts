import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cellToSymbol,
  selectTarget,
  findRoomRow,
  normalizeLabel,
  findDateColumn,
  isDateDisplayed,
  extractCells,
  type RawTable,
} from "./observeCore.ts";

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

const cell = (text: string): { text: string; imgAlt: string; imgSrc: string } => ({
  text,
  imgAlt: "",
  imgSrc: "",
});

test("findRoomRow は先頭セルが室名を含む行とヘッダを返す", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("2026年7月19日"), cell("午前"), cell("午後"), cell("夜間")],
        [cell("第１会議室"), cell("○"), cell("×"), cell("×")],
        [cell("第２会議室"), cell("×"), cell("○"), cell("○")],
      ],
    },
  ];
  assert.deepEqual(findRoomRow(tables, "第２会議室"), {
    header: ["2026年7月19日", "午前", "午後", "夜間"],
    cells: ["第２会議室", "×", "○", "○"],
  });
});

test("findRoomRow は先頭セルが建物名を含んでも部分一致で拾う（荒川区の形式）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell(""), cell("09:00 ～ 12:00"), cell("12:15 ～ 15:15")],
        [cell("石浜ふれあい館 ３階和室２"), cell("Ｘ"), cell("Ｏ")],
      ],
    },
  ];
  const found = findRoomRow(tables, "３階和室２");
  assert.deepEqual(found?.cells, ["石浜ふれあい館 ３階和室２", "Ｘ", "Ｏ"]);
});

test("findRoomRow は複数の表をまたいで探す（江東区は区分数ごとに表が分かれる）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("日付"), cell("午前")],
        [cell("大研修室"), cell("×")],
      ],
    },
    {
      rows: [
        [cell("日付"), cell("①"), cell("②")],
        [cell("音楽スタジオ"), cell("×"), cell("○")],
      ],
    },
  ];
  assert.deepEqual(findRoomRow(tables, "音楽スタジオ"), {
    header: ["日付", "①", "②"],
    cells: ["音楽スタジオ", "×", "○"],
  });
});

test("findRoomRow は見つからなければ undefined を返す", () => {
  const tables: RawTable[] = [{ rows: [[cell("日付")], [cell("大研修室"), cell("×")]] }];
  assert.equal(findRoomRow(tables, "音楽スタジオ"), undefined);
});

test("findRoomRow は複数の行が室名を含むとき console.warn で警告する", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("日付"), cell("午前")],
        [cell("第１会議室"), cell("○")],
        [cell("第１会議室控室"), cell("×")],
      ],
    },
  ];
  const warnCalls: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };
  try {
    const found = findRoomRow(tables, "第１会議室");
    assert.deepEqual(found, { header: ["日付", "午前"], cells: ["第１会議室", "○"] });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnCalls.length, 1);
  const message = warnCalls[0]?.join(" ") ?? "";
  assert.match(message, /第１会議室/);
  assert.match(message, /2/);
});

test("findRoomRow は 1 件だけ一致するとき console.warn を呼ばない", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("日付"), cell("午前")],
        [cell("第１会議室"), cell("○")],
        [cell("第２会議室"), cell("×")],
      ],
    },
  ];
  const warnCalls: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };
  try {
    findRoomRow(tables, "第１会議室");
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnCalls.length, 0);
});

test("normalizeLabel は全角数字を半角にする", () => {
  assert.equal(normalizeLabel("１９日"), "19日");
});

test("normalizeLabel は範囲記号（～ 〜 - − ー）を - に統一する", () => {
  assert.equal(normalizeLabel("9:00～12:00"), "9:00-12:00");
  assert.equal(normalizeLabel("9:00〜12:00"), "9:00-12:00");
  assert.equal(normalizeLabel("9:00-12:00"), "9:00-12:00");
  assert.equal(normalizeLabel("9:00−12:00"), "9:00-12:00");
  assert.equal(normalizeLabel("9:00ー12:00"), "9:00-12:00");
});

test("normalizeLabel は空白のゆれを吸収する（観測側は空白も落とす）", () => {
  assert.equal(normalizeLabel("09:00 - 12:00"), normalizeLabel("09:00-12:00"));
  assert.equal(normalizeLabel(" 午前 "), "午前");
});

test("findDateColumn は豊島区の形（月表題＋定員列）で対象日の列を返す", () => {
  const header = ["2026年7月", "定員", "19 日", "20 月", "21 火", "22 水"];
  assert.equal(findDateColumn(header, "2026-07-19"), 2);
});

test("findDateColumn は江戸川区の形で index 0 の表題に誤って一致しない", () => {
  const header = ["2026/7/19(日)～", "定員", "7/19 日", "7/20 月", "7/21 火"];
  assert.equal(findDateColumn(header, "2026-07-19"), 2);
});

test("findDateColumn は大田区の形（表題無し・月省略）で対象日の列を返す", () => {
  const header = ["", "7月19日 日", "7月20日 月", "7月21日 火"];
  assert.equal(findDateColumn(header, "2026-07-19"), 1);
});

test("findDateColumn は対象日が無ければ undefined を返す", () => {
  const header = ["", "7月19日 日", "7月20日 月"];
  assert.equal(findDateColumn(header, "2026-08-01"), undefined);
});

test("findDateColumn は月が違うセルには一致しない", () => {
  const header = ["", "6/19 日"];
  assert.equal(findDateColumn(header, "2026-07-19"), undefined);
});

test("isDateDisplayed は西暦年号の月日表記を拾う（江東区の形）", () => {
  assert.equal(isDateDisplayed("2026 年 7月22日(水) 午前 午後 夜間", "2026-07-22"), true);
});

test("isDateDisplayed はゼロ埋めの月日表記を拾う（荒川区の形 令和08年07月22日）", () => {
  assert.equal(isDateDisplayed("利用日 令和08年07月22日", "2026-07-22"), true);
});

test("isDateDisplayed は対象日でない着地日を表示しているとき false（北区が 7/22 の締切超過で 7/23 に飛んだ形）", () => {
  assert.equal(isDateDisplayed("利用日 令和 8年 7月23日 (木)", "2026-07-22"), false);
});

test("isDateDisplayed はスラッシュ表記も拾う", () => {
  assert.equal(isDateDisplayed("対象日 7/22 の空き状況", "2026-07-22"), true);
});

test("isDateDisplayed は別の月の同じ日には一致しない", () => {
  assert.equal(isDateDisplayed("6月22日", "2026-07-22"), false);
});

test("isDateDisplayed はスラッシュ表記が別の数字の一部のときは一致しない", () => {
  assert.equal(isDateDisplayed("17/220", "2026-07-22"), false);
});

test("findRoomRow は複数のヘッダ行が混在する表で、一致行と同じセル数の直近のヘッダを選ぶ（江東区の形）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("2026 年 7月19日(日)"), cell("午前"), cell("午後"), cell("夜間")],
        [cell("大研修室"), cell("予約あり"), cell("予約あり"), cell("予約あり")],
        [cell("第２会議室"), cell("予約あり"), cell("予約あり"), cell("空き")],
        [cell("第３研修室"), cell("音出し"), cell("予約あり"), cell("音出し")],
        [cell("第１和室"), cell("音出し"), cell("音出し"), cell("空き")],
        [cell("第２和室"), cell("空き"), cell("音出し"), cell("音出し")],
        [
          cell("2026 年 7月19日(日)"),
          cell("①"),
          cell("②"),
          cell("③"),
          cell("④"),
          cell("⑤"),
          cell("⑥"),
        ],
        [
          cell("音楽スタジオ"),
          cell("予約あり"),
          cell("予約あり"),
          cell("予約あり"),
          cell("予約あり"),
          cell("予約あり"),
          cell("予約あり"),
        ],
      ],
    },
  ];
  const found = findRoomRow(tables, "音楽スタジオ");
  assert.deepEqual(found?.header, ["2026 年 7月19日(日)", "①", "②", "③", "④", "⑤", "⑥"]);
  assert.deepEqual(found?.cells, [
    "音楽スタジオ",
    "予約あり",
    "予約あり",
    "予約あり",
    "予約あり",
    "予約あり",
    "予約あり",
  ]);
});

const KOUTOU_DIVISION_LABELS = ["午前", "午後", "夜間", "①", "②", "③", "④", "⑤", "⑥"];

test("extractCells は類型A（行=室、列=区分）を判別する（江東区の形）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("2026 年 7月19日(日)"), cell("午前"), cell("午後"), cell("夜間")],
        [cell("大研修室"), cell("予約あり"), cell("予約あり"), cell("予約あり")],
        [cell("第２会議室"), cell("予約あり"), cell("予約あり"), cell("空き")],
      ],
    },
  ];
  const result = extractCells(tables, KOUTOU_DIVISION_LABELS, "第２会議室", "2026-07-19");
  assert.equal(result.layout, "divisionColumn");
  assert.deepEqual(result.cells, [
    { divisionLabel: "午前", symbol: "予約あり" },
    { divisionLabel: "午後", symbol: "予約あり" },
    { divisionLabel: "夜間", symbol: "空き" },
  ]);
});

const KITA_DIVISION_LABELS = [
  "9:00-12:00",
  "13:00-17:00",
  "18:00-22:00",
  "9:30-11:30",
  "12:00-14:00",
  "14:30-16:30",
  "17:00-19:00",
  "19:30-21:30",
];

test("extractCells は類型B（室名列が無い。ヘッダ=区分、次の行=値）を判別する（北区の形）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("9:30-11:30"), cell("12:00-14:00"), cell("14:30-16:30"), cell("17:00-19:00")],
        [cell("-"), cell("×"), cell("×"), cell("○")],
        [cell("19:30-21:30")],
        [cell("○")],
      ],
    },
    {
      rows: [
        [cell("○"), cell("空き（先着順）"), cell("休館"), cell("休館時間")],
        [cell("×"), cell("予約済み"), cell("開放"), cell("個人貸し出し")],
      ],
    },
  ];
  const result = extractCells(tables, KITA_DIVISION_LABELS, "B201音楽スタジオ", "2026-07-19");
  assert.equal(result.layout, "singleRoomDivisionColumn");
  assert.deepEqual(result.cells, [
    { divisionLabel: "9:30-11:30", symbol: "-" },
    { divisionLabel: "12:00-14:00", symbol: "×" },
    { divisionLabel: "14:30-16:30", symbol: "×" },
    { divisionLabel: "17:00-19:00", symbol: "○" },
    { divisionLabel: "19:30-21:30", symbol: "○" },
  ]);
});

test("extractCells は類型Bで表内に複数の区分ブロックが積まれても全ブロックを読む（北区・滝野川会館の実データ、table0）", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("9:30-11:30"), cell("12:00-14:00"), cell("14:30-16:30"), cell("17:00-19:00")],
        [cell("-"), cell("×"), cell("×"), cell("○")],
        [cell("19:30-21:30"), cell(""), cell(""), cell("")],
        [cell("○"), cell(""), cell(""), cell("")],
      ],
    },
    {
      rows: [
        [cell("○"), cell("空き（先着順）"), cell("休館"), cell("休館時間")],
        [cell("×"), cell("予約済み"), cell("開放"), cell("個人貸し出し")],
        [cell("抽選"), cell("抽選参加申込（カッコ内は申込数）"), cell("保守"), cell("施設保守日")],
        [cell("確認中"), cell("抽選確認中"), cell("-"), cell("期間外")],
        [cell(""), cell("")],
      ],
    },
  ];
  const result = extractCells(tables, KITA_DIVISION_LABELS, "B201音楽スタジオ", "2026-07-19");
  assert.equal(result.layout, "singleRoomDivisionColumn");
  assert.equal(result.cells.length, 5);
  assert.deepEqual(
    result.cells.find((c) => c.divisionLabel === "19:30-21:30"),
    { divisionLabel: "19:30-21:30", symbol: "○" }
  );
  assert.deepEqual(result.cells, [
    { divisionLabel: "9:30-11:30", symbol: "-" },
    { divisionLabel: "12:00-14:00", symbol: "×" },
    { divisionLabel: "14:30-16:30", symbol: "×" },
    { divisionLabel: "17:00-19:00", symbol: "○" },
    { divisionLabel: "19:30-21:30", symbol: "○" },
  ]);
});

test("extractCells は類型C（行=区分、列=日付）を判別する（大田区の形）", () => {
  const OTA_DIVISION_LABELS = ["午前", "午後", "午後1", "午後2", "夜間", "夜間1", "夜間2"];
  const tables: RawTable[] = [
    {
      rows: [
        [cell(""), cell("7月19日 日"), cell("7月20日 月"), cell("7月21日 火")],
        [cell("09:00 - 12:00"), cell("空いています"), cell("空いています"), cell("予約済みです")],
        [cell("13:00 - 17:00"), cell("予約済みです"), cell("予約済みです"), cell("予約済みです")],
        [cell("18:00 - 22:00"), cell("空いています"), cell("予約済みです"), cell("空いています")],
      ],
    },
  ];
  const result = extractCells(tables, OTA_DIVISION_LABELS, "第二集会室", "2026-07-19");
  assert.equal(result.layout, "divisionRow");
  assert.deepEqual(result.cells, [
    { divisionLabel: "09:00 - 12:00", symbol: "空いています" },
    { divisionLabel: "13:00 - 17:00", symbol: "予約済みです" },
    { divisionLabel: "18:00 - 22:00", symbol: "空いています" },
  ]);
});

test("extractCells は類型D（行=室、列=日付、区分はフィルタで切り替え）をフィルタ区分ラベルで抽出する（豊島区の形）", () => {
  const TOSHIMA_DIVISION_LABELS = ["午前", "午後", "夜間"];
  const tables: RawTable[] = [
    {
      rows: [
        [
          cell("2026年7月"),
          cell("定員"),
          cell("19 日"),
          cell("20 月"),
          cell("21 火"),
          cell("22 水"),
        ],
        [
          cell("第１会議室 …楽器制限あり"),
          cell("80人"),
          cell("－"),
          cell("－"),
          cell("－"),
          cell("－"),
        ],
      ],
    },
  ];
  const result = extractCells(tables, TOSHIMA_DIVISION_LABELS, "第１会議室", "2026-07-19", "午前");
  assert.equal(result.layout, "dateColumn");
  assert.deepEqual(result.cells, [{ divisionLabel: "午前", symbol: "－" }]);
});

test("extractCells は類型Dで日付列が見つからなければ空を返す", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("2026年7月"), cell("定員"), cell("19 日"), cell("20 月")],
        [cell("第１会議室"), cell("80人"), cell("－"), cell("－")],
      ],
    },
  ];
  const result = extractCells(tables, ["午前"], "第１会議室", "2026-09-01", "午前");
  assert.equal(result.layout, "dateColumn");
  assert.deepEqual(result.cells, []);
});

test("extractCells はどの類型にも該当しない表に layout=none を返す", () => {
  const tables: RawTable[] = [
    {
      rows: [
        [cell("お知らせ"), cell("詳細")],
        [cell("メンテナンス情報"), cell("下記日程は休館します")],
      ],
    },
  ];
  const result = extractCells(tables, ["午前", "午後"], "第１会議室", "2026-07-19");
  assert.equal(result.layout, "none");
  assert.deepEqual(result.cells, []);
});

test("extractCells は凡例の表を空き状況の表と誤認しない（北区の形。罠1）", () => {
  const KITA_DIVISION_LABELS_SUBSET = ["9:00-12:00", "13:00-17:00", "18:00-22:00", "9:30-11:30"];
  const tables: RawTable[] = [
    {
      rows: [
        [cell("○"), cell("空き（先着順）"), cell("休館"), cell("休館時間")],
        [cell("×"), cell("予約済み"), cell("開放"), cell("個人貸し出し")],
      ],
    },
  ];
  const result = extractCells(
    tables,
    KITA_DIVISION_LABELS_SUBSET,
    "B201音楽スタジオ",
    "2026-07-19"
  );
  assert.deepEqual(result.cells, []);
});
