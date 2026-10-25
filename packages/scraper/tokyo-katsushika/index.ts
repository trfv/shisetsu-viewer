import type { Page } from "@playwright/test";

import { toISODateString } from "../common/dateUtils.ts";
import { defineScraper } from "../common/defineScraper.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

// 「午後１+午後２」は午後を通しで借りるコマで、表の下段に colspan=2 で並ぶ
export const DIVISION_MAP: Record<string, Division> = {
  "": "RESERVATION_DIVISION_INVALID",
  午前: "RESERVATION_DIVISION_MORNING",
  午後１: "RESERVATION_DIVISION_AFTERNOON_ONE",
  午後２: "RESERVATION_DIVISION_AFTERNOON_TWO",
  "午後１+午後２": "RESERVATION_DIVISION_AFTERNOON",
  夜間: "RESERVATION_DIVISION_EVENING",
  "900-1000": "RESERVATION_DIVISION_DIVISION_1",
  "1000-1100": "RESERVATION_DIVISION_DIVISION_2",
  "1100-1200": "RESERVATION_DIVISION_DIVISION_3",
  "1200-1300": "RESERVATION_DIVISION_DIVISION_4",
  "1300-1400": "RESERVATION_DIVISION_DIVISION_5",
  "1400-1500": "RESERVATION_DIVISION_DIVISION_6",
  "1500-1600": "RESERVATION_DIVISION_DIVISION_7",
  "1600-1700": "RESERVATION_DIVISION_DIVISION_8",
  "1700-1800": "RESERVATION_DIVISION_DIVISION_9",
  "1800-1900": "RESERVATION_DIVISION_DIVISION_10",
  "1900-2000": "RESERVATION_DIVISION_DIVISION_11",
  "2000-2100": "RESERVATION_DIVISION_DIVISION_12",
};

// lw_210 は凡例に無いが lw_finishs（一般予約）と同じ画像。211〜214 は大会・行事・その他・地元開放の予約、
// 215〜232 は利用目的（バレーボール〜一般開放）付きの予約
export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  "image/lw_emptybs.gif": "RESERVATION_STATUS_VACANT",
  "image/lw_finishs.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_210.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_211.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_212.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_213.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_214.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_215.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_216.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_217.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_218.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_219.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_220.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_221.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_222.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_223.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_224.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_225.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_226.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_227.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_228.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_229.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_230.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_231.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_232.gif": "RESERVATION_STATUS_STATUS_1",
  "image/lw_900.gif": "RESERVATION_STATUS_STATUS_2",
  "image/lw_closes.gif": "RESERVATION_STATUS_STATUS_3",
  "image/lw_keeps.gif": "RESERVATION_STATUS_STATUS_4",
  "image/lw_akuten.gif": "RESERVATION_STATUS_STATUS_5",
  "image/lw_kikangais.gif": "RESERVATION_STATUS_STATUS_6",
  "image/lw_notime.gif": "RESERVATION_STATUS_STATUS_7",
};

const BASE_URL = "https://rsv.shisetsu.city.katsushika.lg.jp/katsushika/web/";
const OUT_OF_PERIOD_STATUS = "image/lw_kikangais.gif";
const BLOCKED_RESOURCE_TYPES = new Set(["image", "stylesheet", "font"]);

interface KatsushikaTarget {
  facilityName: string;
  roomNames: string[];
}

// 区の「楽器演奏等を目的とする利用が可能な地域コミュニティ施設」一覧の部屋
const targets: KatsushikaTarget[] = [
  { facilityName: "立石地区センター", roomNames: ["集会室（勤福）", "多目的室（勤福）"] },
  { facilityName: "東立石地区センター", roomNames: ["音楽室"] },
  { facilityName: "東四つ木地区センター", roomNames: ["音楽活動室"] },
  { facilityName: "四つ木地区センター", roomNames: ["活動室"] },
  { facilityName: "亀有地区センター", roomNames: ["音楽室"] },
  { facilityName: "青戸地区センター", roomNames: ["ホール", "音楽室"] },
  { facilityName: "新小岩北地区センター", roomNames: ["音楽室"] },
  { facilityName: "新小岩地区センター", roomNames: ["活動室"] },
  { facilityName: "高砂地区センター", roomNames: ["音楽室"] },
  { facilityName: "堀切地区センター", roomNames: ["音楽室"] },
  { facilityName: "南綾瀬地区センター", roomNames: ["音楽活動室"] },
  {
    facilityName: "にこわ新小岩・地域活動センター",
    roomNames: ["ホールスポーツ以外", "視聴覚室", "音楽室"],
  },
  { facilityName: "亀有学び交流館", roomNames: ["視聴覚室"] },
  { facilityName: "水元学び交流館", roomNames: ["視聴覚室"] },
  { facilityName: "柴又学び交流館", roomNames: ["視聴覚室Ａ", "視聴覚室Ｂ"] },
];

interface KatsushikaDay {
  date: string;
  cells: { room: string; division: string; status: string }[];
}

