// scraper の STATUS_MAP は使わない。使うと STATUS_MAP 自体の誤りを判定器が再現する。

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
  Ｘ: "UNAVAILABLE",
  X: "UNAVAILABLE",
  x: "UNAVAILABLE",
  "－": "OUT_OF_SCOPE",
  "-": "OUT_OF_SCOPE",
  "−": "OUT_OF_SCOPE",
  ー: "OUT_OF_SCOPE",
  "＊": "OUT_OF_SCOPE",
  "*": "OUT_OF_SCOPE",
};

// UNAVAILABLE を先に置く。「空きなし」「空いていません」が AVAILABLE 側の「空き」「空いて」に誤マッチする。
// 「受付」は「受付中」を誤分類するので含めない。
const LABEL_CATEGORIES: readonly (readonly [RegExp, SlotCategory])[] = [
  [
    /空きなし|空枠なし|空いていません|空いてません|予約あり|予約済|予約不可|使用中|使用禁止|利用不可|利用中止|選択不可|取消|音出し|抽選/,
    "UNAVAILABLE",
  ],
  // 「空いて」は大田区の img alt「空いています」に当てる。
  [/一部空き|空き|空いて/, "AVAILABLE"],
  [/休館|保守|点検|期間外|対象外|閉館|休止|工事|整備|なし|開放|雨天|悪天候|時間外/, "OUT_OF_SCOPE"],
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
  return categorizeLabel(trimmed);
}
