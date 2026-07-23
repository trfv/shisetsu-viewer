// spot check の観測ロジックのうち、Playwright に依存しない部分。
// スクレイパーの extract / transform / STATUS_MAP は参照しない（盲検の線引き）。
// 判定に使う記号表は symbolMap.ts にあり、ここでは記号を「決める」だけで「解釈しない」。

/** page.evaluate がセルから機械的に集める 3 値 */
export interface RawCell {
  text: string;
  imgAlt: string;
  imgSrc: string;
}

/**
 * セルの生記号を決める。テキスト → 画像の alt → 画像ファイル名の順に採用する。
 * 画像で空き状況を表すサイト（江東区・大田区・荒川区）では alt が
 * 人間の読み取る内容と一致するため、alt を src より優先する。
 */
export function cellToSymbol(cell: RawCell): string {
  const text = cell.text.trim();
  if (text) return text;
  const alt = cell.imgAlt.trim();
  if (alt) return alt;
  const src = cell.imgSrc.trim();
  if (!src) return "";
  const fileName = src.split("/").pop() ?? "";
  return fileName.replace(/\.[^.]+$/, "");
}

/**
 * plan の建物名・室名から観測対象の target を選ぶ。
 *
 * 自治体によって target の粒度が違う（北区は室ごと、豊島区は建物ごと）。
 * 建物名で絞ったあと室名の部分一致を試し、一致が無ければ建物単位の
 * target とみなして先頭を返す。
 *
 * 室名の照合は target の文字列値・文字列配列要素を対象にするが、
 * `facilityOf(t)`（＝建物名）と等しい値は対象から除外する。除外しないと、
 * 室名が建物名の部分文字列であるだけで室名フィールドを見ずに全 target が
 * マッチしてしまい、spot check が検出すべき silent failure を見逃す。
 * 複数一致した場合は誤選択の可能性があるため console.warn で警告する。
 */
export function selectTarget<T>(
  targets: readonly T[],
  facilityOf: (t: T) => string,
  buildingName: string,
  roomName: string
): T | undefined {
  const inBuilding = targets.filter((t) => facilityOf(t) === buildingName);
  if (inBuilding.length === 0) return undefined;

  const byRoom = inBuilding.filter((t) => matchesRoom(t, buildingName, roomName));
  if (byRoom.length > 1) {
    console.warn(
      `selectTarget: 建物「${buildingName}」室名「${roomName}」に ${byRoom.length} 件一致。先頭を採用します。`
    );
  }
  return byRoom[0] ?? inBuilding[0];
}

/**
 * target の文字列値・文字列配列要素の中に roomName を含むものがあるかを調べる。
 * buildingName と等しい値は建物名フィールド（facilityName/buildingName 等）とみなし除外する。
 */
function matchesRoom<T>(target: T, buildingName: string, roomName: string): boolean {
  for (const value of Object.values(target as object)) {
    if (typeof value === "string") {
      if (value !== buildingName && value.includes(roomName)) return true;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item !== buildingName && item.includes(roomName)) {
          return true;
        }
      }
    }
  }
  return false;
}

/** page.evaluate が集めた 1 つの表 */
export interface RawTable {
  rows: RawCell[][];
}

/**
 * 区分ラベル照合の表記ゆれを吸収する。judgeReport.ts の normalizeDivisionLabel と
 * 同じ方針（全角数字→半角、範囲記号の統一、前後空白の除去）だが、観測側は空白も
 * 落とす（「09:00 - 12:00」と「09:00-12:00」を同一視するため）。
 */
