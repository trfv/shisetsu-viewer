import type { Page } from "@playwright/test";
import { addDays, format } from "date-fns";

import { type DiscoveredTarget, isMusicLikely } from "../common/discover.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status, TransformOutput } from "../common/types.ts";

/**
 * e-PRS 施設予約システム（www.cm9.eprs.jp/<自治体>/web/）用エンジン。
 * 採用自治体: tokyo-shinagawa
 *
 * ナビゲーション: index.jsp の「空き状況検索」で どこで（館）＋ 何をする（利用目的）を
 * 指定して検索すると、空き状況画面（rsvWOpeInstSrchVacantAction.do）に移る。
 * 画面の週表示は rsvWOpeInstSrchVacantAjaxAction.do が返す JSON から描かれる。
 * transVacantMode=11 に館コード・部屋コード・開始日を渡すと、その日から 7 日分が返る。
 *
 * - 検索結果は「期間内に空きがある部屋」に絞られるが、週の JSON は部屋コードを直接
 *   指定すれば検索結果に無い部屋も返る。検索はサーバ側セッションの初期化にだけ使う
 *   （検索を経ないと JSON は ErrManager「システム異常が発生しました。」になる）
 * - 応答は Windows-31J。受付期間より先の日付も 1 年以上返り続け、全セルが「受付期間外」になる
 * - 受付期間は部屋ごとに 1〜13 ヶ月と大きく異なるため、horizon は最長に合わせ、
 *   全セルが受付期間外の週に達したら打ち切る
 */

const SEARCH_PATH = "index.jsp";
const WEEK_AJAX_PATH = "rsvWOpeInstSrchVacantAjaxAction.do";
/** 開始日を指定して 1 週間分を読み込むモード（画面の部屋切り替えと同じ） */
const MODE_LOAD_WEEK = "11";
const DAYS_PER_PAGE = 7;

export interface EprsTarget {
  /** 館名（サイト表記。index.jsp の「どこで」の選択肢と一致させる） */
  facilityName: string;
  /** 施設名（サイト表記） */
  roomName: string;
  /** 館コード（例 "2010"） */
  bldCd: string;
  /** 施設コード（例 "20100100"） */
  instCd: string;
}

export interface EprsConfig {
  /** 末尾スラッシュ付きのベース URL（例 "https://www.cm9.eprs.jp/shinagawa/web/"） */
  baseUrl: string;
  divisionMap: Readonly<Record<string, Division>>;
  statusMap: Readonly<Record<string, Status>>;
  /** 取得開始日のオフセット（日）。scraper 側 `horizon.startOffsetDays` と揃える */
  startOffsetDays: number;
  /** セッション初期化の検索に使う利用目的（「何をする」の選択肢の表記） */
  searchPurpose: string;
  /** 受付期間外を表すステータス表記。全セルがこれになった週で打ち切る */
  outOfPeriodStatus: string;
  /** discover で検索する利用目的（音楽系の目的を並べる） */
  discoverPurposes: readonly string[];
}

/** 1 セル分（1 日 × 1 時間帯） */
export interface EprsCell {
  /** yyyyMMdd の数値 */
  useDay: number;
  /** ステータス表記（画像の alt。例「空き」「予約あり」） */
  alt: string;
}

/** 1 時間帯分の行 */
export interface EprsZone {
  /** 時間帯名（例「午前」） */
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

/**
 * 週の JSON 応答から時間帯の行を取り出す。
 * サーバがエラー（ErrManager）を返した場合や形式が変わった場合は投げる。
 */
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

/** yyyyMMdd の数値を ISO 日付にする */
export function dayNumberToIso(useDay: number): string {
  const text = String(useDay);
  if (!/^\d{8}$/.test(text)) {
    throw new Error(`eprs: useDay が yyyyMMdd ではありません: ${useDay}`);
  }
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

/** 週の全セルが受付期間外か（受付期間より先に出たことの判定） */
export function isOutOfPeriodWeek(zones: readonly EprsZone[], outOfPeriodStatus: string): boolean {
  const cells = zones.flatMap((zone) => zone.timeResult);
  return cells.length > 0 && cells.every((cell) => cell.alt === outOfPeriodStatus);
}

/**
 * 週の行を RawSlot に平坦化する。
 * 各週の先頭日が要求した開始日と食い違う場合は投げる
 * （セッションの表示位置がずれると、別の週のデータを保存してしまうため）。
 */
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
 * 検索を 1 回通してサーバ側セッションを初期化する（結果が「該当なし」でも初期化される）。
 * wholeMonth は「いつ」を 1 か月にする（既定は 1 週間で、空きのある部屋の絞り込みが狭い）。
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

/** select の選択肢を { value, name } で読む */
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

/** 空き状況画面の 館 × 施設 の選択肢を全て読む（discover 用） */
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

/**
 * 地区 × 利用目的で検索し、結果に現れた部屋を列挙する。
 * 検索結果は期間内（1 ヶ月）に空きがある部屋に絞られるため、満室の部屋は漏れうる。
 */
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
          // 検索に出た利用目的を並べる（音楽系の目的で出た会議室なども含むので、名称判定と併せて見る）
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
