import type { Page } from "@playwright/test";
import type { Division, Status, Reservation, TransformOutput } from "../common/types";
import { addDays, format } from "date-fns";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  空き: "RESERVATION_STATUS_VACANT",
  一部空き: "RESERVATION_STATUS_STATUS_1",
  空きなし: "RESERVATION_STATUS_STATUS_2",
  申込期間外: "RESERVATION_STATUS_STATUS_3",
  休館: "RESERVATION_STATUS_STATUS_4",
  休館日: "RESERVATION_STATUS_STATUS_4",
  なし: "RESERVATION_STATUS_STATUS_5",
  公開対象外: "RESERVATION_STATUS_STATUS_6",
  抽選: "RESERVATION_STATUS_STATUS_7",
};

type ExtractOutput = { division: string; header: string[]; rows: string[][] }[];

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
  await page.goto("https://yoyaku03.city.sumida.lg.jp/user/Home");
  await page.getByRole("tab", { name: "利用目的から探す" }).click();
  await page.getByText("器楽演奏", { exact: true }).click();
  await page.getByText("器楽演奏（現地相談）", { exact: true }).click();
  await page.getByText("合唱・歌唱・詩吟", { exact: true }).click();
  await page.getByText("合唱・歌唱・詩吟（現地相談）", { exact: true }).click();
  await page.getByRole("button", { name: "検索" }).click();
  await page.getByText(facilityName, { exact: true }).click();
  await page.getByRole("button", { name: "次へ進む" }).click();

  return page;
}

async function _extract(page: Page, division: string): Promise<ExtractOutput> {
  const table = page.locator(
    '//*[@id="app"]/div[3]/form/div[1]/div/div[3]/div[2]/div[2]/div/div/div/div[3]/div[2]/table'
  );
  await table.waitFor();
  const lines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("th,td").all())
  );

  const header = await Promise.all((lines[0] || []).map((l) => l.innerText()));
  const rows = await Promise.all(
    lines.slice(1).map(async (line) => await Promise.all(line.map((l) => l.innerText())))
  );
  return [{ division, header, rows }];
}

export async function extract(
  page: Page,
  startDateString: string,
  maxCount: number
): Promise<ExtractOutput> {
  const output: ExtractOutput = [];

  for (const division of Object.keys(DIVISION_MAP).filter(Boolean)) {
    await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
    await page.getByRole("textbox", { name: "表示期間" }).fill(startDateString);
    await page.getByText(division, { exact: true }).click();
    await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
    await page.getByRole("button", { name: "表示" }).click();

    let i = 0;
    while (i < maxCount) {
      try {
        const o = await _extract(page, division);
        output.push(...o);
      } catch {
        console.warn(
          `Failed to extract data for division ${division} page ${i + 1}, saving current output.`
        );
        break;
      }
      const nextButton = page.getByRole("button", { name: "次の期間" });
      if ((await nextButton.count()) === 0) break;
      try {
        await nextButton.click();
      } catch {
        console.warn(`Failed to navigate to next period at page ${i + 1}.`);
        break;
      }
      i++;
    }
  }

  return output;
}

export async function transform(extractOutput: ExtractOutput): Promise<TransformOutput> {
  // date -> room -> reservation
  const dateRoomReservationMap = extractOutput.reduce<{
    [key: string]: { [key: string]: Reservation };
  }>((acc, { division, header, rows }) => {
    const dates = buildISODateStrings(header[0] as string, header.slice(2));
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i] as string;
      acc[date] ||= {};
      for (const row of rows) {
        const roomName = row[0]?.split(" ")?.[0] as string;
        const status = row.slice(2);
        acc[date][roomName] ||= {};
        acc[date][roomName][DIVISION_MAP[division] || "RESERVATION_DIVISION_INVALID"] =
          STATUS_MAP[status[i] || ""] || "RESERVATION_STATUS_INVALID";
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
