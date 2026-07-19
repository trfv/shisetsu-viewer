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
