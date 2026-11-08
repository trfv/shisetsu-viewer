import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { type DiscoveredTarget, isMusicLikely } from "../common/discover.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

export interface WebrGrandConfig {
  baseUrl: string;
  categoryMap: Readonly<Record<string, string>>;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** 部分一致で複数ヒットするサイトは true */
  facilityCellExact?: boolean;
  /** カテゴリーのボタンが別タブに隠れているサイトで、先に開くリンクの名前 */
  categoryTab?: string;
}

export interface WebrGrandTarget {
  facilityName: string;
  rooms?: readonly string[];
}

type WebrGrandTable = { division: string; header: string[]; rows: string[][] };

// 定員列を挟むサイトと挟まないサイトがあるので、日付セルの位置は見出しから探す。
function dateColumns(header: readonly string[]): { start: number; cells: string[] } {
  const start = header.findIndex(
    (h, i) => i > 0 && /^\d{1,2}$/.test(h.split("\n")[0]?.trim() ?? "")
  );
  return start < 0 ? { start: 0, cells: [] } : { start, cells: header.slice(start) };
}

function buildISODateStrings(monthHeader: string, dateCells: string[]): string[] {
  const match = monthHeader.match(/(\d{4})年(\d{1,2})月/);
  if (!match?.[1] || !match[2]) return [];
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const firstDay = parseInt(dateCells[0] || "");
  if (isNaN(firstDay)) return [];
  const startDate = new Date(year, month - 1, firstDay);
  return dateCells.map((_, i) => format(addDays(startDate, i), "yyyy-MM-dd"));
}

/**
 * 1 区分だけページ送りが途中で切れると、その先の日付が「その区分なし」で出て、
 * api の upsert が reservation を丸ごと置き換えるため前回の正しい値まで消える。
 * 日付は slots でなく見出しから取る（部屋行が 0 件のパスでも日付は取れている）。
 */
export function keepDatesCoveredByAllDivisions(
  slots: readonly RawSlot[],
  tables: readonly WebrGrandTable[],
  divisions: readonly string[]
): RawSlot[] {
  const datesByDivision = new Map<string, Set<string>>(divisions.map((d) => [d, new Set()]));
  for (const { division, header } of tables) {
    for (const date of buildISODateStrings(header[0] ?? "", dateColumns(header).cells)) {
      datesByDivision.get(division)?.add(date);
    }
  }
  const sets = [...datesByDivision.values()];
  const kept: RawSlot[] = [];
  const dropped = new Set<string>();
  for (const slot of slots) {
    if (sets.every((dates) => dates.has(slot.date))) kept.push(slot);
    else dropped.add(slot.date);
  }
  if (dropped.size > 0) {
    const coverage = divisions.map((d) => `${d}=${datesByDivision.get(d)?.size ?? 0}`).join(", ");
    console.warn(
      `Dropped ${dropped.size} dates not covered by every division pass (${coverage}); ` +
        "D1 keeps the previous values for them."
    );
  }
  return kept;
}

async function extractTables(page: Page, division: string): Promise<WebrGrandTable[]> {
  const tables = await page.locator("table").all();
  const output: WebrGrandTable[] = [];

  for (const table of tables) {
    await table.waitFor();
    const lines = await table.locator("tr").all();
    const headerRow = lines[0];
    if (lines.length < 2 || !headerRow) continue;

    const header = await Promise.all(
      (await headerRow.locator("th").all()).map((th) => th.innerText())
    );
    if (!header.some((h) => /\d{4}年\d{1,2}月/.test(h))) continue;

    const rows = await Promise.all(
      lines.slice(1).map(async (line) => {
        const cells = await line.locator("th,td").all();
        return Promise.all(cells.map((c) => c.innerText()));
      })
    );
    // 繰り返しヘッダー行は月表示が部屋名の位置に来る
    const dataRows = rows.filter((row) => !/\d{4}年\d{1,2}月/.test(row[0] || ""));

    output.push({ division, header, rows: dataRows });
  }

  return output;
}

const NAV_BUTTON_RE = /ログイン|検索|メニュー|閉じる|次へ|戻る|もどる|表示|絞り込む/;

