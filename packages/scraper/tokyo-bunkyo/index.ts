import type { Page } from "@playwright/test";
import type { Status, Division, Reservation, TransformOutput } from "../common/types";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
  "１コマ": "RESERVATION_DIVISION_DIVISION_1",
  "２コマ": "RESERVATION_DIVISION_DIVISION_2",
  "３コマ": "RESERVATION_DIVISION_DIVISION_3",
  "４コマ": "RESERVATION_DIVISION_DIVISION_4",
  "５コマ": "RESERVATION_DIVISION_DIVISION_5",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  circle: "RESERVATION_STATUS_VACANT",
  triangle: "RESERVATION_STATUS_STATUS_1",
  cross: "RESERVATION_STATUS_STATUS_2",
  asterisk: "RESERVATION_STATUS_STATUS_3",
  minus: "RESERVATION_STATUS_STATUS_4",
};

type ExtractOutput = {
  date: string;
  roomName: string;
  division: string;
  status: string;
}[];

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

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  return page;
}

async function extractTimeSlots(page: Page): Promise<ExtractOutput> {
  return await page.evaluate(() => {
    const results: { date: string; roomName: string; division: string; status: string }[] = [];
    const dateLis = document.querySelectorAll("li.events-date");
    const datePattern = /(\d{4})年\s*(\d{1,2})月(\d{1,2})日/;

    for (const li of dateLis) {
      const text = li.textContent?.trim() || "";
      const match = text.match(datePattern);
      if (!match) continue;

      const [, year, month, day] = match;
      if (!year || !month || !day) continue;
      const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const nextLi = li.nextElementSibling;
      if (!nextLi) continue;

      const roomContainer = nextLi.firstElementChild;
      const roomName = roomContainer?.firstElementChild?.textContent?.trim() || "";
      if (!roomName) continue;

      const slotLis = nextLi.querySelectorAll('li[class*="btn-group-toggle"]');
      for (const slotLi of slotLis) {
        const spans = slotLi.querySelectorAll("span");
        let division = "";
        for (const span of spans) {
          const t = span.textContent?.trim() || "";
          if (/^(?:(午前|午後|夜間)|[１-５]コマ)$/.test(t)) {
            division = t;
            break;
          }
        }
        if (!division) continue;

        const svgs = slotLi.querySelectorAll("svg");
        const visibleSvg = Array.from(svgs).find(
          (s) => (s as unknown as HTMLElement).style.display !== "none"
        );
        const use = visibleSvg?.querySelector("use");
        const href = use?.getAttribute("xlink:href") || use?.getAttribute("href") || "";
        const status = href.split("#")[1] || "";

        results.push({ date, roomName, division, status });
      }
    }
    return results;
  });
}

async function toggleRowCells(page: Page, rowIndex: number): Promise<number> {
  const row = page.locator("tbody tr").nth(rowIndex);
  const labels = row.locator("td label:not(.disabled)");
  const count = await labels.count();
  for (let i = 0; i < count; i++) {
    await labels.nth(i).click({ timeout: 10000 });
  }
  return count;
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

  let weekIndex = 0;
  while (weekIndex < maxCount) {
    try {
      await page.locator("table").first().waitFor();

      const rowCount = await page.locator("tbody tr").count();

      for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        const toggledCount = await toggleRowCells(page, rowIdx);
        if (toggledCount === 0) {
          continue;
        }

        await page.locator("button").filter({ hasText: "次へ進む" }).click();
        await page.waitForURL("**/AvailabilityCheckApplySelectTime**", { timeout: 15000 });
        await page.getByRole("heading", { name: "時間帯別空き状況" }).waitFor({ timeout: 15000 });

        const slotData = await extractTimeSlots(page);
        output.push(...slotData);

        await page.locator("button").filter({ hasText: "前に戻る" }).click();
        await page.waitForURL("**/AvailabilityCheckApplySelectDays**", { timeout: 15000 });
        await page.locator("table tbody tr").first().waitFor({ timeout: 30000 });
        // Ensure labels are interactive before toggling
        await page.locator("tbody tr").first().locator("td label").first().waitFor({
          state: "visible",
          timeout: 15000,
        });

        // Uncheck the row's cells to prepare for the next row
        await toggleRowCells(page, rowIdx);
      }
    } catch (e) {
      console.warn(`Failed to extract data at week ${weekIndex + 1}, saving current output.`, e);
      break;
    }

    const nextButton = page.locator("button").filter({ hasText: "次の期間" });
    if ((await nextButton.count()) === 0) break;
    try {
      const prevTableContent = await page.locator("tbody").first().innerText();
      await nextButton.click();
      // Wait for table content to actually change after period navigation
      await page.waitForFunction(
        (prev) => {
          const tbody = document.querySelector("tbody");
          return tbody !== null && tbody.innerText !== prev;
        },
        prevTableContent,
        { timeout: 15000 }
      );
      await page.locator("table tbody tr").first().waitFor({ timeout: 15000 });
      // Ensure labels are interactive after period change
      await page.locator("tbody tr").first().locator("td label").first().waitFor({
        state: "visible",
        timeout: 15000,
      });
    } catch {
      console.warn(`Failed to navigate to next period at week ${weekIndex + 1}.`);
      break;
    }
    weekIndex++;
  }

  return output;
}

export async function transform(extractOutput: ExtractOutput): Promise<TransformOutput> {
  const dateRoomReservationMap: Record<string, Record<string, Reservation>> = {};

  for (const { date, roomName, division, status } of extractOutput) {
    dateRoomReservationMap[date] ||= {};
    dateRoomReservationMap[date][roomName] ||= {};
    const divKey = DIVISION_MAP[division] || "RESERVATION_DIVISION_INVALID";
    dateRoomReservationMap[date][roomName][divKey] =
      STATUS_MAP[status] || "RESERVATION_STATUS_INVALID";
  }

  return Object.entries(dateRoomReservationMap).flatMap(([date, roomReservation]) => {
    return Object.entries(roomReservation).map(([roomName, reservation]) => ({
      room_name: roomName.replace(/\s*≪《[^》]*》≫$/, ""),
      date,
      reservation,
    }));
  });
}
