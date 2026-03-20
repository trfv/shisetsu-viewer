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
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
  "＊": "RESERVATION_STATUS_STATUS_4",
  休館: "RESERVATION_STATUS_STATUS_5",
  抽選: "RESERVATION_STATUS_STATUS_6",
};

const CATEGORY_MAP: Record<string, string> = {
  中小企業センター: "中小企業センター",
  勤労福祉会館: "勤労福祉会館",
  田道住区センター三田分室: "住区センター",
  上目黒住区センター: "住区センター",
  菅刈住区センター: "住区センター",
  東山住区センター: "住区センター",
  中目黒住区センター: "住区センター",
  田道住区センター: "住区センター",
  下目黒住区センター: "住区センター",
  不動住区センター: "住区センター",
  油面住区センター: "住区センター",
  五本木住区センター: "住区センター",
  鷹番住区センター: "住区センター",
  月光原住区センター: "住区センター",
  向原住区センター: "住区センター",
  碑住区センター: "住区センター",
  原町住区センター: "住区センター",
  大岡山東住区センター: "住区センター",
  大岡山西住区センター: "住区センター",
  中根住区センター: "住区センター",
  八雲住区センター: "住区センター",
  東根住区センター: "住区センター",
  めぐろパーシモンホール: "文化ホール",
  中目黒ＧＴプラザホール: "文化ホール",
  東山社会教育館: "社会教育・文化会館",
  中央町社会教育館: "社会教育・文化会館",
  目黒本町社会教育館: "社会教育・文化会館",
  緑が丘文化会館: "社会教育・文化会館",
  区民センター社会教育館: "社会教育・文化会館",
  菅刈住区いこいの家: "いこいの家",
  東山住区いこいの家: "いこいの家",
  烏森住区いこいの家: "いこいの家",
  月光原住区いこいの家: "いこいの家",
  向原住区いこいの家: "いこいの家",
  碑住区いこいの家: "いこいの家",
  大岡山東住区いこいの家: "いこいの家",
};

type ExtractOutput = { division: string; header: string[]; rows: string[][] }[];

function buildISODateStrings(monthHeader: string, dateCells: string[]): string[] {
  const match = monthHeader.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return [];
  const year = parseInt(match[1] as string);
  const month = parseInt(match[2] as string);
  const firstDay = parseInt(dateCells[0] || "");
  if (isNaN(firstDay)) return [];
  const startDate = new Date(year, month - 1, firstDay);
  return dateCells.map((_, i) => format(addDays(startDate, i), "yyyy-MM-dd"));
}

export async function prepare(page: Page, facilityName: string): Promise<Page> {
  const category = CATEGORY_MAP[facilityName];
  if (!category) throw new Error(`Unknown facility: ${facilityName}`);

  await page.goto("https://resv.city.meguro.tokyo.jp/Web/Home/WgR_ModeSelect");
  await page.getByRole("button", { name: category }).click();

  // Wait for the facility list table to load
  await page.locator("table").first().waitFor();

  // Click "さらに読み込む" until facility appears in the list
  const facilityCell = page.getByRole("cell", { name: facilityName, exact: true });
  while ((await facilityCell.count()) === 0) {
    const loadMore = page.getByRole("link", { name: "さらに読み込む" });
    if ((await loadMore.count()) === 0) {
      throw new Error(`Facility not found in category "${category}": ${facilityName}`);
    }
    await loadMore.click();
    await page.waitForTimeout(1000);
  }

  await facilityCell.locator("label").click();
  await page.getByRole("link", { name: "次へ進む" }).click();
  await page.locator("table").first().waitFor();

  return page;
}

async function _extract(page: Page, division: string): Promise<ExtractOutput> {
  const tables = await page.locator("table").all();
  const output: ExtractOutput = [];

  for (const table of tables) {
    await table.waitFor();
    const lines = await table.locator("tr").all();
    if (lines.length < 2) continue;

    const headerRow = lines[0] as NonNullable<(typeof lines)[0]>;
    const header = await Promise.all(
      (await headerRow.locator("th").all()).map((th) => th.innerText())
    );
    // Skip tables that don't look like reservation calendars
    if (!header.some((h) => /\d{4}年\d{1,2}月/.test(h))) continue;

    const rows = await Promise.all(
      lines.slice(1).map(async (line) => {
        const cells = await line.locator("th,td").all();
        return Promise.all(cells.map((c) => c.innerText()));
      })
    );
    // Filter out repeated header rows (month text appearing as room name)
    const dataRows = rows.filter((row) => !/\d{4}年\d{1,2}月/.test(row[0] || ""));

    output.push({ division, header, rows: dataRows });
  }

  return output;
}

export async function extract(
  page: Page,
  startDateString: string,
  maxCount: number
): Promise<ExtractOutput> {
  const output: ExtractOutput = [];

  for (const division of Object.keys(DIVISION_MAP).filter(Boolean)) {
    // Set start date and dismiss the datepicker popup
    const dateInput = page.getByRole("textbox", { name: "表示開始日" });
    await dateInput.fill(startDateString);
    await page.keyboard.press("Escape");

    // Open filter panel and select division
    await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
    await page.getByText(division, { exact: true }).click();
    await page.getByRole("button", { name: "表示" }).click();
    await page.locator("table").first().waitFor();

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

      const nextLink = page.locator("a[href=\"javascript:__doPostBack('period','next')\"]").first();
      if ((await nextLink.count()) === 0) break;
      try {
        await nextLink.click();
        await page.waitForLoadState("domcontentloaded");
        await page.locator("table").first().waitFor();
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
    // header[0] = "2026年3月" (with nav arrows), header[1] = "定員", header[2:] = "12\n木", ...
    const dates = buildISODateStrings(header[0] as string, header.slice(2));
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i] as string;
      acc[date] ||= {};
      for (const row of rows) {
        const roomName = (row[0] || "").trim().split(" ")[0] as string;
        const statuses = row.slice(2);
        acc[date][roomName] ||= {};
        acc[date][roomName][DIVISION_MAP[division] || "RESERVATION_DIVISION_INVALID"] =
          STATUS_MAP[(statuses[i] || "").trim()] || "RESERVATION_STATUS_INVALID";
      }
    }
    return acc;
  }, {});

  return Object.entries(dateRoomReservationMap).flatMap(([date, roomReservation]) =>
    Object.entries(roomReservation).map(([roomName, reservation]) => ({
      room_name: roomName,
      date,
      reservation,
    }))
  );
}