/** target は施設単位（部屋は抽出時にテーブル行として取れる）なので部屋は列挙しない */
export async function discoverWebrGrandTargets(
  page: Page,
  opts: Pick<WebrGrandConfig, "baseUrl">
): Promise<DiscoveredTarget[]> {
  const MAX_LOAD_MORE = 50;

  await page.goto(opts.baseUrl);
  const buttonTexts = await page.getByRole("button").allInnerTexts();
  const categories = buttonTexts
    .map((t) => t.trim())
    .filter((t) => t !== "" && !NAV_BUTTON_RE.test(t));

  const targets: DiscoveredTarget[] = [];
  for (const category of categories) {
    await page.goto(opts.baseUrl);
    await page.getByRole("button", { name: category }).click();
    await page.locator("table").first().waitFor();

    for (let i = 0; i < MAX_LOAD_MORE; i++) {
      const loadMore = page.getByRole("link", { name: "さらに読み込む" });
      if ((await loadMore.count()) === 0) break;
      await loadMore.click();
      await page.waitForTimeout(1000);
    }

    const rows = await page.locator("table tr").all();
    for (const row of rows) {
      const firstCell = row.locator("th,td").first();
      if ((await firstCell.count()) === 0) continue;
      const facilityName = (await firstCell.innerText()).trim().split("\n")[0]?.trim() ?? "";
      if (facilityName === "") continue;
      targets.push({
        facilityName,
        category,
        musicLikely: isMusicLikely(facilityName),
        target: { facilityName },
      });
    }
  }
  return targets;
}

function roomNameOf(cell: string): string {
  return cell.trim().split(" ")[0] || "";
}

async function showFromToday(page: Page, division: string): Promise<void> {
  await page.getByRole("textbox", { name: "表示開始日" }).fill(format(new Date(), "yyyy/M/d"));
  await page.keyboard.press("Escape");
  // 開閉が postback をまたいで残るサイトがあり、無条件に押すと閉じてしまう。
  const option = page
    .locator("label")
    .filter({ hasText: new RegExp(`^${division}$`) })
    .first();
  if (!(await option.isVisible())) {
    await page.getByRole("button", { name: "その他の条件で絞り込む" }).click();
  }
  await option.click();
  await page.getByRole("button", { name: "表示" }).click();
  await page.locator("table").first().waitFor();
}

async function goNextPeriod(page: Page): Promise<boolean> {
  const nextLink = page.locator("a[href=\"javascript:__doPostBack('period','next')\"]").first();
  if ((await nextLink.count()) === 0) return false;
  await nextLink.click();
  await page.waitForLoadState("domcontentloaded");
  await page.locator("table").first().waitFor();
  return true;
}

export function webrGrandHooks(config: WebrGrandConfig): {
  prepare: (page: Page, target: WebrGrandTarget) => Promise<Page>;
  extract: (page: Page, target: WebrGrandTarget, pageCount: number) => Promise<WebrGrandTable[]>;
  transform: (extracted: WebrGrandTable[], target: WebrGrandTarget) => TransformOutput;
  discover: (page: Page) => Promise<DiscoveredTarget[]>;
} {
  const divisions = Object.keys(config.divisionMap).filter(Boolean);

  return {
    async prepare(page, target) {
      const category = config.categoryMap[target.facilityName];
      if (!category) throw new Error(`Unknown facility: ${target.facilityName}`);

      await page.goto(config.baseUrl);
      if (config.categoryTab) await page.getByRole("link", { name: config.categoryTab }).click();
      await page.getByRole("button", { name: category }).click();
      await page.locator("table").first().waitFor();

      const facilityCell = page.getByRole("cell", {
        name: target.facilityName,
        ...(config.facilityCellExact && { exact: true }),
      });
      while ((await facilityCell.count()) === 0) {
        const loadMore = page.getByRole("link", { name: "さらに読み込む" });
        if ((await loadMore.count()) === 0) {
          throw new Error(`Facility not found in category "${category}": ${target.facilityName}`);
        }
        await loadMore.click();
        await page.waitForTimeout(1000);
      }

      await facilityCell.locator("label").click();
      await page.getByRole("link", { name: "次へ進む" }).click();
      await page.locator("table").first().waitFor();
      return page;
    },

    async extract(page, target, pageCount) {
      const output: WebrGrandTable[] = [];

      for (const division of divisions) {
        await showFromToday(page, division);
        const tables = await collectPaginated({
          maxPages: pageCount,
          label: `${target.facilityName} ${division}`,
          extractPage: () => extractTables(page, division),
          goNext: () => goNextPeriod(page),
        });
        output.push(...tables);
      }

      return output;
    },

    transform(extracted, target) {
      const allSlots: RawSlot[] = extracted.flatMap(({ division, header, rows }) => {
        const { start, cells } = dateColumns(header);
        const dates = buildISODateStrings(header[0] ?? "", cells);
        return dates.flatMap((date, i) =>
          rows.map((row) => ({
            roomName: roomNameOf(row[0] ?? ""),
            date,
            division,
            status: (row[i + start] || "").trim(),
          }))
        );
      });
      const { rooms } = target;
      const slots = rooms ? allSlots.filter((s) => rooms.includes(s.roomName)) : allSlots;
      const seen = new Set(slots.map((s) => s.roomName));
      const unseen = (rooms ?? []).filter((r) => !seen.has(r));
      if (allSlots.length > 0 && unseen.length > 0) {
        console.warn(`Rooms not found in ${target.facilityName}: ${unseen.join(", ")}`);
      }
      return rawSlotsToOutput(
        keepDatesCoveredByAllDivisions(slots, extracted, divisions),
        config.divisionMap,
        config.statusMap
      );
    },

    discover(page) {
      return discoverWebrGrandTargets(page, config);
    },
  };
}

