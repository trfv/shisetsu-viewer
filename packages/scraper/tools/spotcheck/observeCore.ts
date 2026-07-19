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
