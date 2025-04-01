import type { Page } from "@playwright/test";
import { toISODateString } from "../common/dateUtils";

type Division =
  | "RESERVATION_DIVISION_INVALID"
  | "RESERVATION_DIVISION_MORNING"
  | "RESERVATION_DIVISION_AFTERNOON"
  | "RESERVATION_DIVISION_EVENING";

const DIVISION_MAP: { [key: string]: Division } = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
};

type Status =
  | "RESERVATION_STATUS_INVALID"
  | "RESERVATION_STATUS_VACANT"
  | "RESERVATION_STATUS_STATUS_1"
  | "RESERVATION_STATUS_STATUS_2"
  | "RESERVATION_STATUS_STATUS_3"
  | "RESERVATION_STATUS_STATUS_4"
  | "RESERVATION_STATUS_STATUS_5"
  | "RESERVATION_STATUS_STATUS_6"
  | "RESERVATION_STATUS_STATUS_7"
  | "RESERVATION_STATUS_STATUS_8"
  | "RESERVATION_STATUS_STATUS_9";

const STATUS_MAP: { [key: string]: Status } = {
  "": "RESERVATION_STATUS_INVALID",
  "image/lw_emptybs.gif": "RESERVATION_STATUS_VACANT",
  "image/lw_finishs.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_aki2.gif": "RESERVATION_STATUS_STATUS_2",
  "image/lw_aki1.gif": "RESERVATION_STATUS_STATUS_3",
  "image/lw_aki3.gif": "RESERVATION_STATUS_STATUS_4",
  "image/lw_aki4.gif": "RESERVATION_STATUS_STATUS_5",
  "image/lw_kikangais.gif": "RESERVATION_STATUS_STATUS_6",
  "image/lw_notime.gif": "RESERVATION_STATUS_STATUS_7",
  "image/lw_aki10.gif": "RESERVATION_STATUS_STATUS_8",
  "image/lw_aki11.gif": "RESERVATION_STATUS_STATUS_9",
};

type Reservation = { [K in Division]?: Status };

type ExtractOutput = { caption: string; header: string[]; rows: string[][] }[];

type TransformOutput = {
  room_name: string;
  date: string;
  reservation: Reservation;
}[];

function toRoomName(caption: string, facilityName: string): string {
  return caption.replace(facilityName, "").slice(0, -4).trim();
}

export async function prepare(page: Page, facilityName: string, startDate: Date): Promise<Page> {
  await page.goto("https://www.fureai-net.city.kawasaki.jp/web/index.jsp");
  await page.getByRole("link", { name: "予約" }).click();
  await page.getByRole("button", { name: "複合検索" }).click();
  await page.getByRole("button", { name: "利用目的", exact: true }).click();
  await page.getByRole("link", { name: "演奏・合唱" }).click();
  await page.getByRole("button", { name: "館" }).click();
  await page.getByRole("link", { name: facilityName }).click();
  await page.getByLabel("年").selectOption(startDate.getFullYear().toString());
  await page.getByLabel("月", { exact: true }).selectOption((startDate.getMonth() + 1).toString());
  await page.getByLabel("日から").selectOption(startDate.getDate().toString());
  await page.getByRole("button", { name: "検索開始" }).click();

  return page;
}

async function _extract(page: Page): Promise<ExtractOutput> {
  const tableDiv = page.locator("#rsvaki3");
  await tableDiv.waitFor();
  const caption = await tableDiv.locator("caption").innerText();
  const table = tableDiv.locator("table");
  const lines = await Promise.all(
    (await table.locator("tr").all()).map(async (line) => await line.locator("th,td").all())
  );

  const header = await Promise.all((lines[0] || []).map((l) => l.innerText()));
  const rows: string[][] = [];
  for (const line of lines.slice(1)) {
    const row = await Promise.all(
      line.map((l) =>
        l.innerText().then((value) => {
          if (value) {
            return value;
          }
          return l.innerHTML().then((value) => {
            const match = value.match(/src="([^"]+)"/);
            return match?.[1] ?? "";
          });
        })
      )
    );
    rows.push(row);
  }

  return [{ caption, header, rows }];
}

export async function extract(page: Page, maxCount: number): Promise<ExtractOutput> {
  const output: ExtractOutput = [];

  let roomCount = 1;
  while (true) {
    try {
      await page.getByRole("button", { name: "次の施設" }).click();
      roomCount++;
    } catch {
      break;
    }
  }
  await page.getByRole("button", { name: "もどる" }).nth(0).click();
  await page.getByRole("button", { name: "検索開始" }).click();

  for (let i = 0; i < roomCount; i++) {
    let j = 0;
    while (j < i) {
      await page.getByRole("button", { name: "次の施設" }).click();
      j++;
    }
    let k = 0;
    while (k < maxCount) {
      const o = await _extract(page);
      output.push(...o);
      try {
        await page.getByRole("button", { name: "次の週" }).nth(0).click();
      } catch {
        break;
      }
      k++;
    }
    await page.getByRole("button", { name: "もどる" }).nth(0).click();
    await page.getByRole("button", { name: "検索開始" }).click();
  }

  return output;
}

export async function transform(
  extractOutput: ExtractOutput,
  facilityName: string
): Promise<TransformOutput> {
  return extractOutput.flatMap(({ caption, header, rows }) => {
    const reservations = rows.map((row) => {
      const division = DIVISION_MAP[row[0] || ""] as Division;
      const statuses = row.slice(1);
      return [...new Array(row.length - 1)].map((_, colIndex) => {
        const status = STATUS_MAP[statuses[colIndex] || ""] as Status;
        return {
          [division]: status,
        };
      });
    });

    return [...new Array(header.length - 1)].map((_, colIndex) => {
      const year = header[0];
      const dates = header.slice(1);
      const date = toISODateString(`${year}${dates[colIndex]}`);
      return {
        room_name: toRoomName(caption, facilityName),
        date,
        reservation: [...new Array(rows.length)].reduce(
          (acc, _, rowIndex) => ({ ...acc, ...reservations[rowIndex]?.[colIndex] }),
          {}
        ),
      };
    });
  });
}