export interface WebrGrandSlotConfig extends WebrGrandConfig {
  /** 時間帯別の画面へ一度に送れる「部屋 × 日」の上限 */
  maxSelection: number;
}

type WebrGrandSlotTable = { date: string; header: string[]; rows: string[][] };
export type WebrGrandSlotPage = { days: WebrGrandTable[]; slots: WebrGrandSlotTable[] };

const ALL_DAY = "全日";
const PARTIAL = "△";

function slotDateToISO(dateHeader: string): string | null {
  const match = dateHeader.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return format(new Date(+match[1], +match[2] - 1, +match[3]), "yyyy-MM-dd");
}

export function normalizeSlotHeader(header: string): string {
  return header.replace(/\s+/g, "").replace(/〜/g, "～");
}

async function pickCheckValues(
  page: Page,
  rooms: readonly string[] | undefined,
  knownRooms: ReadonlySet<string>
): Promise<string[]> {
  return page.locator("table tr").evaluateAll(
    (trs, { wanted, known, partial }) => {
      const picked: string[] = [];
      for (const tr of trs) {
        const cells = [...tr.querySelectorAll("th,td")].filter((c) => c instanceof HTMLElement);
        const room = (cells[0]?.innerText ?? "").trim().split(" ")[0] ?? "";
        if (wanted && !wanted.includes(room)) continue;
        let learnSlots = !known.includes(room);
        for (const cell of cells.slice(1)) {
          const input = cell.querySelector('input[name="checkdate"]');
          if (!(input instanceof HTMLInputElement)) continue;
          if (cell.innerText.trim() === partial || learnSlots) {
            picked.push(input.value);
            learnSlots = false;
          }
        }
      }
      return picked;
    },
    { wanted: rooms ? [...rooms] : null, known: [...knownRooms], partial: PARTIAL }
  );
}

async function checkOnly(page: Page, values: readonly string[]): Promise<void> {
  await page.locator('input[name="checkdate"]').evaluateAll(
    (inputs, wanted) => {
      for (const input of inputs) {
        if (!(input instanceof HTMLInputElement)) continue;
        if (input.checked !== wanted.includes(input.value)) input.click();
      }
    },
    [...values]
  );
}

async function readSlotTables(page: Page): Promise<WebrGrandSlotTable[]> {
  // 記号の代わりにアイコンだけを置くセルがある（取消処理中）。その class を値として読む。
  const tables = await page.locator("table").evaluateAll((elements) =>
    elements.map((table) =>
      [...table.querySelectorAll("tr")].map((tr) =>
        [...tr.querySelectorAll("th,td")].map((c) => {
          const text = c instanceof HTMLElement ? c.innerText.trim() : "";
          return text || (c.querySelector("i")?.className.trim() ?? "");
        })
      )
    )
  );
  return tables.flatMap(([header, ...rows]) => {
    const date = slotDateToISO(header?.[0] ?? "");
    if (!header || !date) return [];
    return [{ date, header: header.slice(1).map(normalizeSlotHeader), rows }];
  });
}

