import type { Page } from "@playwright/test";

import { defineScraper } from "../common/defineScraper.ts";
import { pagesForHorizon } from "../common/horizon.ts";
import { collectPaginated } from "../common/paginate.ts";
import { rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";
import {
  normalizeSlotHeader,
  slotPagesToRawSlots,
  type WebrGrandSlotPage,
} from "../engines/webrGrand.ts";

export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  "9:00～12:00": "RESERVATION_DIVISION_MORNING",
  "13:00～17:00": "RESERVATION_DIVISION_AFTERNOON",
  "9:00～21:00": "RESERVATION_DIVISION_DIVISION_1",
  "18:00～21:00": "RESERVATION_DIVISION_EVENING_ONE",
  "21:00～22:00": "RESERVATION_DIVISION_EVENING_TWO",
};

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "○": "RESERVATION_STATUS_VACANT",
  "△": "RESERVATION_STATUS_STATUS_1",
  "×": "RESERVATION_STATUS_STATUS_2",
  "－": "RESERVATION_STATUS_STATUS_3",
  休館日: "RESERVATION_STATUS_STATUS_4",
  保守作業: "RESERVATION_STATUS_STATUS_5",
  休館: "RESERVATION_STATUS_STATUS_6",
  工事: "RESERVATION_STATUS_STATUS_7",
};

interface TaitoTarget {
  facilityName: string;
  category: string;
  rooms: readonly string[];
  monthsAhead: number;
}

const BASE_URL = "https://shisetsu.city.taito.lg.jp/";
const MAX_SELECTION = 10;
const PARTIAL = "△";
const OUT_OF_PERIOD = "－";
const DAY_TABLE = "table[id$=dgTable]";

const LEARNING_CENTER = "生涯学習センター";
const SOCIAL_EDUCATION = "社会教育施設";
const KUMINKAN = "区民館施設・台東区民会館";

const targets: TaitoTarget[] = [
  {
    facilityName: "学習館",
    category: LEARNING_CENTER,
    rooms: [
      "スタジオ１",
      "スタジオ２≪ミキシングルーム付≫",
      "３１２リハーサル室",
      "３１３リハーサル室",
      "３１５リハーサル室",
      "３１６リハーサル室",
    ],
    monthsAhead: 3,
  },
  {
    facilityName: "ミレニアムホール",
    category: LEARNING_CENTER,
    rooms: ["ホール（全日利用）", "ホール（全日以外）"],
    monthsAhead: 12,
  },
  {
    facilityName: "社会教育センター",
    category: SOCIAL_EDUCATION,
    rooms: ["ホール", "会議室"],
    monthsAhead: 3,
  },
  {
    facilityName: "千束社会教育館",
    category: SOCIAL_EDUCATION,
    rooms: ["ホール", "会議室"],
    monthsAhead: 3,
  },
  {
    facilityName: "根岸社会教育館",
    category: SOCIAL_EDUCATION,
    rooms: ["ホール", "第１会議室", "第２会議室"],
    monthsAhead: 3,
  },
  {
    facilityName: "今戸社会教育館",
    category: SOCIAL_EDUCATION,
    rooms: ["ホール", "第１会議室", "第２会議室"],
    monthsAhead: 3,
  },
  {
    facilityName: "台東一丁目区民館",
    category: KUMINKAN,
    rooms: ["多目的ホール", "プレイルーム", "軽運動コーナー"],
    monthsAhead: 3,
  },
  {
    facilityName: "東上野区民館",
    category: KUMINKAN,
    rooms: ["３０１集会室和室"],
    monthsAhead: 3,
  },
  { facilityName: "上野区民館", category: KUMINKAN, rooms: ["軽運動コーナー"], monthsAhead: 3 },
  { facilityName: "入谷区民館", category: KUMINKAN, rooms: ["多目的ホール"], monthsAhead: 3 },
  { facilityName: "金杉区民館", category: KUMINKAN, rooms: ["軽運動コーナー"], monthsAhead: 3 },
  {
    facilityName: "金杉区民館下谷分館",
    category: KUMINKAN,
    rooms: ["多目的ホール"],
    monthsAhead: 3,
  },
  {
    facilityName: "谷中区民館",
    category: KUMINKAN,
    rooms: [
      "第１集会室",
      "第２集会室",
      "第３集会室",
      "第１・２集会室",
      "第２・３集会室",
      "第１・２・３集会室",
      "多目的ホール",
    ],
    monthsAhead: 3,
  },
  {
    facilityName: "浅草橋区民館",
    category: KUMINKAN,
    rooms: ["第１集会室", "第３集会室", "多目的ホール", "軽運動コーナー"],
    monthsAhead: 3,
  },
  { facilityName: "寿区民館", category: KUMINKAN, rooms: ["多目的ホール"], monthsAhead: 3 },
  { facilityName: "雷門区民館", category: KUMINKAN, rooms: ["軽運動コーナー"], monthsAhead: 3 },
];

