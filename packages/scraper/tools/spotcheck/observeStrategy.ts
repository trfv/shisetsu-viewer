// spot check の読み取り戦略。スクレイパーの extract は参照しない（盲検の線引き）。
//
// 戦略をスクレイパー側ではなくここに置くのは、借りている範囲を prepare だけに
// 限るためである。スクレイパーに spot check 専用のフックを足すと、フックが
// 増えるたびに境界が曖昧になる。

/**
 * direct        : prepare 後に描画されている表をそのまま読む
 * divisionFilter: 区分ラベルごとにフィルタを切り替えて表を読み直す
 */
export type ObserveStrategy = "direct" | "divisionFilter";

/**
 * 区分フィルタ型のサイト。「その他の条件で絞り込む」で時間帯を選ぶと
 * 表が描き直されるため、フィルタを操作せずに読むと全区分の集約表を
 * 読んでしまう（2026-07-19 の初回観測で実際に踏んだ）。
 *
 * 文京区も同系のシステムだが、初回の観測では施設別空き状況の画面で
 * 凡例とヘッダだけが描画され、グリッドが現れなかった。フィルタ操作
 * 以前の段階で止まっているため direct のままとし、再現を見てから決める。
 */
export const STRATEGY_BY_MUNICIPALITY: Readonly<Record<string, ObserveStrategy>> = {
  "tokyo-toshima": "divisionFilter",
  "tokyo-edogawa": "divisionFilter",
};

export function strategyFor(municipality: string): ObserveStrategy {
  return STRATEGY_BY_MUNICIPALITY[municipality] ?? "direct";
}
