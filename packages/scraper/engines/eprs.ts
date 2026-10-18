import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { type DiscoveredTarget, isMusicLikely } from "../common/discover.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

// 検索結果は空きのある部屋に絞られるが、週の JSON は部屋コードを直接渡せば全部屋を返す。
// 検索はサーバ側セッションの初期化にだけ使う（経ないと JSON が ErrManager になる）。
// 受付期間より先も全セル「受付期間外」で 1 年以上返り続けるため、その週で打ち切る。

const SEARCH_PATH = "index.jsp";
const WEEK_AJAX_PATH = "rsvWOpeInstSrchVacantAjaxAction.do";
const MODE_LOAD_WEEK = "11";
const DAYS_PER_PAGE = 7;

export interface EprsTarget {
  /** index.jsp の「どこで」の選択肢と一致させる */
  facilityName: string;
  roomName: string;
  bldCd: string;
  instCd: string;
}

export interface EprsConfig {
  /** 末尾スラッシュ必須（new URL で相対解決するため） */
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
  searchPurpose: string;
  outOfPeriodStatus: string;
  discoverPurposes: readonly string[];
}

interface EprsCell {
  useDay: number;
  alt: string;
}

export interface EprsZone {
  tzoneName: string;
  timeResult: EprsCell[];
}

function parseCell(value: unknown): EprsCell {
  if (
    typeof value !== "object" ||
    value === null ||
    !("useDay" in value) ||
    !("alt" in value) ||
    typeof value.useDay !== "number" ||
    typeof value.alt !== "string"
  ) {
    throw new Error(`eprs: セルの形式が想定と異なります: ${JSON.stringify(value)}`);
  }
  return { useDay: value.useDay, alt: value.alt };
}

function parseZone(value: unknown): EprsZone {
  if (
    typeof value !== "object" ||
    value === null ||
    !("tzoneName" in value) ||
    !("timeResult" in value) ||
    typeof value.tzoneName !== "string" ||
    !Array.isArray(value.timeResult)
  ) {
    throw new Error(`eprs: 時間帯の形式が想定と異なります: ${JSON.stringify(value)}`);
  }
  return { tzoneName: value.tzoneName, timeResult: value.timeResult.map(parseCell) };
}