type DayTable = WebrGrandSlotPage["days"][number];
type SlotTable = WebrGrandSlotPage["slots"][number];

async function submit(page: Page, selector: string, url: RegExp): Promise<void> {
  await Promise.all([page.waitForURL(url), page.click(selector, { noWaitAfter: true })]);
  await page.waitForLoadState("load");
}

function roomNameOf(cell: string): string {
  return cell.trim().split(/\s/)[0] ?? "";
}

// 選択中のセルは「選択△」と表示される。
function cellText(raw: string): string {
  return raw.trim().replace(/^選択/, "");
}

async function readLines(table: ReturnType<Page["locator"]>): Promise<string[][]> {
  return table
    .locator("tr")
    .evaluateAll((trs) =>
      trs.map((tr) =>
        tr instanceof HTMLTableRowElement
          ? [...tr.cells].map((c) => (c instanceof HTMLElement ? c.innerText : ""))
          : []
      )
    );
}

async function readDayTable(page: Page): Promise<DayTable> {
  const table = page.locator(DAY_TABLE).first();
  await table.waitFor();
  const [header = [], ...rows] = await readLines(table);
  if (header.length === 0) throw new Error("Day table has no header row");
  return {
    division: "全日",
    // 日付の見出しは「15 日」のように曜日と空白で区切られ、エンジンは改行区切りを前提にする。
    header: header.map((h) => h.trim().split(/\s+/).join("\n")),
    rows: rows.map((row) => row.map(cellText)),
  };
}

