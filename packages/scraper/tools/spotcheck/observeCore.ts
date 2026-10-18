export interface RawCell {
  text: string;
  imgAlt: string;
  imgSrc: string;
}

// alt を src より優先する（画像で空きを表すサイトでは alt が人の読む内容と一致する）。
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

// target の粒度は自治体で違う（北区は室ごと、豊島区は建物ごと）。室名で一致しなければ建物単位とみなす。
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

// 建物名と等しい値を除外する。除外しないと全 target が一致して silent failure を見逃す。
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

export interface RawTable {
  rows: RawCell[][];
}

export function normalizeLabel(label: string): string {
  const halfWidth = label.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  return halfWidth
    .replace(/[～〜\-−ー]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

// index 0 は表題なので除外する。除外しないと江戸川区の表題「2026/7/19(日)～」が日付セルとして先に一致する。
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

// 年号は形式がサイトで違うので問わず、月日だけで判定する。
export function isDateDisplayed(bodyText: string, isoDate: string): boolean {
  const parts = isoDate.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return false;
  const kanji = new RegExp(`0*${month}\\s*月\\s*0*${day}\\s*日`);
  const slash = new RegExp(`(?:^|[^0-9])0*${month}\\s*/\\s*0*${day}(?![0-9])`);
  return kanji.test(bodyText) || slash.test(bodyText);
}

// 先頭セルに建物名を含む自治体（「石浜ふれあい館 ３階和室２」）があるので、室名は部分一致で探す。
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

    // 江東区は 1 つの表に区分数の異なるヘッダ+室グループが並ぶので、セル数が一致する最も近い境界行をヘッダにする。
    // 境界行（rows[0] かセル数が直前と変わる行）に限らないと、通常の表で室のすぐ上のデータ行をヘッダと誤認する。
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

export type TableLayout =
  | "divisionColumn"
  | "singleRoomDivisionColumn"
  | "divisionRow"
  | "dateColumn"
  | "none";

export interface ExtractedCells {
  cells: { divisionLabel: string; symbol: string }[];
  layout: TableLayout;
}

// registry ラベルが「午前」のような抽象名でもサイトは時刻表記で出す自治体（大田区）があるので、
// 時刻範囲の形も区分ラベルとして扱う。
const TIME_RANGE_PATTERN = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;

function looksLikeDivisionLabel(
  cell: string,
  normalizedDivisionLabels: ReadonlySet<string>
): boolean {
  const normalized = normalizeLabel(cell);
  if (!normalized) return false;
  return normalizedDivisionLabels.has(normalized) || TIME_RANGE_PATTERN.test(normalized);
}

export function extractCells(
  tables: readonly RawTable[],
  divisionLabels: readonly string[],
  roomName: string,
  isoDate: string,
  filterLabel?: string
): ExtractedCells {
  const normalizedDivisionLabels = new Set(divisionLabels.map(normalizeLabel));

  if (filterLabel !== undefined) {
    const found = findRoomRow(tables, roomName);
    if (!found) return { cells: [], layout: "dateColumn" };
    const dateColumn = findDateColumn(found.header, isoDate);
    if (dateColumn === undefined) return { cells: [], layout: "dateColumn" };
    const symbol = found.cells[dateColumn];
    if (symbol === undefined) return { cells: [], layout: "dateColumn" };
    return { cells: [{ divisionLabel: filterLabel, symbol }], layout: "dateColumn" };
  }

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
    // 室名列を持たない後段の類型で他の表を誤って選ばないよう、ここで確定的に空を返す。
    return { cells: [], layout: "divisionColumn" };
  }

  // 室名列なし、ヘッダ=区分、次の行=値。北区・滝野川会館は 2 行 1 組のブロックが複数段積まれるので、
  // 1 組目だけ読むと後続の区分が欠落する。凡例の表と区別するため区分ヘッダは表全体で 2 つ以上を要求する。
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
