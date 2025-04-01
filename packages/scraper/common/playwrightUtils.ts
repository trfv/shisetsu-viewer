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