function slotDateToISO(heading: string): string | null {
  const match = heading.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

async function readSlotTables(page: Page): Promise<SlotTable[]> {
  const tables = await page.locator(DAY_TABLE).all();
  const output: SlotTable[] = [];
  for (const table of tables) {
    const [header = [], ...rows] = await readLines(table);
    const date = slotDateToISO(header[0] ?? "");
    if (!date) continue;
    // 定員の列を落とさないと、エンジンが定員を時間帯として扱う。
    const capacity = header.findIndex((h) => h.trim() === "定員");
    const drop = (cells: string[]): string[] => cells.filter((_, i) => i !== capacity);
    output.push({
      date,
      header: drop(header).slice(1).map(normalizeSlotHeader),
      rows: rows.map((row) => drop(row).map(cellText)),
    });
  }
  return output;
}

async function toggleFacility(page: Page, target: TaitoTarget): Promise<void> {
  await Promise.all([
    page.waitForURL(/ShisetsuIchiran/),
    page.getByRole("button", { name: target.category, exact: true }).click({ noWaitAfter: true }),
  ]);
  await page.waitForLoadState("load");
  const facility = page.getByRole("button", { name: target.facilityName, exact: true });
  if ((await facility.count()) === 0) {
    throw new Error(`Facility not found in category "${target.category}": ${target.facilityName}`);
  }
  await facility.click();
}

async function pickCellIds(
  page: Page,
  rooms: readonly string[],
  knownRooms: ReadonlySet<string>
): Promise<string[]> {
  return page.locator(`${DAY_TABLE} tr`).evaluateAll(
    (trs, { wanted, known, partial }) => {
      const picked: string[] = [];
      for (const tr of trs) {
        if (!(tr instanceof HTMLTableRowElement)) continue;
        const room = (tr.cells[0]?.innerText ?? "").trim().split(/\s/)[0] ?? "";
        if (!wanted.includes(room)) continue;
        let learnSlots = !known.includes(room);
        for (const cell of [...tr.cells].slice(1)) {
          const link = cell.querySelector("a[id]");
          if (!link) continue;
          const text = cell.innerText.trim().replace(/^選択/, "");
          if (text === partial || learnSlots) {
            picked.push(link.id);
            learnSlots = false;
          }
        }
      }
      return picked;
    },
    { wanted: [...rooms], known: [...knownRooms], partial: PARTIAL }
  );
}

async function clearSelection(page: Page): Promise<void> {
  const selected = page.locator(`${DAY_TABLE} a`, { hasText: "選択" });
  for (let n = await selected.count(); n > 0; n--) await selected.first().click();
}

async function fetchSlotTables(page: Page, ids: readonly string[]): Promise<SlotTable[]> {
  const output: SlotTable[] = [];
  for (let i = 0; i < ids.length; i += MAX_SELECTION) {
    for (const id of ids.slice(i, i + MAX_SELECTION)) await page.locator(`[id="${id}"]`).click();
    await submit(page, "#ucPCFooter_btnForward", /Jikantaibetsu/);
    output.push(...(await readSlotTables(page)));
    await submit(page, "#ucPCFooter_btnBack", /ShisetsubetsuAkiJoukyou/);
    // 戻った画面は選択を保持しており、残すと次の期間の postback に乗る。
    await clearSelection(page);
  }
  return output;
}

async function goNextPeriod(page: Page): Promise<boolean> {
  const next = page.locator("#btnNextPeriod");
  if ((await next.count()) === 0 || (await next.isDisabled())) return false;
  const before = await page
    .locator(DAY_TABLE)
    .first()
    .evaluate((t) => t.textContent);
  await next.click({ noWaitAfter: true });
  await page.waitForFunction(
    // 再描画の途中はテーブルが無く、undefined !== prev で通り抜けて空の見出しを読んでしまう。
    ([selector, prev]) => {
      const table = document.querySelector(selector);
      return table !== null && table.textContent !== prev;
    },
    [DAY_TABLE, before] as const
  );
  await page.waitForLoadState("load");
  return true;
}

function dayStatuses(day: DayTable, rooms: readonly string[]): string[] {
  const dateStart = day.header.findIndex(
    (h, i) => i > 0 && /^\d{1,2}$/.test(h.split("\n")[0] ?? "")
  );
  return day.rows
    .filter((row) => rooms.includes(roomNameOf(row[0] ?? "")))
    .flatMap((row) => row.slice(dateStart));
}

export const scraper = defineScraper({
  municipality: "tokyo-taito",
  targets,
  horizon: (t) =>
    pagesForHorizon({ startOffsetDays: 1, monthsAhead: t.monthsAhead, unit: "twoWeeks" }),
  facility: (t) => t.facilityName,

  async prepare(page, target) {
    await page.goto(BASE_URL);
    await toggleFacility(page, target);
    await submit(page, "#ucPCFooter_btnForward", /NichijiSentaku/);
    await page.click("#rbtnTwoWeek");
    await page.click("#rbtnAllday");
    await submit(page, "#ucPCFooter_btnForward", /ShisetsubetsuAkiJoukyou/);
    return page;
  },

  async extract(page, target, pageCount) {
    const knownRooms = new Set<string>();
    let seenOpen = false;
    let periodEnded = false;
    return collectPaginated({
      maxPages: pageCount,
      label: target.facilityName,
      extractPage: async () => {
        const day = await readDayTable(page);
        const statuses = dayStatuses(day, target.rooms);
        const open = statuses.some((s) => /[○△×]/.test(s));
        seenOpen ||= open;
        // 受付開始前の週も全セルが「－」なので、受付中の週を見てから打ち切る。
        periodEnded = seenOpen && !open && statuses.includes(OUT_OF_PERIOD);

        const ids = await pickCellIds(page, target.rooms, knownRooms);
        const slots = await fetchSlotTables(page, ids);
        for (const { rows } of slots)
          for (const row of rows) knownRooms.add(roomNameOf(row[0] ?? ""));
        return [{ days: [day], slots }];
      },
      goNext: async () => !periodEnded && (await goNextPeriod(page)),
    });
  },

  transform(extracted, target) {
    const { slots, dropped } = slotPagesToRawSlots(extracted, target.rooms);
    if (dropped.length > 0) {
      console.warn(
        `Dropped ${dropped.length} room-days without slot detail in ${target.facilityName} ` +
          `(e.g. ${dropped.slice(0, 3).join(", ")}); D1 keeps the previous values for them.`
      );
    }
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
