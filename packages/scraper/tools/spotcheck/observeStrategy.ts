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
 * 文京区も同系のシステムで、施設別空き状況の集約表（行=室・列=日付）が
 * 既定で描画される点は豊島区・江戸川区と同じ（2026-07-22 の実地検証で確認。
 * observe の prepare 後 settle 待ちを入れてグリッドが描画されるようになって
 * 初めて中身を確認できた）。ただし文京区の区分別データは、この単純なフィルタ
 * 再描画ではなく、セルを選択して「時間帯別空き状況」の詳細ページへ遷移して
 * 読む別機構であり（tokyo-bunkyo/index.ts の extract 参照）、applyDivisionFilter
 * では正しく読めない。専用戦略が要るため direct のままとする。
 * direct のときは extractCells が「室の行はあるがヘッダが区分ラベルでない」表を
 * 確定的に空で返すので、集約表を誤って読むことはなく reached:false で fail-safe
 * する（偽 MATCH を出すより安全）。文京区専用戦略の実装は将来課題（Issue #1626）。
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
 *
 * 二つの罠に対処している。
 * 1. prepare のナビゲーション完了前復帰: WebR Grand の prepare は「次へ進む」
 *    直後に `table` を待つが、その表は遷移前の施設一覧ページの表で即座に
 *    満たされるため、prepare が空き状況ページに着く前に戻ることがある
 *    （本番の extract は直後に表示開始日テキストボックスへ fill するため
 *    auto-wait で遷移完了を待って race を回避している）。ここではフィルタ
 *    画面の目印である opener ボタンが可視になるまで待って遷移完了を保証する。
 * 2. パネルのトグル: opener は開閉トグルなので、既に開いているのに押すと
 *    閉じて区分ラベルが不可視になる。区分ラベルが見えていないときだけ押す。
 */
export async function applyDivisionFilter(page: Page, divisionLabel: string): Promise<boolean> {
  try {
    // opener と表示ボタンは自治体で DOM が異なる。豊島区の opener は button 要素
    // ではなく getByRole でしか拾えず、江戸川区は <button> だがアクセシブル名が
    // 解決されず has-text でしか拾えない（両者は正反対）。role と has-text の
    // どちらでも拾えるよう or() で束ねる。
    const opener = page
      .getByRole("button", { name: "その他の条件で絞り込む" })
      .or(page.locator('button:has-text("その他の条件で絞り込む")'));
    await opener.first().waitFor({ state: "visible", timeout: 15000 });
    const label = page.getByText(divisionLabel, { exact: true });
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
    // 豊島区の表示は <input value="表示">（role=button、has-text の button タグに
    // 掛からない）、江戸川区は <button>表示</button>。role（非 exact）と has-text で
    // 束ねる。江戸川区の button:has-text("表示") は本番 extract が strict click で
    // 使えている＝一意なので、or() でも誤爆しない。
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
