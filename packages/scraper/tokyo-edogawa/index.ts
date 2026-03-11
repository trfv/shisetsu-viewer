import type { Page } from "@playwright/test";
import type { Division, Status, TransformOutput } from "../common/types";

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  一部空き: "RESERVATION_STATUS_STATUS_1",
  空きなし: "RESERVATION_STATUS_STATUS_2",
  申込期間外: "RESERVATION_STATUS_STATUS_3",
  公開対象外: "RESERVATION_STATUS_STATUS_4",
  抽選: "RESERVATION_STATUS_STATUS_5",
};

const TIME_PERIODS = [
  { label: "午前", division: "RESERVATION_DIVISION_MORNING" as Division },
  { label: "午後", division: "RESERVATION_DIVISION_AFTERNOON" as Division },
  { label: "夜間", division: "RESERVATION_DIVISION_EVENING" as Division },
];

type PeriodExtractOutput = {
  year: string;
  dates: string[];
  rows: { roomName: string; statuses: string[] }[];
}[];

type ExtractOutput = {
  division: Division;
  data: PeriodExtractOutput;
}[];

function toISODate(year: string, dateStr: string): string {
  // dateStr: "3/10 火" or "3/10" → extract month and day
  const match = dateStr.match(/(\d+)\/(\d+)/);
  if (!match?.[1] || !match[2]) return "";
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function prepare(page: Page, facilityName: string, category: string): Promise<Page> {
  await page.goto("https://www.shisetsuyoyaku.city.edogawa.tokyo.jp/user/Home");
  await page.getByRole("button", { name: category, exact: true }).click();
  await page.getByRole("heading", { name: "施設選択" }).waitFor();

  // Click "さらに読み込む" until the target facility is visible or the button disappears
  const facilityLabel = page.locator("label").filter({
    has: page.getByText(facilityName, { exact: true }),
  });
  while (!(await facilityLabel.isVisible())) {
    const loadMore = page.locator('button:has-text("さらに読み込む")');
    if ((await loadMore.count()) === 0) break;
    await loadMore.click();
    await page.waitForTimeout(500);
  }

  // Check the facility checkbox
  await facilityLabel.click();

  // Click "次へ進む" and wait for the availability page to fully load
  await page.locator('button:has-text("次へ進む")').click();
  await page.getByRole("heading", { name: "施設別空き状況" }).waitFor();
  await page.locator("table thead th").first().waitFor();

  return page;
}

async function _extract(page: Page): Promise<PeriodExtractOutput[number]> {
  const table = page.locator("table").first();
  const headerCells = await table.locator("thead tr th").all();

  // First header cell contains date range like "2026/3/10(火)～"
  const firstCell = headerCells[0];
  if (!firstCell) throw new Error("No header cells found in table");
  const firstHeader = await firstCell.innerText();
  const yearMatch = firstHeader.match(/(\d{4})\//);
  const year = yearMatch?.[1] ?? new Date().getFullYear().toString();

  // Date columns start at index 2 (skip room name header and capacity header)
  const dates: string[] = [];
  for (let i = 2; i < headerCells.length; i++) {
    const cell = headerCells[i];
    if (!cell) continue;
    const text = await cell.innerText();
    dates.push(text.trim());
  }

  // Extract rows from tbody
  const bodyRows = await table.locator("tbody tr").all();
  const rows: { roomName: string; statuses: string[] }[] = [];

  for (const row of bodyRows) {
    const cells = await row.locator("td").all();
    if (cells.length < 3) continue;

    const firstTd = cells[0];
    if (!firstTd) continue;
    const roomName = (await firstTd.innerText()).trim();
    // Skip capacity cell (index 1), status cells start at index 2
    const statuses: string[] = [];
    for (let i = 2; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const text = (await cell.innerText()).trim();
      statuses.push(text);
    }
    rows.push({ roomName, statuses });
  }

  return { year, dates, rows };
}

async function extractAllPages(page: Page, maxCount: number): Promise<PeriodExtractOutput> {
  const output: PeriodExtractOutput = [];
  let totalDays = 0;

  while (totalDays < maxCount) {
    try {
      const data = await _extract(page);
      output.push(data);
      totalDays += data.dates.length;
    } catch {
      console.warn(`Failed to extract data at page ${output.length + 1}, saving current output.`);
      break;
    }

    if (totalDays >= maxCount) break;

    const nextButton = page.locator('button:has-text("次の期間")');
    if ((await nextButton.count()) === 0) break;
    try {
      await nextButton.click();
      await page.locator("table thead th").first().waitFor();
    } catch {
      console.warn(`Failed to navigate to next period at page ${output.length}.`);
      break;
    }
  }

  return output;
}

export async function extract(page: Page, maxCount: number): Promise<ExtractOutput> {
  const output: ExtractOutput = [];

  for (const { label, division } of TIME_PERIODS) {
    // Expand the filter section if collapsed
    const filterSection = page.locator("#otherCondition");
    if (!(await filterSection.isVisible())) {
      await page.locator('button:has-text("その他の条件で絞り込む")').click();
      await filterSection.waitFor({ state: "visible" });
    }
    // Click the label directly (Bootstrap custom-radio: input is hidden, label handles the click)
    await filterSection.getByText(label, { exact: true }).click();
    await page.locator('button:has-text("表示")').click();
    await page.locator("table thead th").first().waitFor();

    const data = await extractAllPages(page, maxCount);
    output.push({ division, data });
  }

  return output;
}

export async function transform(extractOutput: ExtractOutput): Promise<TransformOutput> {
  // Merge 3 time periods into one reservation record per room+date
  const map: Record<string, Record<string, Record<string, Status>>> = {};

  for (const { division, data } of extractOutput) {
    for (const { year, dates, rows } of data) {
      for (const { roomName, statuses } of rows) {
        for (let i = 0; i < dates.length; i++) {
          const date = toISODate(year, dates[i] || "");
          if (!date) continue;
          map[roomName] ||= {};
          map[roomName][date] ||= {};
          map[roomName][date][division] = (STATUS_MAP[statuses[i] || ""] ??
            "RESERVATION_STATUS_INVALID") as Status;
        }
      }
    }
  }

  return Object.entries(map).flatMap(([roomName, dateMap]) =>
    Object.entries(dateMap).map(([date, reservation]) => ({
      room_name: roomName,
      date,
      reservation,
    }))
  );
}
