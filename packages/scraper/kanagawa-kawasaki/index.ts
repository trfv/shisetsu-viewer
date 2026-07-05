import type { Page } from "@playwright/test";
import { defineScraper } from "../common/defineScraper.ts";
import { toISODateString } from "../common/dateUtils.ts";
import { collectPaginated } from "../common/paginate.ts";
import { getCellValue } from "../common/playwrightUtils.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後: "RESERVATION_DIVISION_AFTERNOON",
  午後１: "RESERVATION_DIVISION_AFTERNOON_ONE",
  午後２: "RESERVATION_DIVISION_AFTERNOON_TWO",
  夜間: "RESERVATION_DIVISION_EVENING",
};

const STATUS_MAP: Record<string, Status> = {
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

interface KawasakiTarget {
  facilityName: string;
  roomNames: string[];
}

const targets: KawasakiTarget[] = [
  { facilityName: "国際交流センター", roomNames: ["ホール", "レセプションルーム"] },
  { facilityName: "すくらむ２１", roomNames: ["ホール"] },
  {
    facilityName: "ミューザ川崎シンフォニーホール",
    roomNames: ["音楽ホール", "市民交流室", "練習室１", "練習室３", "練習室２"],
  },
  { facilityName: "川崎市民プラザ", roomNames: ["ステージ", "ふるさと劇場"] },
  { facilityName: "産業振興会館", roomNames: ["ホール"] },
  {
    facilityName: "かわさき老人福祉・地域交流Ｃ",
    roomNames: ["大広間", "工作室", "多目的室", "ホール"],
  },
  { facilityName: "総合福祉センター（エポック）", roomNames: ["ホール"] },
  { facilityName: "幸市民館", roomNames: ["大ホール"] },
  {
    facilityName: "中原市民館",
    roomNames: ["音楽室", "視聴覚室", "第５会議室", "多目的ホール"],
  },
  { facilityName: "高津市民館", roomNames: ["大ホール"] },
  { facilityName: "宮前市民館", roomNames: ["大ホール"] },
  { facilityName: "多摩市民館", roomNames: ["視聴覚室", "大会議室", "大ホール"] },
  { facilityName: "麻生市民館", roomNames: ["大会議室", "大ホール"] },
  { facilityName: "川崎マリエン", roomNames: ["体育室"] },
  { facilityName: "とどろきアリーナ", roomNames: ["メインアリーナ"] },
  {
    facilityName: "カルッツかわさき",
    roomNames: [
      "アクトスタジオ",
      "音楽練習室１",
      "音楽練習室２",
      "ホール１階",
      "ホール１－３階",
      "ホール１－２階",
      "ホール練習利用",
    ],
  },
];

type KawasakiWeek = { caption: string; header: string[]; rows: string[][] };

function toRoomName(caption: string, facilityName: string): string {
  return caption.replace(facilityName, "").slice(0, -4).trim();
}

async function extractWeek(page: Page): Promise<KawasakiWeek> {
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
    rows.push(await Promise.all(line.map((l) => getCellValue(l))));
  }

  return { caption, header, rows };
}

export const scraper = defineScraper({
  municipality: "kanagawa-kawasaki",
  targets,
  horizon: { startOffsetDays: 0, monthsAhead: 13, unit: "calendarWeek" },
  facility: (t) => t.facilityName,
  context: (t) => ({ roomNames: t.roomNames }),

  async prepare(page, target) {
    const startDate = new Date();
    await page.goto("https://www.fureai-net.city.kawasaki.jp/web/index.jsp");
    await page.getByRole("link", { name: "予約", exact: true }).click();
    await page.getByRole("button", { name: "複合検索" }).click();
    await page.getByRole("button", { name: "館" }).click();
    await page.getByRole("link", { name: target.facilityName, exact: true }).click();
    await page.getByLabel("年").selectOption(startDate.getFullYear().toString());
    await page
      .getByLabel("月", { exact: true })
      .selectOption((startDate.getMonth() + 1).toString());
    await page.getByLabel("日から").selectOption(startDate.getDate().toString());
    await page.getByRole("button", { name: "検索開始" }).click();
    return page;
  },

  async extract(page, target, pageCount) {
    const { facilityName, roomNames } = target;
    const output: KawasakiWeek[] = [];

    // 検索結果の読み込みを待ってから部屋を数える
    await page.locator("#rsvaki3").waitFor();

    // フェーズ 1: 全部屋を走査し、スクレイプ対象の部屋のインデックスを記録する
    const targetIndices: number[] = [];
    let roomCount = 1;

    const firstCaption = await page.locator("#rsvaki3 caption").innerText();
    const firstName = toRoomName(firstCaption, facilityName);
    if (roomNames.includes(firstName)) {
      targetIndices.push(0);
    }

    while (true) {
      const nextFacility = page.getByRole("button", { name: "次の施設" });
      if ((await nextFacility.count()) === 0) break;
      try {
        await nextFacility.click();
        await page.locator("#rsvaki3").waitFor();
        const caption = await page.locator("#rsvaki3 caption").innerText();
        const name = toRoomName(caption, facilityName);
        if (roomNames.includes(name)) {
          targetIndices.push(roomCount);
        }
        roomCount++;
      } catch {
        console.warn(`Failed to count rooms at room ${roomCount}.`);
        break;
      }
    }
    await page.getByRole("button", { name: "もどる" }).nth(0).click();
    await page.getByRole("button", { name: "検索開始" }).click();

    // フェーズ 2: 対象の部屋のみスクレイプする
    for (const roomIndex of targetIndices) {
      for (let j = 0; j < roomIndex; j++) {
        await page.getByRole("button", { name: "次の施設" }).click();
        await page.locator("#rsvaki3").waitFor();
      }
      const weeks = await collectPaginated({
        maxPages: pageCount,
        label: `${facilityName} room ${roomIndex + 1}`,
        extractPage: async () => [await extractWeek(page)],
        goNext: async () => {
          const nextWeek = page.getByRole("button", { name: "次の週" }).nth(0);
          if ((await nextWeek.count()) === 0) return false;
          await nextWeek.click();
          return true;
        },
      });
      output.push(...weeks);
      await page.getByRole("button", { name: "もどる" }).nth(0).click();
      await page.getByRole("button", { name: "検索開始" }).click();
    }

    return output;
  },

  transform(extracted, target) {
    // header[0] = 年、header[1:] = 日付列。row[0] = 時間区分、row[1:] = 日付ごとのステータス
    const slots: RawSlot[] = extracted.flatMap(({ caption, header, rows }) => {
      const roomName = toRoomName(caption, target.facilityName);
      const year = header[0] ?? "";
      const dates = header.slice(1);
      return dates.flatMap((dateText, colIndex) =>
        rows.map((row) => ({
          roomName,
          date: toISODateString(`${year}${dateText}`),
          division: row[0] ?? "",
          status: row[colIndex + 1] ?? "",
        }))
      );
    });
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
