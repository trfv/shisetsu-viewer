// spot check の記号・ラベルのカテゴリ化。scraper の STATUS_MAP から独立させる。
// STATUS_MAP 自体の誤りを検出したいのに判定に使うと同じ誤りを再現するため、
// 根拠は「予約システムで通用している記号」「サイトの凡例」「shared registry の表示ラベル」に限る。

export type SlotCategory = "AVAILABLE" | "UNAVAILABLE" | "OUT_OF_SCOPE" | "UNKNOWN";

const SYMBOL_CATEGORIES: Readonly<Record<string, SlotCategory>> = {
  "○": "AVAILABLE",
  "◯": "AVAILABLE",
  〇: "AVAILABLE",
  "△": "AVAILABLE",
  "×": "UNAVAILABLE",
  "✕": "UNAVAILABLE",
  "✖": "UNAVAILABLE",
  "●": "UNAVAILABLE",
  "－": "OUT_OF_SCOPE",
  "-": "OUT_OF_SCOPE",
  "−": "OUT_OF_SCOPE",
  ー: "OUT_OF_SCOPE",
  "＊": "OUT_OF_SCOPE",
  "*": "OUT_OF_SCOPE",
};

// UNAVAILABLE を先に置く（「空きなし」が「空き」に誤マッチしないように順序で優先度を表す）。
const LABEL_CATEGORIES: readonly (readonly [RegExp, SlotCategory])[] = [
  [/空きなし|予約あり|予約済|予約不可|使用中|音出し|抽選/, "UNAVAILABLE"],
  [/一部空き|空き/, "AVAILABLE"],
  [/休館|保守|点検|期間外|受付|対象外|閉館|休止/, "OUT_OF_SCOPE"],
];

export function categorizeLabel(label: string): SlotCategory {
  for (const [pattern, category] of LABEL_CATEGORIES) {
    if (pattern.test(label)) return category;
  }
  return "UNKNOWN";
}

export function categorizeSymbol(
  symbol: string,
  legend?: Readonly<Record<string, string>>
): SlotCategory {
  const trimmed = symbol.trim();
  const legendText = legend?.[trimmed];
  if (legendText !== undefined) {
    const byLegend = categorizeLabel(legendText);
    if (byLegend !== "UNKNOWN") return byLegend;
  }
  const bySymbol = SYMBOL_CATEGORIES[trimmed];
  if (bySymbol !== undefined) return bySymbol;
  // 記号でなく「予約あり」等の文言が直接表示されるサイト向けフォールバック。
  return categorizeLabel(trimmed);
}
