import type { Page } from "@playwright/test";
import { format } from "date-fns";
import { defineScraper } from "../common/defineScraper.ts";
import { collectPaginated } from "../common/paginate.ts";
import { type RawSlot, rawSlotsToOutput } from "../common/reservation.ts";
import type { Division, Status } from "../common/types.ts";

export const DIVISION_MAP: Record<string, Division> = {
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

export const STATUS_MAP: Record<string, Status> = {
  "": "RESERVATION_STATUS_INVALID",
  circle: "RESERVATION_STATUS_VACANT",
  triangle: "RESERVATION_STATUS_STATUS_1",
  cross: "RESERVATION_STATUS_STATUS_2",
  asterisk: "RESERVATION_STATUS_STATUS_3",
  minus: "RESERVATION_STATUS_STATUS_4",
  施設保守: "RESERVATION_STATUS_STATUS_5",
  休館日: "RESERVATION_STATUS_STATUS_6",
  休館: "RESERVATION_STATUS_STATUS_6", // 本当は休館も取りたいが、disabledのセルになっているため取得が面倒です。
  工事: "RESERVATION_STATUS_STATUS_7",
};

const FACILITY_NAMES = [
  // "男女平等センター", // 改修工事休館中（〜令和8年6月）
  "大原地域活動センター",
  "駒込地域活動センター",
  "不忍通りふれあい館",
  "福祉センター江戸川橋",
  "勤労福祉会館",
  // "シビックホール大ホール", // 有効なデータが取得できないためテストから除外
  "シビックホール小ホール",
  "シビックホールその他施設",
  "アカデミー文京",
  "アカデミー湯島",
  "アカデミー音羽",
  "アカデミー茗台",
  "アカデミー向丘",
];

interface BunkyoTarget {
  facilityName: string;
}

type BunkyoSlot = { date: string; roomName: string; division: string; status: string };

const MAX_SELECTIONS = 10;

async function extractTimeSlots(page: Page): Promise<BunkyoSlot[]> {
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

      // First pass: detect division type from normal slots
      const divisionCount = slotLis.length;
      const orderedDivisions =
        divisionCount === 5
          ? ["１コマ", "２コマ", "３コマ", "４コマ", "５コマ"]
          : ["午前", "午後", "夜間"];

      // Second pass: extract data, inferring division from index if needed
      for (let i = 0; i < slotLis.length; i++) {
        const slotLi = slotLis[i]!;
        const spans = slotLi.querySelectorAll("span");
        let division = "";
        for (const span of spans) {
          const t = span.textContent?.trim() || "";
          if (/^(?:(午前|午後|夜間)|[１-５]コマ)$/.test(t)) {
            division = t;
            break;
          }
        }
        if (!division) division = orderedDivisions[i] || "";
        if (!division) continue;

        const svgs = slotLi.querySelectorAll("svg");
        const visibleSvg = Array.from(svgs).find(
          (s) => (s as unknown as HTMLElement).style.display !== "none"
        );
        const use = visibleSvg?.querySelector("use");
        const href = use?.getAttribute("xlink:href") || use?.getAttribute("href") || "";
        const lastSpanText = spans[spans.length - 1]?.textContent?.trim() || "";
        const status = href.split("#")[1] || lastSpanText;

        results.push({ date, roomName, division, status });
      }
    }
    return results;
  });
}

async function toggleCells(page: Page, startIndex: number, count: number): Promise<number> {
  const labels = page.locator("tbody td label:not(.disabled)");
  const total = await labels.count();
  let toggled = 0;
  for (let i = startIndex; i < total && toggled < count; i++) {
    await labels.nth(i).click({ timeout: 10000 });
    toggled++;
  }
  return toggled;
}

