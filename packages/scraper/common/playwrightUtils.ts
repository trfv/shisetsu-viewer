import type { Locator } from "@playwright/test";

export async function selectAllOptions(selectLocator: Locator): Promise<Array<string>> {
  await selectLocator.waitFor();
  const allLabels = await Promise.all(
    (await selectLocator.locator("option").all()).map((o) => o.innerText())
  );
  return await selectLocator.selectOption(allLabels.map((label) => ({ label })));
}

export async function getCellValue(cell: Locator): Promise<string> {
  const text = await cell.innerText();
  if (text) return text;
  const html = await cell.innerHTML();
  const match = html.match(/src="([^"]+)"/);
  return match?.[1] ?? "";
}
