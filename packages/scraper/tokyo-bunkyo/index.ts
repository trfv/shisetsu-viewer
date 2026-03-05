import type { Page } from "@playwright/test";
import type { Status, Reservation, TransformOutput } from "../common/types";
import { addDays, format } from "date-fns";

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  一部空き: "RESERVATION_STATUS_STATUS_1",
  空きなし: "RESERVATION_STATUS_STATUS_2",
  抽選申込可能: "RESERVATION_STATUS_STATUS_3",
  申込期間外: "RESERVATION_STATUS_STATUS_4",
  公開対象外: "RESERVATION_STATUS_STATUS_5",
  休館: "RESERVATION_STATUS_STATUS_6",
};

type ExtractOutput = { header: string[]; rows: string[][] }[];

function buildISODateStrings(headerStartDate: string, dates: string[]): string[] {
  const base = new Date(
    headerStartDate
      .split("/")
      .flatMap((part) => {
        const match = part.match(/\d+/);
        return match ? [match[0]] : [];
      })
      .join("-")
  );
  return dates.map((_, index) => format(addDays(base, index), "yyyy-MM-dd"));
}

export async function prepare(page: Page, facilityName: string): Promise<Page> {
  await page.goto("https://www.shisetsu.city.bunkyo.lg.jp/user/Home");
  await page.getByRole("tab", { name: "利用目的から探す" }).click();
  await page.getByText("楽器演奏").click();
  await page.getByText("和太鼓", { exact: true }).click();
  await page.getByText("バンド（アンプ使用）", { exact: true }).click();
  await page.getByText("打楽器（編成利用可）", { exact: true }).click();
  await page.getByText("管楽器", { exact: true }).click();
  await page.getByText("弦楽器（アコースティック）", { exact: true }).click();
  await page.getByText("ピアノ（歌唱除く）", { exact: true }).click();
  await page.getByRole("button", { name: "検索" }).click();

  const loadMoreButton = page.getByRole("button", { name: "さらに読み込む" });
  while (await loadMoreButton.isVisible()) {
    try {
      await loadMoreButton.click();
      await page.waitForTimeout(500);
    } catch {
      break;
    }
  }

  await page.getByText(facilityName, { exact: true }).click();
  await page.locator("button").filter({ hasText: "次へ進む" }).click();
  await page.locator("table").first().waitFor();

  return page;
}

async function _extract(page: Page): Promise<ExtractOutput> {
  const table = page.locator("table").first();
  await table.waitFor();

  const headerCells = await table.locator("thead tr:first-child th").all();
  const header = await Promise.all(headerCells.map((c) => c.innerText()));

  const bodyRows = await table.locator("tbody tr").all();
  const rows = await Promise.all(
    bodyRows.map(async (row) => {
      const cells = await row.locator("th, td").all();
      return await Promise.all(cells.map((c) => c.innerText()));
    })
  );

  return [{ header, rows }];
}

export async function extract(
  page: Page,
  startDateString: string,
  maxCount: number
): Promise<ExtractOutput> {
  const output: ExtractOutput = [];

  await page.locator("button").filter({ hasText: "その他の条件で絞り込む" }).click();
  await page.locator('input[type="date"]').fill(startDateString);
  await page.locator("button").filter({ hasText: "その他の条件で絞り込む" }).click();
  await page.locator("button").filter({ hasText: "表示" }).click();

  let i = 0;
  while (i < maxCount) {
    try {
      const o = await _extract(page);
      output.push(...o);
    } catch {
      console.warn(`Failed to extract data at page ${i + 1}, saving current output.`);
      break;
    }
    const nextButton = page.locator("button").filter({ hasText: "次の期間" });
    if ((await nextButton.count()) === 0) break;
    try {
      await nextButton.click();
    } catch {
      console.warn(`Failed to navigate to next period at page ${i + 1}.`);
      break;
    }
    i++;
  }

  return output;
}

export async function transform(extractOutput: ExtractOutput): Promise<TransformOutput> {
  const dateRoomReservationMap = extractOutput.reduce<{
    [key: string]: { [key: string]: Reservation };
  }>((acc, { header, rows }) => {
    const dates = buildISODateStrings(header[0] as string, header.slice(2));
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i] as string;
      acc[date] ||= {};
      for (const row of rows) {
        const roomName = (row[0]?.split(" ")?.[0] ?? "") as string;
        const statuses = row.slice(2);
        acc[date][roomName] ||= {};
        acc[date][roomName]["RESERVATION_DIVISION_DIVISION_1"] =
          STATUS_MAP[statuses[i] || ""] || "RESERVATION_STATUS_INVALID";
      }
    }
    return acc;
  }, {});
  return Object.entries(dateRoomReservationMap).flatMap(([date, roomReservation]) => {
    return Object.entries(roomReservation).map(([roomName, reservation]) => ({
      room_name: roomName,
      date,
      reservation,
    }));
  });
}