/** 1期間（週表示）分: セルをバッチ選択 → 時間帯別ページで抽出 → 戻る、を繰り返す */
async function extractWeek(page: Page, weekIndex: number): Promise<BunkyoSlot[]> {
  const output: BunkyoSlot[] = [];

  await page.locator("tbody tr td label").first().waitFor({
    state: "visible",
    timeout: 30000,
  });

  const totalCells = await page.locator("tbody td label:not(.disabled)").count();
  if (totalCells === 0) {
    // 選択可能なセルが無い期間はスキップして次へ
    return output;
  }

  for (let offset = 0; offset < totalCells; offset += MAX_SELECTIONS) {
    const batchSize = await toggleCells(page, offset, MAX_SELECTIONS);
    if (batchSize === 0) break;

    // バッチ単位の navigation 失敗が週ループ全体を巻き込まないよう、try で囲んで
    // バッチ間で復帰できるようにする。コンテンツ指標（heading）を待つ方が URL
    // パターンマッチより堅牢なため、waitForURL は使わない。
    try {
      await page.locator("button").filter({ hasText: "次へ進む" }).click();
      await page.getByRole("heading", { name: "時間帯別空き状況" }).waitFor({ timeout: 30000 });

      const slotData = await extractTimeSlots(page);
      output.push(...slotData);

      await page.locator("button").filter({ hasText: "前に戻る" }).click();
      await page.locator("tbody tr td label").first().waitFor({
        state: "visible",
        timeout: 30000,
      });
    } catch (batchErr) {
      console.warn(
        `Failed to extract batch ${offset / MAX_SELECTIONS + 1} at week ${weekIndex + 1}, skipping batch.`,
        batchErr
      );
      // SelectTime に居る可能性があるので、SelectDays に戻ることを試みる。
      try {
        await page.locator("button").filter({ hasText: "前に戻る" }).click({ timeout: 5000 });
        await page.locator("tbody tr td label").first().waitFor({
          state: "visible",
          timeout: 15000,
        });
      } catch {
        // 復帰失敗 → この週の残りはあきらめて次の期間へ進む。
        throw batchErr;
      }
    }

    // 次のバッチに備えて現在のバッチのチェックを外す（最終バッチはスキップ）
    if (offset + MAX_SELECTIONS < totalCells) {
      await toggleCells(page, offset, batchSize);
    }
  }

  return output;
}

export const scraper = defineScraper({
  municipality: "tokyo-bunkyo",
  targets: FACILITY_NAMES.map((facilityName): BunkyoTarget => ({ facilityName })),
  horizon: { startOffsetDays: 1, monthsAhead: 7, unit: "week" },
  facility: (t) => t.facilityName,

  async prepare(page, target) {
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

    const facilityLocator = page.getByText(target.facilityName, { exact: true });
    const loadMoreButton = page.getByRole("button", { name: "さらに読み込む" });
    while (!(await facilityLocator.isVisible())) {
      const rowsBefore = await page.locator("tbody tr").count();
      try {
        await loadMoreButton.click({ timeout: 10000 });
      } catch {
        throw new Error(`Facility "${target.facilityName}" not found after loading all items`);
      }
      await page
        .waitForFunction(
          (prev) => document.querySelectorAll("tbody tr").length > prev,
          rowsBefore,
          { timeout: 10000 }
        )
        .catch(() => {});
    }

    await page.getByText(target.facilityName, { exact: true }).click();
    await page.locator("button").filter({ hasText: "次へ進む" }).click();
    await page.locator("table").first().waitFor();

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    return page;
  },

  async extract(page, target, pageCount) {
    await page.locator("button").filter({ hasText: "その他の条件で絞り込む" }).click();
    await page.locator('input[type="date"]').fill(format(new Date(), "yyyy-MM-dd"));
    await page.locator("button").filter({ hasText: "その他の条件で絞り込む" }).click();
    await page.locator("button").filter({ hasText: "表示" }).click();

    return collectPaginated({
      maxPages: pageCount,
      label: target.facilityName,
      extractPage: async (weekIndex) => {
        // 週単位の失敗はこの週をあきらめて次の期間に進む（打ち切らない）
        try {
          return await extractWeek(page, weekIndex);
        } catch (e) {
          console.warn(`Failed to extract data at week ${weekIndex + 1}, skipping week.`, e);
          return [];
        }
      },
      goNext: async () => {
        const nextButton = page.locator("button").filter({ hasText: "次の期間" });
        if ((await nextButton.count()) === 0) return false;
        const prevTableContent = await page.locator("tbody").first().innerText();
        await nextButton.click();
        await page.waitForFunction(
          (prev) => {
            const tbody = document.querySelector("tbody");
            return tbody !== null && tbody.innerText !== prev;
          },
          prevTableContent,
          { timeout: 15000 }
        );
        await page.locator("tbody tr td label").first().waitFor({
          state: "visible",
          timeout: 15000,
        });
        return true;
      },
    });
  },

  transform(extracted) {
    const slots: RawSlot[] = extracted.map(({ date, roomName, division, status }) => ({
      roomName: roomName.replace(/\s*≪《[^》]*》≫$/, ""),
      date,
      division,
      status,
    }));
    return rawSlotsToOutput(slots, DIVISION_MAP, STATUS_MAP);
  },
});
