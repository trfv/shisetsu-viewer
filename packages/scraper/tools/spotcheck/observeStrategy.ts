// 戦略をスクレイパー側に置かないのは、借りる範囲を prepare だけに限るため。
// spot check 専用のフックをスクレイパーに足すと、増えるたびに盲検の境界が曖昧になる。
import type { Page } from "@playwright/test";

import type { RawTable } from "./observeCore.ts";

export type ObserveStrategy = "direct" | "divisionFilter";

// 区分フィルタ型のサイトは、フィルタを操作せずに読むと全区分の集約表を読んでしまう。
// 文京区も同系だが、区分別データは詳細ページへ遷移して読む別機構で applyDivisionFilter では読めない。
// direct のままなら集約表は空で返り reached:false に倒れる（偽 MATCH より安全）。専用戦略は Issue #1626。
export const STRATEGY_BY_MUNICIPALITY: Readonly<Record<string, ObserveStrategy>> = {
  "tokyo-toshima": "divisionFilter",
  "tokyo-edogawa": "divisionFilter",
};

export function strategyFor(municipality: string): ObserveStrategy {
  return STRATEGY_BY_MUNICIPALITY[municipality] ?? "direct";
}

// どれを記号として採るかは observeCore.cellToSymbol で決める。evaluate の中身はブラウザで実行されテストできない。
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

export async function applyDivisionFilter(page: Page, divisionLabel: string): Promise<boolean> {
  try {
    // 豊島区の opener は getByRole でしか、江戸川区は has-text でしか拾えないので or() で束ねる。
    const opener = page
      .getByRole("button", { name: "その他の条件で絞り込む" })
      .or(page.locator('button:has-text("その他の条件で絞り込む")'));
    // WebR Grand の prepare は遷移前ページの table で待ちが満たされ、空き状況ページに着く前に戻ることがある。
    // opener が見えるまで待って遷移完了とみなす。
    await opener.first().waitFor({ state: "visible", timeout: 15000 });
    const label = page.getByText(divisionLabel, { exact: true });
    // opener は開閉トグルなので、開いているときに押すと閉じてしまう。
    if (
      !(await label
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await opener.first().click();
      await page.waitForTimeout(500);
    }
    if ((await label.count()) === 0) return false;
    await label.first().click();
    // 豊島区は <input value="表示">、江戸川区は <button>表示</button>。
    // 江戸川区の has-text は本番 extract が strict click で使えており一意なので、or() でも誤爆しない。
    const show = page
      .getByRole("button", { name: "表示" })
      .or(page.locator('button:has-text("表示")'));
    if ((await show.count()) === 0) return false;
    await show.first().click();
    await page.locator("table").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false;
  }
}
