import type { Locator } from "@playwright/test";

/**
 * select要素の全オプションを選択する
 * @param selectLocator - select要素のLocatorオブジェクト
 * @returns 選択されたオプションの値の配列
 */
export async function selectAllOptions(selectLocator: Locator): Promise<Array<string>> {
  await selectLocator.waitFor();
  const allLabels = await Promise.all(
    (await selectLocator.locator("option").all()).map((o) => o.innerText())
  );
  return await selectLocator.selectOption(allLabels.map((label) => ({ label })));
}

/**
 * テーブルセルからテキストまたは画像srcを取得する。
 * テキストがあればそれを返し、なければinnerHTMLからimg src属性を抽出する。
 */
export async function getCellValue(cell: Locator): Promise<string> {
  const text = await cell.innerText();
  if (text) return text;
  const html = await cell.innerHTML();
  const match = html.match(/src="([^"]+)"/);
  return match?.[1] ?? "";
}