// 午前・夜間は rowspan=2、午後通しは下段で colspan=2 なので、行と列の占有を数えて見出しを引く。
// innerText はテスト実行時に空で返るので、見出しの「午前<br>900-1200」は <br> で割って 1 行目を取る
async function extractDay(page: Page): Promise<KatsushikaDay> {
  return page.locator("table.akitablelist").evaluate((table: HTMLTableElement) => {
    const occupied: boolean[][] = [];
    const header: string[] = [];
    const cells: { room: string; division: string; status: string }[] = [];
    let room = "";
    Array.from(table.rows).forEach((row, r) => {
      const taken = (occupied[r] ??= []);
      let c = 0;
      for (const cell of Array.from(row.cells)) {
        while (taken[c]) c++;
        for (let i = 0; i < cell.rowSpan; i++) {
          for (let j = 0; j < cell.colSpan; j++) (occupied[r + i] ??= [])[c + j] = true;
        }
        if (r === 0) {
          header[c] =
            c === 0
              ? (cell.textContent ?? "").replace(/\s+/g, "")
              : (cell.innerHTML.split(/<br\s*\/?>/i)[0] ?? "").replace(/<[^>]+>/g, "").trim();
        } else if (cell.tagName === "TH") {
          room = (cell.textContent ?? "").trim();
        } else {
          cells.push({
            room,
            division: header.slice(c, c + cell.colSpan).join("+"),
            status:
              cell.querySelector("img")?.getAttribute("src") ?? (cell.textContent ?? "").trim(),
          });
        }
        c += cell.colSpan;
      }
    });
    return { date: header[0] ?? "", cells };
  });
}

// 一定時間内のリクエスト数が閾値を超えると IP ごと数分間 403 になる。画面遷移のたびに画像と JS を
// 取り直すので、画像は捨て（状態は img の src 属性で読む）、JS は初回の本文を使い回す
async function reduceRequests(page: Page): Promise<void> {
  const scripts = new Map<string, { body: Buffer; headers: Record<string, string> }>();
  await page.route("**/*", async (route) => {
    const request = route.request();
    const type = request.resourceType();
    if (BLOCKED_RESOURCE_TYPES.has(type)) return route.abort();
    if (type !== "script") return route.continue();
    const cached = scripts.get(request.url());
    if (cached) return route.fulfill(cached);
    const response = await route.fetch();
    const entry = { body: await response.body(), headers: response.headers() };
    scripts.set(request.url(), entry);
    return route.fulfill(entry);
  });
}

// 日付はサーバ側のセッションが持ち、フォームで直接指定できないので「次の日」で 1 日ずつ送る
async function goNextDay(page: Page): Promise<void> {
  const before = await page.locator("table.akitablelist th").first().textContent();
  await page.getByRole("link", { name: "次の日" }).click();
  await page.waitForFunction(
    (previous) => document.querySelector("table.akitablelist th")?.textContent !== previous,
    before
  );
}

export const scraper = defineScraper({
  municipality: "tokyo-katsushika",
  targets,
  // 先は全コマ「受付期間外」が 1 年以上続くので、その日で打ち切る
  horizon: { startOffsetDays: 1, monthsAhead: 2, unit: "day" },
  facility: (t) => t.facilityName,
  context: (t) => ({ roomNames: t.roomNames }),

  async prepare(page, target) {
    await reduceRequests(page);
    await page.goto(new URL("index.jsp", BASE_URL).href);
    await page.getByRole("link", { name: "施設の空き状況" }).click();
    await page.getByRole("link", { name: "複合検索" }).click();
    await page.getByRole("link", { name: "館", exact: true }).click();
    await page.getByRole("link", { name: target.facilityName, exact: true }).click();
    await page.getByRole("link", { name: "検索を開始する" }).click();
    await page.locator("table.akitablelist").waitFor();
    // 検索結果は今日から始まる
    await goNextDay(page);
    return page;
  },

  async extract(page, target, pageCount) {
    return collectPaginated({
      maxPages: pageCount,
      label: target.facilityName,
      extractPage: async (pageIndex) => {
        const day = await extractDay(page);
        const cells = day.cells.filter((cell) => target.roomNames.includes(cell.room));
        const missing = target.roomNames.filter((name) => !cells.some((c) => c.room === name));
        if (missing.length > 0) {
          throw new Error(`${target.facilityName}: 部屋が見つかりません: ${missing.join(", ")}`);
        }
        if (pageIndex > 0 && cells.every((cell) => cell.status === OUT_OF_PERIOD_STATUS)) {
          return null;
        }
        return [{ date: day.date, cells }];
      },
      goNext: async () => {
        await goNextDay(page);
        return true;
      },
    });
  },

  transform(extracted) {
    const slots: RawSlot[] = extracted.flatMap(({ date, cells }) =>
      cells.map((cell) => ({
        roomName: cell.room,
        date: toISODateString(date),
        division: cell.division,
        status: cell.status,
      }))
    );
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
