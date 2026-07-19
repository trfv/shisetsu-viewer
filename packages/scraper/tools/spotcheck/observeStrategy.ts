// spot check の読み取り戦略。スクレイパーの extract は参照しない（盲検の線引き）。
//
// 戦略をスクレイパー側ではなくここに置くのは、借りている範囲を prepare だけに
// 限るためである。スクレイパーに spot check 専用のフックを足すと、フックが
// 増えるたびに境界が曖昧になる。
import type { Page } from "@playwright/test";
import type { RawTable } from "./observeCore.ts";

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

/**
 * ページ上の全ての表からセルの生データを集める。
 *
 * evaluate の中では text / alt / src を機械的に集めるだけにし、
 * どれを記号として採るかの判断は observeCore.cellToSymbol に出す
 * （evaluate の中身はブラウザ側で実行されるためテストできない）。
 */
export async function collectTables(page: Page): Promise<RawTable[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("table")]
      .map((table) => ({
        rows: [...table.querySelectorAll("tr")].map((tr) =>
          [...tr.querySelectorAll("td,th")].map((cellEl) => {
            const img = cellEl.querySelector("img");
            return {
              text: (cellEl as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
              imgAlt: img?.getAttribute("alt") ?? "",
              imgSrc: img?.getAttribute("src") ?? "",
            };
          })
        ),
      }))
      .filter((t) => t.rows.length >= 2)
  );
}

/**
 * 区分フィルタを切り替える。切り替えられたら true を返す。
 *
 * 豊島区と江戸川区で共通の UI（「その他の条件で絞り込む」→ 区分ラベル →
 * 「表示」）を操作する。いずれかの要素が見つからなければ false を返し、
 * 呼び出し側がその区分を欠落として記録する。
 */
export async function applyDivisionFilter(page: Page, divisionLabel: string): Promise<boolean> {
  try {
    const opener = page.locator('button:has-text("その他の条件で絞り込む")');
    if ((await opener.count()) > 0 && (await opener.first().isVisible())) {
      await opener.first().click();
      await page.waitForTimeout(500);
    }
    const label = page.getByText(divisionLabel, { exact: true });
    if ((await label.count()) === 0) return false;
    await label.first().click();
    const show = page.locator('button:has-text("表示")');
    if ((await show.count()) === 0) return false;
    await show.first().click();
    await page.locator("table").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false;
  }
}