export function normalizeLabel(label: string): string {
  const halfWidth = label.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  return halfWidth
    .replace(/[～〜\-−ー]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * ヘッダ行から対象日の列インデックスを返す。
 *
 * 日付セルは「数字 + 曜日」の形をとる（「19 日」「7/19 日」「7月19日 日」）。
 * 曜日文字の有無を手掛かりにし、末尾の数字を日、その手前の数字があれば月として扱う。
 *
 * index 0 は表題（「2026年7月」「2026/7/19(日)～」）が入るため常に除外する。
 * 除外しないと江戸川区の表題「2026/7/19(日)～」が日付セルとして先に一致してしまう。
 */
export function findDateColumn(header: readonly string[], isoDate: string): number | undefined {
  const parts = isoDate.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  for (let i = 1; i < header.length; i++) {
    const cell = header[i] ?? "";
    if (!/[日月火水木金土]/.test(cell)) continue;
    const numbers = [...cell.matchAll(/\d+/g)].map((m) => Number(m[0]));
    if (numbers.length === 0) continue;
    const cellDay = numbers[numbers.length - 1];
    if (cellDay !== day) continue;
    const cellMonth = numbers.length >= 2 ? numbers[numbers.length - 2] : undefined;
    if (cellMonth !== undefined && cellMonth !== month) continue;
    return i;
  }
  return undefined;
}

/**
 * 対象日がページに表示されているかを bodyText から確かめる。
 *
 * 類型A（行=室・列=区分）と類型B（室名列なし・ヘッダ=区分）は単一日を表示し、
 * 列に日付が無いため findDateColumn で対象日の列を検証できない。openreaf 系
 * （北区・中央区）は対象日の申込締切が過ぎているとサイトが次の予約可能日へ
 * 自動で飛ぶため、放置すると着地日の区分を対象日の値として読み、judge が
 * 別日の値を突き合わせて偽 MISMATCH を出す（2026-07-22 の検証で北区が実際に
 * 7/23 に着地して発覚）。月日の表記（「7月22日」「07月22日」「7/22」）の
 * いずれかが本文にあれば表示されているとみなす。年号（西暦・令和）は形式が
 * サイトによって違うので問わず、月日部分だけで判定する。
 */
export function isDateDisplayed(bodyText: string, isoDate: string): boolean {
  const parts = isoDate.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return false;
  const kanji = new RegExp(`0*${month}\\s*月\\s*0*${day}\\s*日`);
  const slash = new RegExp(`(?:^|[^0-9])0*${month}\\s*/\\s*0*${day}(?![0-9])`);
  return kanji.test(bodyText) || slash.test(bodyText);
}

/**
 * 室名を含む行と、その表のヘッダ行を返す。
 *
 * 行の先頭セルは自治体によって形式が違う（「第１会議室」だけの場合と
 * 「石浜ふれあい館 ３階和室２」のように建物名を含む場合がある）ため、
 * 完全一致ではなく部分一致で探す。
 * 江東区は区分数の異なる表が同じページに並ぶため、全ての表を走査する。
 *
 * 部分一致であるため、同一表内に複数の行が室名を含む可能性がある
 * （例:「第１会議室」で検索したとき「第１会議室」と「第１会議室控室」が
 * 両方ある場合）。その場合は最初に見つかった行を返しつつ console.warn で
 * 警告する。selectTarget の複数一致警告と同じ方針。
 *
 * ヘッダ行は必ずしも table.rows[0] ではない。江東区は 1 つの表に区分数の
 * 異なるヘッダ+室グループが複数並ぶ（4 セルのヘッダ+室が 5 行続いた後、
 * 7 セルのヘッダ+室が続く、等）。そのため、一致した室の行より前にある
 * 「ヘッダ候補」のうち、セル数が一致する最も近いものをヘッダとして採用する。
 *
 * ヘッダ候補は table.rows[0]、またはセル数が直前の行と異なる行（新しい
 * 区分グループの境界）に限る。単に「セル数が同じ最も近い行」だけで探すと、
 * 単一ヘッダの通常の表（全行が同じセル数）で室のすぐ上のデータ行を
 * ヘッダと誤認してしまう。境界行に限ることで、通常の表では自然に
 * table.rows[0] に落ち着き、江東区のような混在ヘッダでは正しい区分グループの
 * ヘッダを選べる。該当する境界行が無ければ従来どおり table.rows[0] を使う。
 */
export function findRoomRow(
  tables: readonly RawTable[],
  roomName: string
): { header: string[]; cells: string[] } | undefined {
  for (const table of tables) {
    const candidates = table.rows
      .map((row, index) => ({ row, index }))
      .slice(1)
      .filter(({ row }) => {
        const first = row[0];
        return first !== undefined && cellToSymbol(first).includes(roomName);
      });
    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      console.warn(
        `findRoomRow: 室名「${roomName}」に ${candidates.length} 件一致。先頭を採用します。`
      );
    }
    const first = candidates[0];
    if (!first) continue;
    const { row, index } = first;

    let header = table.rows[0];
    for (let j = index - 1; j >= 0; j--) {
      const current = table.rows[j];
      if (current === undefined) continue;
      const previous = j > 0 ? table.rows[j - 1] : undefined;
      const isBoundary = j === 0 || previous === undefined || previous.length !== current.length;
      if (isBoundary && current.length === row.length) {
        header = current;
        break;
      }
    }
    if (!header) continue;

    return {
      header: header.map(cellToSymbol),
      cells: row.map(cellToSymbol),
    };
  }
  return undefined;
}

/** どの類型として表を読んだか。note に残して人が検証できるようにする。 */
export type TableLayout =
  | "divisionColumn"
  | "singleRoomDivisionColumn"
  | "divisionRow"
  | "dateColumn"
  | "none";

export interface ExtractedCells {
  cells: { divisionLabel: string; symbol: string }[];
  /** どの類型として読んだか。note に残して人が検証できるようにする */
  layout: TableLayout;
}

/**
 * ヘッダ/行ラベルのセルが「区分ラベルらしい」かを判定する。
 *
 * plan.json の divisionLabels（shared registry の表示ラベル）への正規化一致を
 * 基本とするが、それだけでは足りない。registry の表示ラベルは自治体ごとに
 * 「午前」のような抽象名の場合と「9:00-12:00」のような時刻表記そのものの場合が
 * 混在する（例: 大田区・中央区は抽象名、北区は時刻表記）。サイトの実表示が
 * 時刻表記の自治体では、抽象名の registry ラベルと文字列としては一致しない
 * （大田区の実データで確認済み。詳細は task-5-report.md の deviation 記録を参照）。
 * そのため、時刻範囲の形（「9:00-12:00」等）も区分ラベルとして扱う。
 * 記号表（symbolMap.ts）や DIVISION_MAP は参照しない。あくまで文字列の形の話。
 */
const TIME_RANGE_PATTERN = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;

function looksLikeDivisionLabel(
  cell: string,
  normalizedDivisionLabels: ReadonlySet<string>
): boolean {
  const normalized = normalizeLabel(cell);
  if (!normalized) return false;
  return normalizedDivisionLabels.has(normalized) || TIME_RANGE_PATTERN.test(normalized);
}

/**
 * 表の集合から観測セルを抽出する。表の類型（4 種）は区分ラベルとの照合を軸に
 * 自動判別する。戦略（区分フィルタを操作したかどうか）は呼び出し側
 * （observe.ts）の責務であり、ここでは filterLabel の有無だけで分岐する。
 *
 * 1. filterLabel が指定された場合（区分フィルタで絞った表を渡された場合）は
 *    無条件に類型D（dateColumn）として扱う。室の行と対象日の列を特定し、
 *    その 1 セルを filterLabel と対にする。
 * 2. 指定が無い場合は表の形から自動判別する。
 *    - 室の行が見つかり、そのヘッダに区分ラベルが 2 つ以上あれば類型A（divisionColumn）
 *    - 室の行が見つからない場合、ヘッダ（表の先頭行）に区分ラベルが 2 つ以上あり、
 *      次の行が値の行としてある表があれば類型B（singleRoomDivisionColumn）
 *      （凡例の表はヘッダが区分ラベルに一致しないため選ばれない）
 *    - 先頭列に区分ラベルが 2 つ以上ある表があれば類型C（divisionRow）。
 *      対象日の列は findDateColumn で特定する
 *
 * 複数の表が該当する場合は最初に該当した表を使う。どの表も該当しなければ
 * 空の cells を返す。
 */
export function extractCells(
  tables: readonly RawTable[],
  divisionLabels: readonly string[],
  roomName: string,
  isoDate: string,
  filterLabel?: string
): ExtractedCells {
  const normalizedDivisionLabels = new Set(divisionLabels.map(normalizeLabel));

  // 類型D: 区分フィルタで絞った表。呼び出し側の指定に従う。
  if (filterLabel !== undefined) {
    const found = findRoomRow(tables, roomName);
    if (!found) return { cells: [], layout: "dateColumn" };
    const dateColumn = findDateColumn(found.header, isoDate);
    if (dateColumn === undefined) return { cells: [], layout: "dateColumn" };
    const symbol = found.cells[dateColumn];
    if (symbol === undefined) return { cells: [], layout: "dateColumn" };
    return { cells: [{ divisionLabel: filterLabel, symbol }], layout: "dateColumn" };
  }

  // 類型A: 行=室、列=区分。室の行のヘッダに区分ラベルが 2 つ以上あるかで判別する。
  const roomRow = findRoomRow(tables, roomName);
  if (roomRow) {
    const divisionColumns = roomRow.header
      .map((label, i) => ({ label, i }))
      .slice(1)
      .filter(({ label }) => looksLikeDivisionLabel(label, normalizedDivisionLabels));
    if (divisionColumns.length >= 2) {
      const cells = divisionColumns
        .map(({ label, i }) => {
          const symbol = roomRow.cells[i];
          return symbol === undefined ? undefined : { divisionLabel: label, symbol };
        })
        .filter((c): c is { divisionLabel: string; symbol: string } => c !== undefined);
      return { cells, layout: "divisionColumn" };
    }
    // 室の行はあるがヘッダが区分ラベルに一致しない。類型B/Cは室名列を持たないため
    // ここで確定的に空を返す（他の表を類型B/Cとして誤って選ばない）。
    return { cells: [], layout: "divisionColumn" };
  }

  // 類型B: 室名の列が無い。ヘッダ=区分、次の行=値。区分ブロック（ヘッダ行+値行の
  // 2 行 1 組）が表の中に複数段積まれることがある（北区・滝野川会館の実データ:
  // 4 区分のブロックの後に 19:30-21:30 の 1 区分だけのブロックが続く）。
  // 1 組目だけ読むと後続ブロックの区分が観測結果からサイレントに欠落するため、
  // 表全体を 2 行ずつのブロックに分けて走査する。
  // 凡例の表と区別するため、表全体で区分ラベルに一致するヘッダーセルの合計が
  // 2 つ以上であることを必須とする（各ブロック単独では 1 つしか無くてもよい）。
  for (const table of tables) {
    const blocks: { header: string[]; values: string[] }[] = [];
    for (let i = 0; i + 1 < table.rows.length; i += 2) {
      const header = table.rows[i];
      const valueRow = table.rows[i + 1];
      if (!header || !valueRow) continue;
      blocks.push({ header: header.map(cellToSymbol), values: valueRow.map(cellToSymbol) });
    }
    if (blocks.length === 0) continue;

    const blockDivisionColumns = blocks.map((block) =>
      block.header
        .map((label, i) => ({ label, i }))
        .filter(({ label }) => looksLikeDivisionLabel(label, normalizedDivisionLabels))
    );
    const totalDivisionColumns = blockDivisionColumns.reduce(
      (sum, columns) => sum + columns.length,
      0
    );
    if (totalDivisionColumns < 2) continue;

    const cells = blocks.flatMap((block, blockIndex) => {
      const divisionColumns = blockDivisionColumns[blockIndex];
      if (!divisionColumns || divisionColumns.length === 0) return [];
      return divisionColumns
        .map(({ label, i }) => {
          const symbol = block.values[i];
          return symbol === undefined || symbol === ""
            ? undefined
            : { divisionLabel: label, symbol };
        })
        .filter((c): c is { divisionLabel: string; symbol: string } => c !== undefined);
    });
    return { cells, layout: "singleRoomDivisionColumn" };
  }

  // 類型C: 行=区分、列=日付。先頭列に区分ラベルが 2 つ以上あるかで判別する。
  for (const table of tables) {
    const header = table.rows[0];
    if (!header) continue;
    const dataRows = table.rows.slice(1);
    const matchingRows = dataRows.filter((row) => {
      const first = row[0];
      return (
        first !== undefined && looksLikeDivisionLabel(cellToSymbol(first), normalizedDivisionLabels)
      );
    });
    if (matchingRows.length < 2) continue;
    const dateColumn = findDateColumn(header.map(cellToSymbol), isoDate);
    if (dateColumn === undefined) return { cells: [], layout: "divisionRow" };
    const cells = matchingRows
      .map((row) => {
        const symbolCell = row[dateColumn];
        if (symbolCell === undefined) return undefined;
        const first = row[0];
        if (first === undefined) return undefined;
        return { divisionLabel: cellToSymbol(first), symbol: cellToSymbol(symbolCell) };
      })
      .filter((c): c is { divisionLabel: string; symbol: string } => c !== undefined);
    return { cells, layout: "divisionRow" };
  }

  return { cells: [], layout: "none" };
}