export function parseWeekResponse(json: unknown): EprsZone[] {
  if (typeof json !== "object" || json === null) {
    throw new Error("eprs: 応答が JSON オブジェクトではありません");
  }
  if ("ErrManager" in json) {
    throw new Error(`eprs: サーバがエラーを返しました: ${JSON.stringify(json.ErrManager)}`);
  }
  if (!("result" in json) || !Array.isArray(json.result)) {
    throw new Error(`eprs: result がありません: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.result.map(parseZone);
}

export function dayNumberToIso(useDay: number): string {
  const text = String(useDay);
  if (!/^\d{8}$/.test(text)) {
    throw new Error(`eprs: useDay が yyyyMMdd ではありません: ${useDay}`);
  }
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

export function isOutOfPeriodWeek(zones: readonly EprsZone[], outOfPeriodStatus: string): boolean {
  const cells = zones.flatMap((zone) => zone.timeResult);
  return cells.length > 0 && cells.every((cell) => cell.alt === outOfPeriodStatus);
}

/** 先頭日の食い違いで投げる。セッションの表示位置がずれると別の週のデータを保存してしまう */
export function buildSlots(
  weeks: readonly { startDay: number; zones: readonly EprsZone[] }[],
  roomName: string
): RawSlot[] {
  const slots: RawSlot[] = [];
  for (const { startDay, zones } of weeks) {
    const firstDay = zones[0]?.timeResult[0]?.useDay;
    if (firstDay !== startDay) {
      throw new Error(`eprs: ${startDay} を要求しましたが ${firstDay} からの週が返りました`);
    }
    for (const zone of zones) {
      for (const cell of zone.timeResult) {
        slots.push({
          roomName,
          date: dayNumberToIso(cell.useDay),
          division: zone.tzoneName,
          status: cell.alt,
        });
      }
    }
  }
  return slots;
}

/**
 * 結果が「該当なし」でもセッションは初期化される。
 * discover は wholeMonth にする（既定の 1 週間では空きのある部屋の絞り込みが狭い）。
 */
async function search(
  page: Page,
  config: EprsConfig,
  area: string,
  purpose: string,
  wholeMonth = false
) {
  await page.goto(new URL(SEARCH_PATH, config.baseUrl).href);
  // ラジオ本体は装飾用の label に覆われているので label を押す
  if (wholeMonth) await page.locator('label[for="thismonth"]').click();
  await page.locator("#bname").selectOption({ label: area });
  await page.locator("#purpose").selectOption({ label: purpose });
  await Promise.all([
    page.waitForURL(/rsvWOpeInstSrchVacantAction\.do/),
    page.locator("#btn-go").click(),
  ]);
  await page.waitForLoadState("networkidle");
}

async function fetchWeek(
  page: Page,
  config: EprsConfig,
  target: EprsTarget,
  startDay: number
): Promise<EprsZone[]> {
  const response = await page.request.post(new URL(WEEK_AJAX_PATH, config.baseUrl).href, {
    form: {
      displayNo: "prwrc2000",
      useDay: String(startDay),
      bldCd: target.bldCd,
      instCd: target.instCd,
      transVacantMode: MODE_LOAD_WEEK,
      clearFlag: "0",
    },
  });
  if (!response.ok()) {
    throw new Error(`eprs: 週の取得が HTTP ${response.status()} で失敗しました`);
  }
  const text = new TextDecoder("shift_jis").decode(await response.body());
  return parseWeekResponse(JSON.parse(text));
}

async function readOptions(
  page: Page,
  selector: string
): Promise<{ value: string; name: string }[]> {
  return page.locator(`${selector} option`).evaluateAll((options) =>
    options.map((option) => ({
      value: option.getAttribute("value") ?? "",
      name: option.textContent ?? "",
    }))
  );
}

async function readRoomOptions(page: Page): Promise<EprsTarget[]> {
  const buildings = await readOptions(page, "#mansion-select");
  const found: EprsTarget[] = [];
  for (const building of buildings) {
    const select = page.locator("#mansion-select");
    if ((await select.inputValue()) !== building.value) {
      await select.selectOption(building.value);
      // 館を切り替えると施設の選択肢と週表示が Ajax で入れ替わる
      await page.waitForFunction(
        (name) => document.querySelector("#week-info caption")?.textContent?.startsWith(name),
        building.name
      );
    }
    const rooms = await readOptions(page, "#facility-select");
    for (const room of rooms) {
      found.push({
        facilityName: building.name,
        roomName: room.name,
        bldCd: building.value,
        instCd: room.value,
      });
    }
  }
  return found;
}

/** 検索結果は 1 ヶ月内に空きのある部屋に絞られるため、満室の部屋は漏れうる */
async function discoverEprsTargets(page: Page, config: EprsConfig): Promise<DiscoveredTarget[]> {
  await page.goto(new URL(SEARCH_PATH, config.baseUrl).href);
  // 「荏原地区(すべて)」のような地区の選択肢は値が "<地区>_0"
  const areas = (await readOptions(page, "#bname"))
    .filter((option) => option.value.endsWith("_0"))
    .map((option) => option.name);

  const byKey = new Map<string, DiscoveredTarget>();
  for (const purpose of config.discoverPurposes) {
    for (const area of areas) {
      await search(page, config, area, purpose, true);
      for (const target of await readRoomOptions(page)) {
        const key = `${target.bldCd}-${target.instCd}`;
        const existing = byKey.get(key);
        const category = existing?.category ? `${existing.category}、${purpose}` : purpose;
        byKey.set(key, {
          facilityName: target.facilityName,
          roomName: target.roomName,
          category,
          musicLikely: isMusicLikely(target.facilityName, target.roomName),
          target: { ...target },
        });
      }
    }
  }
  return [...byKey.values()];
}

export function eprsHooks(config: EprsConfig): {
  prepare: (page: Page, target: EprsTarget) => Promise<Page>;
  extract: (page: Page, target: EprsTarget, pageCount: number) => Promise<RawSlot[]>;
  transform: (extracted: RawSlot[], target: EprsTarget) => TransformOutput;
  discover: (page: Page) => Promise<DiscoveredTarget[]>;
} {
  return {
    async prepare(page, target) {
      await search(page, config, target.facilityName, config.searchPurpose);
      return page;
    },

    async extract(page, target, pageCount) {
      const start = addDays(new Date(), config.startOffsetDays);
      const weeks = await collectPaginated({
        maxPages: pageCount,
        label: `${target.facilityName} ${target.roomName}`,
        extractPage: async (pageIndex) => {
          const startDay = Number(format(addDays(start, pageIndex * DAYS_PER_PAGE), "yyyyMMdd"));
          const zones = await fetchWeek(page, config, target, startDay);
          // 先頭週は当日近くが受付期間外になりうるので、2 週目以降だけ打ち切りを判定する
          if (pageIndex > 0 && isOutOfPeriodWeek(zones, config.outOfPeriodStatus)) return null;
          return [{ startDay, zones }];
        },
        // 週は開始日を指定して取り直すので、画面上のページ送りは無い
        goNext: async () => true,
      });
      return buildSlots(weeks, target.roomName);
    },

    transform(extracted) {
      return rawSlotsToOutput(extracted, config.divisionMap, config.statusMap);
    },

    discover(page) {
      return discoverEprsTargets(page, config);
    },
  };
}