async function fetchSlotTables(
  page: Page,
  values: readonly string[],
  maxSelection: number
): Promise<WebrGrandSlotTable[]> {
  const output: WebrGrandSlotTable[] = [];
  for (let i = 0; i < values.length; i += maxSelection) {
    await checkOnly(page, values.slice(i, i + maxSelection));
    await page.getByRole("link", { name: "次へ進む" }).click();
    await page.waitForURL(/Jikantaibetsu/);
    output.push(...(await readSlotTables(page)));
    await page.getByRole("link", { name: "前に戻る" }).click();
    await page.waitForURL(/Shisetsubetsu/);
    await page.locator("table").first().waitFor();
  }
  // 戻った画面はチェックを保持しており、残すと次の期間の postback に乗る。
  await checkOnly(page, []);
  return output;
}

export function slotPagesToRawSlots(
  pages: readonly WebrGrandSlotPage[],
  rooms: readonly string[] | undefined
): { slots: RawSlot[]; dropped: string[] } {
  const detail = new Map<string, Map<string, string>>();
  const slotsOfRoom = new Map<string, string[]>();
  for (const { date, header, rows } of pages.flatMap((p) => p.slots)) {
    for (const row of rows) {
      const room = roomNameOf(row[0] ?? "");
      detail.set(`${room}|${date}`, new Map(header.map((h, i) => [h, (row[i + 1] ?? "").trim()])));
      if (!slotsOfRoom.has(room)) slotsOfRoom.set(room, header);
    }
  }

  const slots: RawSlot[] = [];
  const dropped: string[] = [];
  for (const { header, rows } of pages.flatMap((p) => p.days)) {
    const { start, cells } = dateColumns(header);
    const dates = buildISODateStrings(header[0] ?? "", cells);
    for (const row of rows) {
      const roomName = roomNameOf(row[0] ?? "");
      if (rooms && !rooms.includes(roomName)) continue;
      dates.forEach((date, i) => {
        const bySlot = detail.get(`${roomName}|${date}`);
        if (bySlot) {
          for (const [division, status] of bySlot) slots.push({ roomName, date, division, status });
          return;
        }
        const dayStatus = (row[i + start] ?? "").trim();
        const slotHeaders = slotsOfRoom.get(roomName);
        if (dayStatus === PARTIAL || !slotHeaders) {
          dropped.push(`${roomName} ${date}`);
          return;
        }
        for (const division of slotHeaders)
          slots.push({ roomName, date, division, status: dayStatus });
      });
    }
  }
  return { slots, dropped };
}

/** 全日表示の ○・× などは全コマへ展開し、△ の日だけ時間帯別の画面でコマごとに取る */
export function webrGrandSlotHooks(config: WebrGrandSlotConfig): {
  prepare: (page: Page, target: WebrGrandTarget) => Promise<Page>;
  extract: (page: Page, target: WebrGrandTarget, pageCount: number) => Promise<WebrGrandSlotPage[]>;
  transform: (extracted: WebrGrandSlotPage[], target: WebrGrandTarget) => TransformOutput;
  discover: (page: Page) => Promise<DiscoveredTarget[]>;
} {
  const { prepare, discover } = webrGrandHooks(config);

  return {
    prepare,
    discover,

    async extract(page, target, pageCount) {
      await showFromToday(page, ALL_DAY);
      const knownRooms = new Set<string>();
      return collectPaginated({
        maxPages: pageCount,
        label: `${target.facilityName} ${ALL_DAY}`,
        extractPage: async () => {
          const days = await extractTables(page, ALL_DAY);
          const values = await pickCheckValues(page, target.rooms, knownRooms);
          const slots = await fetchSlotTables(page, values, config.maxSelection);
          for (const { rows } of slots)
            for (const row of rows) knownRooms.add(roomNameOf(row[0] ?? ""));
          return [{ days, slots }];
        },
        goNext: () => goNextPeriod(page),
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
      const seen = new Set(slots.map((s) => s.roomName));
      const unseen = (target.rooms ?? []).filter((r) => !seen.has(r));
      if (extracted.length > 0 && unseen.length > 0) {
        console.warn(`Rooms not found in ${target.facilityName}: ${unseen.join(", ")}`);
      }
      return rawSlotsToOutput(slots, config.divisionMap, config.statusMap);
    },
  };
}
